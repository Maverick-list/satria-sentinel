"""Rule-Based Threat Detection Engine endpoints (/api/v1/detections)."""

from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import require_analyst_or_admin, require_viewer_or_above
from app.db.session import get_db
from app.models.security_event import SecurityEvent
from app.models.user import User
from app.schemas.operational import DetectionRunRequest
from app.services.audit_service import record_audit_log
from app.services.detection_engine import get_rules_catalog, run_detection_scan

router = APIRouter(prefix="/detections", tags=["Threat Detection Engine"])


@router.get("/rules")
def list_detection_rules(
    _current_user: User = Depends(require_viewer_or_above),
) -> dict[str, Any]:
    """Return the transparent rule-based detection catalog (no ML/AI black-box claims)."""
    rules = get_rules_catalog()
    return {
        "engine_type": "deterministic_rule_based",
        "rules_count": len(rules),
        "rules": rules,
    }


@router.get("/findings")
def list_detection_findings(
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """List security events that have matched one or more detection rules."""
    events = list(
        db.scalars(
            select(SecurityEvent).order_by(desc(SecurityEvent.occurred_at))
        ).all()
    )
    flagged = [ev for ev in events if ev.detection_reasons]
    return {
        "total_events_evaluated": len(events),
        "flagged_events_count": len(flagged),
        "findings": [
            {
                "event_id": str(ev.id),
                "title": ev.title,
                "event_type": ev.event_type,
                "severity": ev.severity,
                "source_ip": ev.source_ip,
                "asset_id": str(ev.asset_id) if ev.asset_id else None,
                "occurred_at": ev.occurred_at.isoformat(),
                "risk_score": ev.risk_score,
                "risk_level": ev.risk_level,
                "detection_reasons": ev.detection_reasons,
            }
            for ev in flagged
        ],
    }


@router.post("/run")
def execute_detection_scan(
    payload: DetectionRunRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Run all deterministic detection rules across stored security events."""
    result = run_detection_scan(db, event_ids=payload.event_ids)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="detections.scan_executed",
        entity_type="DetectionEngine",
        entity_id="rule_scan",
        details={
            "evaluated_events_count": result["evaluated_events_count"],
            "flagged_events_count": result["flagged_events_count"],
            "total_findings_count": result["total_findings_count"],
        },
        request=request,
    )
    return result
