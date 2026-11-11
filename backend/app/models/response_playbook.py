"""ResponsePlaybook entity model."""

from typing import TYPE_CHECKING, Any
import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import SeverityLevel

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.user import User


class ResponsePlaybook(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Standardized incident response workflow and remediation checklist."""

    __tablename__ = "response_playbooks"

    code: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    category: Mapped[str] = mapped_column(
        String(100), index=True, nullable=False
    )
    target_severity: Mapped[str] = mapped_column(
        String(32),
        default=SeverityLevel.HIGH.value,
        index=True,
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    steps_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, index=True, nullable=False
    )
    version: Mapped[str] = mapped_column(
        String(32), default="1.0.0", nullable=False
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    # Relationships
    created_by: Mapped["User | None"] = relationship(
        "User", back_populates="authored_playbooks"
    )
    incidents: Mapped[list["Incident"]] = relationship(
        "Incident", back_populates="playbook"
    )
