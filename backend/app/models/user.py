"""User entity model."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.audit_log import AuditLog
    from app.models.incident import Incident
    from app.models.response_playbook import ResponsePlaybook


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Platform operator, SOC analyst, or security auditor account."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50),
        default=UserRole.SOC_ANALYST.value,
        index=True,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    owned_assets: Mapped[list["Asset"]] = relationship(
        "Asset", back_populates="owner"
    )
    assigned_incidents: Mapped[list["Incident"]] = relationship(
        "Incident", back_populates="assigned_to"
    )
    authored_playbooks: Mapped[list["ResponsePlaybook"]] = relationship(
        "ResponsePlaybook", back_populates="created_by"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog", back_populates="actor"
    )
