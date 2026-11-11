"""Log Ingestion Engine for CSV and JSON security telemetry.

Provides:
- Strict schema validation & input sanitization (never executes log content).
- Deterministic SHA-256 duplicate detection across DB and within-batch rows.
- Row-by-row error reporting with summary counts (imported, duplicates, failed).
- Automatic evaluation via the Rule-Based Threat Detection & Risk Scoring Engines.
"""

import csv
from datetime import datetime, timezone
import hashlib
import io
import json
import re
from typing import Any
import uuid

from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.models.asset import Asset
from app.models.enums import SecurityEventStatus, SeverityLevel
from app.models.security_event import SecurityEvent
from app.services.detection_engine import evaluate_event_against_rules

VALID_SEVERITIES = {s.value for s in SeverityLevel}
CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitize_text(value: Any, *, max_length: int = 500) -> str:
    """Sanitize untrusted log strings without executing or interpreting content."""
    if value is None:
        return ""
    text = str(value).strip()
    text = CONTROL_CHARS_RE.sub("", text)
    # Neutralize spreadsheet formula prefixes if present
    if text.startswith(("=", "+", "@", "\t", "\r")):
        text = "'" + text
    return text[:max_length]


def parse_timestamp(value: Any) -> datetime:
    """Parse an ISO-8601 timestamp string into a UTC-aware datetime."""
    if isinstance(value, datetime):
        return (
            value
            if value.tzinfo is not None
            else value.replace(tzinfo=timezone.utc)
        )
    raw = str(value or "").strip()
    if not raw:
        raise ValueError("Missing occurred_at timestamp")
    normalized = raw.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def compute_event_fingerprint(
    *,
    event_type: str,
    source: str,
    source_ip: str | None,
    destination_ip: str | None,
    asset_id: uuid.UUID | None,
    title: str,
    occurred_at: datetime,
) -> str:
    """Compute a deterministic SHA-256 hex fingerprint for duplicate detection."""
    ts_iso = occurred_at.astimezone(timezone.utc).isoformat()
    canonical = "|".join(
        [
            event_type.strip().lower(),
            source.strip().lower(),
            (source_ip or "").strip().lower(),
            (destination_ip or "").strip().lower(),
            str(asset_id or ""),
            title.strip().lower(),
            ts_iso,
        ]
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def ingest_records(
    db: Session,
    records: list[dict[str, Any]],
    *,
    source_format: str = "json",
    default_is_synthetic: bool = True,
) -> dict[str, Any]:
    """Validate, deduplicate, sanitize, persist, and analyze a batch of log records."""
    assets_by_tag: dict[str, Asset] = {
        a.asset_tag.upper(): a for a in db.scalars(select(Asset)).all()
    }
    assets_by_id: dict[str, Asset] = {
        str(a.id): a for a in assets_by_tag.values()
    }

    existing_fps = set(
        db.scalars(
            select(SecurityEvent.event_fingerprint).where(
                SecurityEvent.event_fingerprint.is_not(None)
            )
        ).all()
    )
    seen_in_batch: set[str] = set()

    imported_events: list[SecurityEvent] = []
    errors: list[dict[str, Any]] = []
    duplicates_skipped = 0

    for idx, raw_row in enumerate(records, start=1):
        if not isinstance(raw_row, dict):
            errors.append(
                {
                    "row_number": idx,
                    "reason": "Row must be a JSON object / key-value mapping.",
                }
            )
            continue

        try:
            event_type = sanitize_text(
                raw_row.get("event_type"), max_length=100
            ).lower()
            if not event_type or not re.match(r"^[a-z0-9_\-\.]+$", event_type):
                raise ValueError(
                    "Invalid or missing 'event_type' (use alphanumeric/underscore identifier)."
                )

            source = sanitize_text(raw_row.get("source"), max_length=100)
            if not source:
                raise ValueError("Missing required field 'source'.")

            title = sanitize_text(raw_row.get("title"), max_length=255)
            if not title:
                raise ValueError("Missing required field 'title'.")

            severity = (
                sanitize_text(raw_row.get("severity") or "medium", max_length=32)
                .lower()
            )
            if severity not in VALID_SEVERITIES:
                raise ValueError(
                    f"Invalid severity '{severity}'. Allowed: {sorted(VALID_SEVERITIES)}"
                )

            occurred_at = parse_timestamp(
                raw_row.get("occurred_at") or raw_row.get("timestamp")
            )

            description = (
                sanitize_text(raw_row.get("description"), max_length=2000)
                if raw_row.get("description")
                else None
            )
            source_ip = (
                sanitize_text(raw_row.get("source_ip"), max_length=64)
                if raw_row.get("source_ip")
                else None
            )
            destination_ip = (
                sanitize_text(raw_row.get("destination_ip"), max_length=64)
                if raw_row.get("destination_ip")
                else None
            )
            mitre_tactic = (
                sanitize_text(raw_row.get("mitre_tactic"), max_length=100)
                if raw_row.get("mitre_tactic")
                else None
            )
            mitre_technique = (
                sanitize_text(raw_row.get("mitre_technique"), max_length=100)
                if raw_row.get("mitre_technique")
                else None
            )

            # Resolve optional asset_id or asset_tag
            resolved_asset_id: uuid.UUID | None = None
            raw_asset_id = raw_row.get("asset_id")
            raw_asset_tag = raw_row.get("asset_tag")
            if raw_asset_id:
                asset_obj = assets_by_id.get(str(raw_asset_id).strip())
                if asset_obj is None:
                    raise ValueError(f"Unknown asset_id '{raw_asset_id}'.")
                resolved_asset_id = asset_obj.id
            elif raw_asset_tag:
                tag_key = str(raw_asset_tag).strip().upper()
                asset_obj = assets_by_tag.get(tag_key)
                if asset_obj is None:
                    raise ValueError(f"Unknown asset_tag '{raw_asset_tag}'.")
                resolved_asset_id = asset_obj.id

            # Sanitize raw_payload / details
            details_obj = raw_row.get("raw_payload") or raw_row.get("details") or {}
            if isinstance(details_obj, str):
                try:
                    details_obj = json.loads(details_obj)
                except Exception:
                    details_obj = {"detail_text": sanitize_text(details_obj, max_length=1000)}
            if not isinstance(details_obj, dict):
                details_obj = {"value": str(details_obj)[:500]}

            # Merge helpful numeric metrics if supplied at top level of CSV
            for extra_key in (
                "failed_attempts",
                "requests_per_minute",
                "records_accessed",
                "bytes_out",
                "destination_port",
                "distinct_ports_probed",
                "target_privilege",
                "command",
                "post_bruteforce",
                "anomalous_geo",
                "off_hours",
            ):
                if extra_key in raw_row and raw_row[extra_key] not in (None, ""):
                    val = raw_row[extra_key]
                    if extra_key in {
                        "failed_attempts",
                        "requests_per_minute",
                        "records_accessed",
                        "bytes_out",
                        "destination_port",
                        "distinct_ports_probed",
                    }:
                        val = int(val)
                    elif extra_key in {"post_bruteforce", "anomalous_geo", "off_hours"}:
                        val = str(val).lower() in {"true", "1", "yes"}
                    else:
                        val = sanitize_text(val, max_length=255)
                    details_obj[extra_key] = val

            is_synthetic = bool(
                raw_row.get("is_synthetic", default_is_synthetic)
            )
            details_obj["synthetic_simulation"] = is_synthetic

            fp = compute_event_fingerprint(
                event_type=event_type,
                source=source,
                source_ip=source_ip,
                destination_ip=destination_ip,
                asset_id=resolved_asset_id,
                title=title,
                occurred_at=occurred_at,
            )

            if fp in existing_fps or fp in seen_in_batch:
                duplicates_skipped += 1
                errors.append(
                    {
                        "row_number": idx,
                        "reason": f"Duplicate event skipped (fingerprint {fp[:12]}... already exists).",
                    }
                )
                continue

            seen_in_batch.add(fp)

            ev = SecurityEvent(
                asset_id=resolved_asset_id,
                event_type=event_type,
                source=source,
                severity=severity,
                status=SecurityEventStatus.NEW.value,
                title=title,
                description=description,
                source_ip=source_ip,
                destination_ip=destination_ip,
                mitre_tactic=mitre_tactic,
                mitre_technique=mitre_technique,
                raw_payload=details_obj,
                event_fingerprint=fp,
                is_synthetic=is_synthetic,
                occurred_at=occurred_at,
            )
            db.add(ev)
            db.flush()
            imported_events.append(ev)

        except Exception as exc:
            errors.append(
                {
                    "row_number": idx,
                    "reason": str(exc),
                }
            )

    # Evaluate detection rules and risk scores on all newly imported events
    detections_triggered = 0
    for ev in imported_events:
        findings = evaluate_event_against_rules(db, ev)
        if findings:
            detections_triggered += 1

    db.commit()

    return {
        "source_format": source_format,
        "total_received": len(records),
        "imported_count": len(imported_events),
        "duplicates_skipped": duplicates_skipped,
        "failed_count": len(records) - len(imported_events) - duplicates_skipped,
        "detections_triggered": detections_triggered,
        "imported_event_ids": [str(e.id) for e in imported_events],
        "errors": errors,
    }


def parse_and_ingest_payload(
    db: Session,
    *,
    format_type: str,
    content: str,
    filename: str | None = None,
) -> dict[str, Any]:
    """Validate file size/type, parse CSV or JSON content, and ingest records."""
    settings = get_settings()
    raw_bytes = content.encode("utf-8", errors="replace")
    if len(raw_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise AppError(
            message=f"Upload payload exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES} bytes.",
            code="PAYLOAD_TOO_LARGE",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )

    fmt = (format_type or "").strip().lower()
    if filename:
        lower_name = filename.lower()
        if lower_name.endswith(".csv"):
            fmt = "csv"
        elif lower_name.endswith(".json"):
            fmt = "json"

    if fmt not in {"csv", "json"}:
        raise AppError(
            message="Unsupported log format. Only 'csv' and 'json' formats are permitted.",
            code="UNSUPPORTED_LOG_FORMAT",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if not content or not content.strip():
        raise AppError(
            message="Uploaded log content cannot be empty.",
            code="EMPTY_LOG_CONTENT",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    records: list[dict[str, Any]] = []
    if fmt == "json":
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            raise AppError(
                message=f"Malformed JSON file structure at line {exc.lineno}: {exc.msg}",
                code="INVALID_JSON_STRUCTURE",
                status_code=status.HTTP_400_BAD_REQUEST,
            ) from exc

        if isinstance(parsed, dict) and isinstance(parsed.get("events"), list):
            records = parsed["events"]
        elif isinstance(parsed, list):
            records = parsed
        else:
            raise AppError(
                message="JSON log payload must be an array of event objects or an object containing an 'events' array.",
                code="INVALID_JSON_SCHEMA",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
    else:
        reader = csv.DictReader(io.StringIO(content.strip()))
        if not reader.fieldnames:
            raise AppError(
                message="CSV payload is missing a header row.",
                code="INVALID_CSV_HEADER",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        required_cols = {"event_type", "source", "title"}
        present_cols = {
            (col or "").strip().lower() for col in reader.fieldnames
        }
        if not required_cols.issubset(present_cols):
            missing = sorted(required_cols - present_cols)
            raise AppError(
                message=f"CSV header is missing required column(s): {', '.join(missing)}.",
                code="INVALID_CSV_COLUMNS",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        for row in reader:
            cleaned_row = {
                (k or "").strip(): v for k, v in row.items() if k is not None
            }
            records.append(cleaned_row)

    if len(records) > 1000:
        raise AppError(
            message="Batch size exceeds maximum limit of 1000 records per import.",
            code="BATCH_LIMIT_EXCEEDED",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    return ingest_records(db, records, source_format=fmt, default_is_synthetic=True)
