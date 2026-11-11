"""SecurityEvent entity model."""

from datetime import datetime
from typing import TYPE_CHECKING, Any
import uuid

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import SecurityEventStatus, SeverityLevel

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.incident_event import IncidentEvent


class SecurityEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Telemetry, alert, or indicator of compromise recorded on the platform."""

    __tablename__ = "security_events"
    __table_args__ = (
        Index("ix_security_events_severity_occurred", "severity", "occurred_at"),
        Index("ix_security_events_asset_occurred", "asset_id", "occurred_at"),
    )

    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(100), index=True, nullable=False
    )
    source: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    severity: Mapped[str] = mapped_column(
        String(32),
        default=SeverityLevel.MEDIUM.value,
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default=SecurityEventStatus.NEW.value,
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_ip: Mapped[str | None] = mapped_column(
        String(64), index=True, nullable=True
    )
    destination_ip: Mapped[str | None] = mapped_column(
        String(64), index=True, nullable=True
    )
    mitre_tactic: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mitre_technique: Mapped[str | None] = mapped_column(
        String(100), index=True, nullable=True
    )
    raw_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )

    # Relationships
    asset: Mapped["Asset | None"] = relationship(
        "Asset", back_populates="security_events"
    )
    incident_links: Mapped[list["IncidentEvent"]] = relationship(
        "IncidentEvent",
        back_populates="security_event",
        cascade="all, delete-orphan",
    )
