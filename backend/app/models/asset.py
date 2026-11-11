"""Digital Asset entity model."""

from typing import TYPE_CHECKING, Any
import uuid

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AssetCriticality, AssetStatus, AssetType

if TYPE_CHECKING:
    from app.models.security_event import SecurityEvent
    from app.models.user import User


class Asset(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Monitored infrastructure, host, container, or service asset."""

    __tablename__ = "assets"
    __table_args__ = (
        Index("ix_assets_crit_status", "criticality", "status"),
    )

    asset_tag: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    hostname: Mapped[str | None] = mapped_column(
        String(255), index=True, nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(64), index=True, nullable=True
    )
    asset_type: Mapped[str] = mapped_column(
        String(64),
        default=AssetType.SERVER.value,
        index=True,
        nullable=False,
    )
    environment: Mapped[str] = mapped_column(
        String(50),
        default="production",
        index=True,
        nullable=False,
    )
    criticality: Mapped[str] = mapped_column(
        String(32),
        default=AssetCriticality.MEDIUM.value,
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default=AssetStatus.ACTIVE.value,
        index=True,
        nullable=False,
    )
    operating_system: Mapped[str | None] = mapped_column(
        String(128), nullable=True
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False
    )

    # Relationships
    owner: Mapped["User | None"] = relationship(
        "User", back_populates="owned_assets"
    )
    security_events: Mapped[list["SecurityEvent"]] = relationship(
        "SecurityEvent", back_populates="asset"
    )
