"""Incident entity model."""

from datetime import datetime
from typing import TYPE_CHECKING, Any
import uuid

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import IncidentStatus, RiskLevel, SeverityLevel

if TYPE_CHECKING:
    from app.models.incident_event import IncidentEvent
    from app.models.response_playbook import ResponsePlaybook
    from app.models.user import User


class Incident(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Escalated security case correlating one or more security events."""

    __tablename__ = "incidents"
    __table_args__ = (
        Index("ix_incidents_status_severity", "status", "severity"),
    )

    incident_number: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(
        String(32),
        default=SeverityLevel.HIGH.value,
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default=IncidentStatus.OPEN.value,
        index=True,
        nullable=False,
    )
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_level: Mapped[str] = mapped_column(
        String(32),
        default=RiskLevel.MEDIUM.value,
        server_default="medium",
        index=True,
        nullable=False,
    )
    risk_breakdown: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False
    )
    correlation_explanation: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    timeline_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    playbook_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("response_playbooks.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    root_cause_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    assigned_to: Mapped["User | None"] = relationship(
        "User", back_populates="assigned_incidents"
    )
    playbook: Mapped["ResponsePlaybook | None"] = relationship(
        "ResponsePlaybook", back_populates="incidents"
    )
    incident_events: Mapped[list["IncidentEvent"]] = relationship(
        "IncidentEvent",
        back_populates="incident",
        cascade="all, delete-orphan",
    )
