"""Audit Logs query endpoints (/api/v1/audit-logs)."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_viewer_or_above
from app.db.session import get_db
from app.models.user import User
from app.schemas.operational import AuditLogOut, PaginatedAuditLogsResponse
from app.services.audit_service import AuditLogService

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=PaginatedAuditLogsResponse)
def list_audit_logs(
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=20, ge=1, le=100),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    actor_user_id: uuid.UUID | None = Query(default=None),
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> PaginatedAuditLogsResponse:
    """List operational and security audit trail entries with filtering and pagination."""
    service = AuditLogService(db)
    items, total = service.list_audit_logs(
        page=page,
        page_size=page_size,
        action=action,
        entity_type=entity_type,
        actor_user_id=actor_user_id,
    )
    return PaginatedAuditLogsResponse(
        items=[AuditLogOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )
