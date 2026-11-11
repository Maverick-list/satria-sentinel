"""Defensive Response Playbooks endpoints (/api/v1/playbooks).

Playbooks provide advisory defensive checklists only and never execute automated external actions.
"""

from typing import Any
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_viewer_or_above
from app.core.exceptions import AppError
from app.db.session import get_db
from app.models.response_playbook import ResponsePlaybook
from app.models.user import User
from app.schemas.operational import PlaybookOut
from app.services.bootstrap_service import ensure_initial_seed_data

router = APIRouter(prefix="/playbooks", tags=["Response Playbooks"])


@router.get("", response_model=list[PlaybookOut])
def list_playbooks(
    category: str | None = Query(default=None),
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> list[PlaybookOut]:
    """List all active defensive response playbooks."""
    ensure_initial_seed_data(db)
    stmt = select(ResponsePlaybook).order_by(ResponsePlaybook.code.asc())
    if category:
        stmt = stmt.where(ResponsePlaybook.category == category.strip().lower())
    items = list(db.scalars(stmt).all())
    return [PlaybookOut.model_validate(pb) for pb in items]


@router.get("/recommend")
def recommend_playbook(
    incident_type: str = Query(
        default="account_compromise",
        description="Incident category or event_type to match against defensive playbooks",
    ),
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Recommend an advisory defensive response playbook based on incident/event type."""
    ensure_initial_seed_data(db)
    key = incident_type.strip().lower()
    mapping = {
        "account_compromise": "PB-IR-001",
        "suspicious_login": "PB-IR-001",
        "unusual_access_pattern": "PB-IR-001",
        "brute_force": "PB-IR-002",
        "auth_failure": "PB-IR-002",
        "suspicious_outbound": "PB-IR-003",
        "suspicious_outbound_traffic": "PB-IR-003",
        "data_exfiltration": "PB-IR-003",
        "privilege_escalation": "PB-IR-004",
        "sudo_abuse": "PB-IR-004",
        "port_scanning": "PB-IR-005",
        "port_scan_indicator": "PB-IR-005",
        "reconnaissance": "PB-IR-005",
    }
    target_code = mapping.get(key, "PB-IR-001")
    pb = db.scalar(
        select(ResponsePlaybook).where(ResponsePlaybook.code == target_code)
    )
    if pb is None:
        pb = db.scalar(select(ResponsePlaybook))

    return {
        "advisory_only": True,
        "execution_mode": "manual_human_verified",
        "requested_type": incident_type,
        "recommended_playbook": PlaybookOut.model_validate(pb) if pb else None,
    }


@router.get("/{playbook_id}", response_model=PlaybookOut)
def get_playbook(
    playbook_id: uuid.UUID,
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> PlaybookOut:
    """Get a single response playbook by UUID."""
    pb = db.get(ResponsePlaybook, playbook_id)
    if pb is None:
        raise AppError(
            message="Response playbook not found.",
            code="PLAYBOOK_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return PlaybookOut.model_validate(pb)
