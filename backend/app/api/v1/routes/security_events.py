"""Security Events listing, detail, and triage endpoints (/api/v1/security-events)."""

import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_analyst_or_admin, require_viewer_or_above
from app.core.exceptions import AppError
from app.db.session import get_db
from app.models.security_event import SecurityEvent
from app.models.user import User
from app.schemas.operational import (
    PaginatedSecurityEventsResponse,
    SecurityEventOut,
    SecurityEventStatusUpdateRequest,
)
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/security-events", tags=["Security Events"])


@router.get("", response_model=PaginatedSecurityEventsResponse)
def list_security_events(
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    event_type: str | None = Query(default=None),
    asset_id: uuid.UUID | None = Query(default=None),
    correlation_group_id: str | None = Query(default=None),
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> PaginatedSecurityEventsResponse:
    """List security events with filtering, search, and pagination."""
    stmt = select(SecurityEvent)
    count_stmt = select(func.count()).select_from(SecurityEvent)

    if search and search.strip():
        q = f"%{search.strip()}%"
        cond = or_(
            SecurityEvent.title.ilike(q),
            SecurityEvent.description.ilike(q),
            SecurityEvent.source_ip.ilike(q),
            SecurityEvent.destination_ip.ilike(q),
            SecurityEvent.event_type.ilike(q),
            SecurityEvent.mitre_technique.ilike(q),
        )
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    if severity:
        stmt = stmt.where(SecurityEvent.severity == severity.strip().lower())
        count_stmt = count_stmt.where(
            SecurityEvent.severity == severity.strip().lower()
        )
    if status_filter:
        stmt = stmt.where(
            SecurityEvent.status == status_filter.strip().lower()
        )
        count_stmt = count_stmt.where(
            SecurityEvent.status == status_filter.strip().lower()
        )
    if event_type:
        stmt = stmt.where(
            SecurityEvent.event_type == event_type.strip().lower()
        )
        count_stmt = count_stmt.where(
            SecurityEvent.event_type == event_type.strip().lower()
        )
    if asset_id:
        stmt = stmt.where(SecurityEvent.asset_id == asset_id)
        count_stmt = count_stmt.where(SecurityEvent.asset_id == asset_id)
    if correlation_group_id:
        stmt = stmt.where(
            SecurityEvent.correlation_group_id == correlation_group_id.strip()
        )
        count_stmt = count_stmt.where(
            SecurityEvent.correlation_group_id == correlation_group_id.strip()
        )

    total = int(db.scalar(count_stmt) or 0)
    offset = (page - 1) * page_size
    events = list(
        db.scalars(
            stmt.order_by(desc(SecurityEvent.occurred_at))
            .offset(offset)
            .limit(page_size)
        ).all()
    )
    return PaginatedSecurityEventsResponse(
        items=[SecurityEventOut.model_validate(e) for e in events],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{event_id}", response_model=SecurityEventOut)
def get_security_event(
    event_id: uuid.UUID,
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> SecurityEventOut:
    """Get full details, detection reasons, and risk breakdown of a SecurityEvent."""
    ev = db.get(SecurityEvent, event_id)
    if ev is None:
        raise AppError(
            message="Security event not found.",
            code="SECURITY_EVENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return SecurityEventOut.model_validate(ev)


@router.patch("/{event_id}/status", response_model=SecurityEventOut)
def update_security_event_status(
    event_id: uuid.UUID,
    payload: SecurityEventStatusUpdateRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> SecurityEventOut:
    """Update triage status of a security event (Analyst or Admin)."""
    ev = db.get(SecurityEvent, event_id)
    if ev is None:
        raise AppError(
            message="Security event not found.",
            code="SECURITY_EVENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    prev = ev.status
    ev.status = payload.status
    db.add(ev)
    db.commit()
    db.refresh(ev)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="security_event.status_updated",
        entity_type="SecurityEvent",
        entity_id=str(ev.id),
        details={"previous_status": prev, "new_status": ev.status},
        request=request,
    )
    return SecurityEventOut.model_validate(ev)
