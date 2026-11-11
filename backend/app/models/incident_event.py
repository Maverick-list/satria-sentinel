"""IncidentEvent association entity model."""

from datetime import datetime
from typing import TYPE_CHECKING
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.security_event import SecurityEvent


class IncidentEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Association table linking SecurityEvents to Incidents with analyst context."""

    __tablename__ = "incident_events"
    __table_args__ = (
        UniqueConstraint(
            "incident_id",
            "security_event_id",
            name="uq_incident_events_incident_security_event",
        ),
    )

    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    security_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("security_events.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    correlation_role: Mapped[str] = mapped_column(
        String(64), default="related_indicator", nullable=False
    )
    analyst_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    incident: Mapped["Incident"] = relationship(
        "Incident", back_populates="incident_events"
    )
    security_event: Mapped["SecurityEvent"] = relationship(
        "SecurityEvent", back_populates="incident_links"
    )
