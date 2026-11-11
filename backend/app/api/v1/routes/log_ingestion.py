"""Log Ingestion (CSV/JSON) and Synthetic Telemetry Generator endpoints (/api/v1/log-ingestion)."""

from typing import Any

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import require_analyst_or_admin, require_viewer_or_above
from app.core.exceptions import AppError
from app.db.session import get_db
from app.models.user import User
from app.schemas.operational import (
    LogImportPayloadRequest,
    SyntheticGenerateRequest,
)
from app.services.audit_service import record_audit_log
from app.services.ingestion_service import parse_and_ingest_payload
from app.services.synthetic_generator import (
    SYNTHETIC_SCENARIOS_CATALOG,
    generate_synthetic_telemetry,
)

router = APIRouter(prefix="/log-ingestion", tags=["Log Ingestion & Synthetic Generator"])


@router.get("/scenarios")
def list_synthetic_scenarios(
    _current_user: User = Depends(require_viewer_or_above),
) -> dict[str, Any]:
    """List available synthetic security telemetry scenarios."""
    return {
        "synthetic_marker": "[SYNTHETIC SIMULATION]",
        "scenarios": SYNTHETIC_SCENARIOS_CATALOG,
    }


@router.post("/generate-synthetic", status_code=status.HTTP_201_CREATED)
def trigger_synthetic_generation(
    payload: SyntheticGenerateRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Generate clearly labeled synthetic security logs for simulation scenarios."""
    try:
        result = generate_synthetic_telemetry(
            db,
            scenario=payload.scenario,
            auto_correlate=payload.auto_correlate,
        )
    except ValueError as exc:
        raise AppError(
            message=str(exc),
            code="INVALID_SYNTHETIC_SCENARIO",
            status_code=status.HTTP_400_BAD_REQUEST,
        ) from exc

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="log_ingestion.synthetic_generated",
        entity_type="SecurityEventBatch",
        entity_id=result["simulation_run_tag"],
        details={
            "scenario": payload.scenario,
            "imported_count": result["ingestion_summary"]["imported_count"],
            "detections_triggered": result["ingestion_summary"]["detections_triggered"],
            "clusters_count": result["correlation_summary"]["clusters_count"],
        },
        request=request,
    )
    return result


@router.post("/import", status_code=status.HTTP_201_CREATED)
def import_security_logs(
    payload: LogImportPayloadRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Import, validate, sanitize, deduplicate, and evaluate CSV or JSON security logs."""
    result = parse_and_ingest_payload(
        db,
        format_type=payload.format,
        content=payload.content,
        filename=payload.filename,
    )

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="log_ingestion.imported",
        entity_type="SecurityEventBatch",
        entity_id=payload.filename or payload.format,
        details={
            "format": result["source_format"],
            "total_received": result["total_received"],
            "imported_count": result["imported_count"],
            "duplicates_skipped": result["duplicates_skipped"],
            "failed_count": result["failed_count"],
            "detections_triggered": result["detections_triggered"],
        },
        request=request,
    )
    return result
