"""Audit logging service for recording security and operational actions."""

from typing import Any
import uuid

from fastapi import Request
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record_audit_log(
    db: Session,
    *,
    actor_user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    details: dict[str, Any] | None = None,
    request: Request | None = None,
    commit: bool = True,
) -> AuditLog:
    """Create an AuditLog entry with sanitized details."""
    ip_address: str | None = None
    user_agent: str | None = None
    if request is not None:
        if request.client and request.client.host:
            ip_address = request.client.host[:64]
        ua = request.headers.get("user-agent")
        if ua:
            user_agent = ua[:255]

    safe_details = dict(details or {})
    # Never allow sensitive keys in audit details
    for forbidden_key in ("password", "password_hash", "token", "access_token", "secret"):
        safe_details.pop(forbidden_key, None)

    entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        ip_address=ip_address,
        user_agent=user_agent,
        details_json=safe_details,
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    return entry


class AuditLogService:
    """Query service for AuditLogs with pagination and filtering."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def list_audit_logs(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        action: str | None = None,
        entity_type: str | None = None,
        actor_user_id: uuid.UUID | None = None,
    ) -> tuple[list[AuditLog], int]:
        stmt = select(AuditLog)
        count_stmt = select(func.count()).select_from(AuditLog)

        if action:
            stmt = stmt.where(AuditLog.action.ilike(f"%{action.strip()}%"))
            count_stmt = count_stmt.where(
                AuditLog.action.ilike(f"%{action.strip()}%")
            )
        if entity_type:
            stmt = stmt.where(AuditLog.entity_type == entity_type.strip())
            count_stmt = count_stmt.where(
                AuditLog.entity_type == entity_type.strip()
            )
        if actor_user_id:
            stmt = stmt.where(AuditLog.actor_user_id == actor_user_id)
            count_stmt = count_stmt.where(
                AuditLog.actor_user_id == actor_user_id
            )

        total = int(self.db.scalar(count_stmt) or 0)
        offset = (page - 1) * page_size
        items = list(
            self.db.scalars(
                stmt.order_by(desc(AuditLog.created_at))
                .offset(offset)
                .limit(page_size)
            ).all()
        )
        return items, total
