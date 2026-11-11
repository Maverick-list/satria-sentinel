"""Incident Management & Investigation Timeline endpoints (/api/v1/incidents)."""

from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.api.deps import require_analyst_or_admin, require_viewer_or_above
from app.core.exceptions import AppError
from app.db.session import get_db
from app.models.asset import Asset
from app.models.enums import IncidentStatus, SecurityEventStatus
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.response_playbook import ResponsePlaybook
from app.models.security_event import SecurityEvent
from app.models.user import User
from app.schemas.operational import (
    IncidentAddNoteRequest,
    IncidentAssignRequest,
    IncidentCreateRequest,
    IncidentLinkEventsRequest,
    IncidentOut,
    IncidentResolveRequest,
    IncidentStatusChangeRequest,
    IncidentUpdateRequest,
    LinkedIncidentEventOut,
    PaginatedIncidentsResponse,
)
from app.services.audit_service import record_audit_log
from app.services.bootstrap_service import ensure_initial_seed_data
from app.services.risk_engine import calculate_risk_assessment

router = APIRouter(prefix="/incidents", tags=["Incident Management"])


def _append_timeline_entry(
    incident: Incident,
    *,
    entry_type: str,
    actor_username: str,
    title: str,
    notes: str | None = None,
) -> None:
    current = list(incident.timeline_json or [])
    current.append(
        {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "entry_type": entry_type,
            "actor_username": actor_username,
            "title": title,
            "notes": notes,
        }
    )
    incident.timeline_json = current


def _recalculate_incident_risk(db: Session, incident: Incident) -> None:
    links = list(
        db.scalars(
            select(IncidentEvent).where(
                IncidentEvent.incident_id == incident.id
            )
        ).all()
    )
    events: list[SecurityEvent] = []
    for link in links:
        ev = db.get(SecurityEvent, link.security_event_id)
        if ev is not None:
            events.append(ev)

    primary_asset: Asset | None = None
    all_reasons: list[dict[str, Any]] = []
    tactics: set[str] = set()
    for ev in events:
        if primary_asset is None and ev.asset_id:
            primary_asset = db.get(Asset, ev.asset_id)
        if ev.detection_reasons:
            all_reasons.extend(ev.detection_reasons)
        if ev.mitre_tactic:
            tactics.add(ev.mitre_tactic)

    if not all_reasons:
        all_reasons = [{"rule_id": "MANUAL-CASE", "confidence": 0.75}]

    assessment = calculate_risk_assessment(
        severity=incident.severity,
        asset=primary_asset,
        detection_reasons=all_reasons,
        correlated_events_count=max(1, len(events)),
        occurred_at=incident.detected_at,
        distinct_tactics_count=max(1, len(tactics)),
    )
    incident.risk_score = assessment["risk_score"]
    incident.risk_level = assessment["risk_level"]
    incident.risk_breakdown = assessment


def _serialize_incident(db: Session, incident: Incident) -> IncidentOut:
    links = list(
        db.scalars(
            select(IncidentEvent).where(
                IncidentEvent.incident_id == incident.id
            )
        ).all()
    )
    linked_out: list[LinkedIncidentEventOut] = []
    for link in links:
        ev = db.get(SecurityEvent, link.security_event_id)
        linked_out.append(
            LinkedIncidentEventOut(
                id=link.id,
                security_event_id=link.security_event_id,
                correlation_role=link.correlation_role,
                analyst_notes=link.analyst_notes,
                linked_at=link.linked_at,
                event_title=ev.title if ev else None,
                event_type=ev.event_type if ev else None,
                event_severity=ev.severity if ev else None,
                source_ip=ev.source_ip if ev else None,
            )
        )

    return IncidentOut(
        id=incident.id,
        incident_number=incident.incident_number,
        title=incident.title,
        summary=incident.summary,
        severity=incident.severity,
        status=incident.status,
        risk_score=incident.risk_score,
        risk_level=incident.risk_level,
        risk_breakdown=incident.risk_breakdown or {},
        correlation_explanation=incident.correlation_explanation,
        timeline_json=incident.timeline_json or [],
        assigned_to_id=incident.assigned_to_id,
        playbook_id=incident.playbook_id,
        detected_at=incident.detected_at,
        resolved_at=incident.resolved_at,
        root_cause_notes=incident.root_cause_notes,
        linked_events=linked_out,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
    )


@router.get("", response_model=PaginatedIncidentsResponse)
def list_incidents(
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    severity: str | None = Query(default=None),
    search: str | None = Query(default=None),
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> PaginatedIncidentsResponse:
    """List security incidents with filtering and pagination."""
    ensure_initial_seed_data(db)
    stmt = select(Incident)
    count_stmt = select(func.count()).select_from(Incident)

    if status_filter:
        stmt = stmt.where(Incident.status == status_filter.strip().lower())
        count_stmt = count_stmt.where(
            Incident.status == status_filter.strip().lower()
        )
    if severity:
        stmt = stmt.where(Incident.severity == severity.strip().lower())
        count_stmt = count_stmt.where(
            Incident.severity == severity.strip().lower()
        )
    if search and search.strip():
        q = f"%{search.strip()}%"
        cond = Incident.title.ilike(q) | Incident.incident_number.ilike(q)
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    total = int(db.scalar(count_stmt) or 0)
    offset = (page - 1) * page_size
    incidents = list(
        db.scalars(
            stmt.order_by(desc(Incident.detected_at))
            .offset(offset)
            .limit(page_size)
        ).all()
    )
    return PaginatedIncidentsResponse(
        items=[_serialize_incident(db, inc) for inc in incidents],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: uuid.UUID,
    _current_user: User = Depends(require_viewer_or_above),
    db: Session = Depends(get_db),
) -> IncidentOut:
    """Retrieve full incident details, linked events, risk breakdown, and timeline."""
    inc = db.get(Incident, incident_id)
    if inc is None:
        raise AppError(
            message="Incident not found.",
            code="INCIDENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_incident(db, inc)


@router.post("", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreateRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> IncidentOut:
    """Create a new security incident, optionally linking correlated security events."""
    ensure_initial_seed_data(db)
    count_existing = int(
        db.scalar(select(func.count()).select_from(Incident)) or 0
    )
    inc_num = f"INC-2026-{count_existing + 1:04d}-{uuid.uuid4().hex[:4].upper()}"

    # Auto-recommend a playbook if not explicitly provided
    playbook_id = payload.playbook_id
    if playbook_id is None:
        default_pb = db.scalar(
            select(ResponsePlaybook).where(ResponsePlaybook.code == "PB-IR-001")
        )
        if default_pb:
            playbook_id = default_pb.id

    inc = Incident(
        incident_number=inc_num,
        title=payload.title.strip(),
        summary=payload.summary.strip() if payload.summary else None,
        severity=payload.severity,
        status=IncidentStatus.OPEN.value,
        assigned_to_id=payload.assigned_to_id or current_user.id,
        playbook_id=playbook_id,
        correlation_explanation=payload.correlation_explanation,
        timeline_json=[],
    )
    _append_timeline_entry(
        inc,
        entry_type="incident_created",
        actor_username=current_user.username,
        title=f"Incident {inc_num} opened with severity '{payload.severity}'",
        notes=payload.summary,
    )
    db.add(inc)
    db.flush()

    for ev_id in payload.security_event_ids:
        ev = db.get(SecurityEvent, ev_id)
        if ev is not None:
            db.add(
                IncidentEvent(
                    incident_id=inc.id,
                    security_event_id=ev.id,
                    correlation_role="initial_indicator",
                    analyst_notes="Linked during incident creation",
                )
            )
            ev.status = SecurityEventStatus.LINKED.value
            db.add(ev)

    db.flush()
    _recalculate_incident_risk(db, inc)
    db.commit()
    db.refresh(inc)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="incident.created",
        entity_type="Incident",
        entity_id=str(inc.id),
        details={
            "incident_number": inc.incident_number,
            "severity": inc.severity,
            "risk_score": inc.risk_score,
            "linked_events_count": len(payload.security_event_ids),
        },
        request=request,
    )
    return _serialize_incident(db, inc)


@router.patch("/{incident_id}", response_model=IncidentOut)
def update_incident(
    incident_id: uuid.UUID,
    payload: IncidentUpdateRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> IncidentOut:
    """Update incident metadata, severity, or playbook assignment."""
    inc = db.get(Incident, incident_id)
    if inc is None:
        raise AppError(
            message="Incident not found.",
            code="INCIDENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    updates = payload.model_dump(exclude_unset=True)
    for field_name, val in updates.items():
        setattr(inc, field_name, val)

    _append_timeline_entry(
        inc,
        entry_type="incident_updated",
        actor_username=current_user.username,
        title="Incident details updated",
        notes=f"Updated fields: {', '.join(updates.keys())}",
    )
    _recalculate_incident_risk(db, inc)
    db.add(inc)
    db.commit()
    db.refresh(inc)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="incident.updated",
        entity_type="Incident",
        entity_id=str(inc.id),
        details={
            "incident_number": inc.incident_number,
            "updated_fields": list(updates.keys()),
        },
        request=request,
    )
    return _serialize_incident(db, inc)


@router.post("/{incident_id}/assign", response_model=IncidentOut)
def assign_incident(
    incident_id: uuid.UUID,
    payload: IncidentAssignRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> IncidentOut:
    """Assign an incident to a security analyst or admin."""
    inc = db.get(Incident, incident_id)
    if inc is None:
        raise AppError(
            message="Incident not found.",
            code="INCIDENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    assignee_name = "Unassigned"
    if payload.assigned_to_id is not None:
        assignee = db.get(User, payload.assigned_to_id)
        if assignee is None:
            raise AppError(
                message="Assigned user not found.",
                code="USER_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        assignee_name = assignee.username

    inc.assigned_to_id = payload.assigned_to_id
    _append_timeline_entry(
        inc,
        entry_type="analyst_assigned",
        actor_username=current_user.username,
        title=f"Incident assigned to '{assignee_name}'",
        notes=payload.notes,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="incident.assigned",
        entity_type="Incident",
        entity_id=str(inc.id),
        details={
            "incident_number": inc.incident_number,
            "assigned_to": assignee_name,
        },
        request=request,
    )
    return _serialize_incident(db, inc)


@router.post("/{incident_id}/status", response_model=IncidentOut)
def change_incident_status(
    incident_id: uuid.UUID,
    payload: IncidentStatusChangeRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> IncidentOut:
    """Transition an incident lifecycle status and record timeline + audit log."""
    inc = db.get(Incident, incident_id)
    if inc is None:
        raise AppError(
            message="Incident not found.",
            code="INCIDENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    prev_status = inc.status
    inc.status = payload.status
    if payload.status in {"recovered", "closed"} and inc.resolved_at is None:
        inc.resolved_at = datetime.now(timezone.utc)

    _append_timeline_entry(
        inc,
        entry_type="status_changed",
        actor_username=current_user.username,
        title=f"Status transitioned: {prev_status} -> {payload.status}",
        notes=payload.notes,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="incident.status_changed",
        entity_type="Incident",
        entity_id=str(inc.id),
        details={
            "incident_number": inc.incident_number,
            "previous_status": prev_status,
            "new_status": inc.status,
        },
        request=request,
    )
    return _serialize_incident(db, inc)


@router.post("/{incident_id}/link-events", response_model=IncidentOut)
def link_events_to_incident(
    incident_id: uuid.UUID,
    payload: IncidentLinkEventsRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> IncidentOut:
    """Link one or more SecurityEvents to an Incident and recalculate incident risk."""
    inc = db.get(Incident, incident_id)
    if inc is None:
        raise AppError(
            message="Incident not found.",
            code="INCIDENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    existing_event_ids = set(
        db.scalars(
            select(IncidentEvent.security_event_id).where(
                IncidentEvent.incident_id == inc.id
            )
        ).all()
    )

    newly_linked = 0
    for ev_id in payload.security_event_ids:
        if ev_id in existing_event_ids:
            continue
        ev = db.get(SecurityEvent, ev_id)
        if ev is None:
            raise AppError(
                message=f"SecurityEvent '{ev_id}' not found.",
                code="SECURITY_EVENT_NOT_FOUND",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        db.add(
            IncidentEvent(
                incident_id=inc.id,
                security_event_id=ev.id,
                correlation_role=payload.correlation_role,
                analyst_notes=payload.analyst_notes,
            )
        )
        ev.status = SecurityEventStatus.LINKED.value
        db.add(ev)
        existing_event_ids.add(ev_id)
        newly_linked += 1

    db.flush()
    _append_timeline_entry(
        inc,
        entry_type="events_linked",
        actor_username=current_user.username,
        title=f"Linked {newly_linked} security event(s) ({payload.correlation_role})",
        notes=payload.analyst_notes,
    )
    _recalculate_incident_risk(db, inc)
    db.add(inc)
    db.commit()
    db.refresh(inc)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="incident.events_linked",
        entity_type="Incident",
        entity_id=str(inc.id),
        details={
            "incident_number": inc.incident_number,
            "newly_linked_count": newly_linked,
            "new_risk_score": inc.risk_score,
        },
        request=request,
    )
    return _serialize_incident(db, inc)


@router.post("/{incident_id}/notes", response_model=IncidentOut)
def add_investigation_note(
    incident_id: uuid.UUID,
    payload: IncidentAddNoteRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> IncidentOut:
    """Append an analyst investigation note to the incident timeline."""
    inc = db.get(Incident, incident_id)
    if inc is None:
        raise AppError(
            message="Incident not found.",
            code="INCIDENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    _append_timeline_entry(
        inc,
        entry_type="investigation_note",
        actor_username=current_user.username,
        title="Investigation note added",
        notes=payload.note.strip(),
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="incident.note_added",
        entity_type="Incident",
        entity_id=str(inc.id),
        details={"incident_number": inc.incident_number},
        request=request,
    )
    return _serialize_incident(db, inc)


@router.post("/{incident_id}/resolve", response_model=IncidentOut)
def resolve_incident(
    incident_id: uuid.UUID,
    payload: IncidentResolveRequest,
    request: Request,
    current_user: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> IncidentOut:
    """Resolve an incident with documented root-cause notes."""
    inc = db.get(Incident, incident_id)
    if inc is None:
        raise AppError(
            message="Incident not found.",
            code="INCIDENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    prev_status = inc.status
    inc.status = payload.resolution_status
    inc.root_cause_notes = payload.root_cause_notes.strip()
    inc.resolved_at = datetime.now(timezone.utc)

    _append_timeline_entry(
        inc,
        entry_type="incident_resolved",
        actor_username=current_user.username,
        title=f"Incident resolved ({prev_status} -> {inc.status})",
        notes=inc.root_cause_notes,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)

    record_audit_log(
        db,
        actor_user_id=current_user.id,
        action="incident.resolved",
        entity_type="Incident",
        entity_id=str(inc.id),
        details={
            "incident_number": inc.incident_number,
            "previous_status": prev_status,
            "resolution_status": inc.status,
        },
        request=request,
    )
    return _serialize_incident(db, inc)
