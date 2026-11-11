"""Event Correlation Engine endpoints (/api/v1/correlations)."""

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import require_analyst_or_admin, require_viewer_or_above
from app.db.session import get_db
from app.models.user import User
from app.schemas.operational import CorrelationRunRequest
from app.services.audit_service import record_audit_log
from app.services.correlation_engine import correlate_security_events

router = APIRouter(prefix="/correlations", tags=["Event Correlation Engine"])


@router.get("")
def get_correlations(
    window_minutes: int = Query(default=60, ge=5, le=1440),
    min_cluster_size: int = Query(default=2, ge=2, le=50),
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve correlated event clusters with full correlation explanation."""
    return correlate_security_events(
        db,
        window_minutes=window_minutes,
        min_cluster_size=min_cluster_size,
    )


@router.post("/run")
def run_correlations(
    payload: CorrelationRunRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Execute correlation analysis and record an audit trail entry."""
    result = correlate_security_events(
        db,
        window_minutes=payload.window_minutes,
        min_cluster_size=payload.min_cluster_size,
    )

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="correlations.executed",
        entity_type="CorrelationEngine",
        entity_id=f"window_{payload.window_minutes}m",
        details={
            "window_minutes": payload.window_minutes,
            "total_events_analyzed": result["total_events_analyzed"],
            "clusters_count": result["clusters_count"],
        },
        request=request,
    )
    return result
