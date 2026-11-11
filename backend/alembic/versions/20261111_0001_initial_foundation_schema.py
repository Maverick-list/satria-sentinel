"""Initial SATRIA SENTINEL foundation schema.

Creates tables:
- users
- assets
- security_events
- response_playbooks
- incidents
- incident_events
- audit_logs

Revision ID: 20261111_0001
Revises: None
Create Date: 2026-11-11 18:40:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261111_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.String(length=50),
            server_default="soc_analyst",
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(
        op.f("ix_users_username"), "users", ["username"], unique=True
    )
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    # 2. assets
    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_tag", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("hostname", sa.String(length=255), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column(
            "asset_type",
            sa.String(length=64),
            server_default="server",
            nullable=False,
        ),
        sa.Column(
            "environment",
            sa.String(length=50),
            server_default="production",
            nullable=False,
        ),
        sa.Column(
            "criticality",
            sa.String(length=32),
            server_default="medium",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="active",
            nullable=False,
        ),
        sa.Column("operating_system", sa.String(length=128), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "metadata_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("fk_assets_owner_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assets")),
    )
    op.create_index(
        op.f("ix_assets_asset_tag"), "assets", ["asset_tag"], unique=True
    )
    op.create_index(op.f("ix_assets_name"), "assets", ["name"], unique=False)
    op.create_index(
        op.f("ix_assets_hostname"), "assets", ["hostname"], unique=False
    )
    op.create_index(
        op.f("ix_assets_ip_address"), "assets", ["ip_address"], unique=False
    )
    op.create_index(
        op.f("ix_assets_asset_type"), "assets", ["asset_type"], unique=False
    )
    op.create_index(
        op.f("ix_assets_environment"), "assets", ["environment"], unique=False
    )
    op.create_index(
        op.f("ix_assets_criticality"), "assets", ["criticality"], unique=False
    )
    op.create_index(
        op.f("ix_assets_status"), "assets", ["status"], unique=False
    )
    op.create_index(
        op.f("ix_assets_owner_id"), "assets", ["owner_id"], unique=False
    )
    op.create_index(
        "ix_assets_crit_status",
        "assets",
        ["criticality", "status"],
        unique=False,
    )

    # 3. security_events
    op.create_table(
        "security_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("source", sa.String(length=100), nullable=False),
        sa.Column(
            "severity",
            sa.String(length=32),
            server_default="medium",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="new",
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_ip", sa.String(length=64), nullable=True),
        sa.Column("destination_ip", sa.String(length=64), nullable=True),
        sa.Column("mitre_tactic", sa.String(length=100), nullable=True),
        sa.Column("mitre_technique", sa.String(length=100), nullable=True),
        sa.Column(
            "raw_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["asset_id"],
            ["assets.id"],
            name=op.f("fk_security_events_asset_id_assets"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_security_events")),
    )
    op.create_index(
        op.f("ix_security_events_asset_id"),
        "security_events",
        ["asset_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_security_events_event_type"),
        "security_events",
        ["event_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_security_events_source"),
        "security_events",
        ["source"],
        unique=False,
    )
    op.create_index(
        op.f("ix_security_events_severity"),
        "security_events",
        ["severity"],
        unique=False,
    )
    op.create_index(
        op.f("ix_security_events_status"),
        "security_events",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_security_events_source_ip"),
        "security_events",
        ["source_ip"],
        unique=False,
    )
    op.create_index(
        op.f("ix_security_events_destination_ip"),
        "security_events",
        ["destination_ip"],
        unique=False,
    )
    op.create_index(
        op.f("ix_security_events_mitre_technique"),
        "security_events",
        ["mitre_technique"],
        unique=False,
    )
    op.create_index(
        op.f("ix_security_events_occurred_at"),
        "security_events",
        ["occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_security_events_severity_occurred",
        "security_events",
        ["severity", "occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_security_events_asset_occurred",
        "security_events",
        ["asset_id", "occurred_at"],
        unique=False,
    )

    # 4. response_playbooks
    op.create_table(
        "response_playbooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column(
            "target_severity",
            sa.String(length=32),
            server_default="high",
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "steps_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "version",
            sa.String(length=32),
            server_default="1.0.0",
            nullable=False,
        ),
        sa.Column(
            "created_by_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            name=op.f("fk_response_playbooks_created_by_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_response_playbooks")),
    )
    op.create_index(
        op.f("ix_response_playbooks_code"),
        "response_playbooks",
        ["code"],
        unique=True,
    )
    op.create_index(
        op.f("ix_response_playbooks_name"),
        "response_playbooks",
        ["name"],
        unique=False,
    )
    op.create_index(
        op.f("ix_response_playbooks_category"),
        "response_playbooks",
        ["category"],
        unique=False,
    )
    op.create_index(
        op.f("ix_response_playbooks_target_severity"),
        "response_playbooks",
        ["target_severity"],
        unique=False,
    )
    op.create_index(
        op.f("ix_response_playbooks_is_active"),
        "response_playbooks",
        ["is_active"],
        unique=False,
    )
    op.create_index(
        op.f("ix_response_playbooks_created_by_id"),
        "response_playbooks",
        ["created_by_id"],
        unique=False,
    )

    # 5. incidents
    op.create_table(
        "incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("incident_number", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "severity",
            sa.String(length=32),
            server_default="high",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default="open",
            nullable=False,
        ),
        sa.Column(
            "risk_score",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "assigned_to_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("playbook_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("root_cause_notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["assigned_to_id"],
            ["users.id"],
            name=op.f("fk_incidents_assigned_to_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["playbook_id"],
            ["response_playbooks.id"],
            name=op.f("fk_incidents_playbook_id_response_playbooks"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_incidents")),
    )
    op.create_index(
        op.f("ix_incidents_incident_number"),
        "incidents",
        ["incident_number"],
        unique=True,
    )
    op.create_index(
        op.f("ix_incidents_title"), "incidents", ["title"], unique=False
    )
    op.create_index(
        op.f("ix_incidents_severity"), "incidents", ["severity"], unique=False
    )
    op.create_index(
        op.f("ix_incidents_status"), "incidents", ["status"], unique=False
    )
    op.create_index(
        op.f("ix_incidents_assigned_to_id"),
        "incidents",
        ["assigned_to_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_incidents_playbook_id"),
        "incidents",
        ["playbook_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_incidents_detected_at"),
        "incidents",
        ["detected_at"],
        unique=False,
    )
    op.create_index(
        "ix_incidents_status_severity",
        "incidents",
        ["status", "severity"],
        unique=False,
    )

    # 6. incident_events
    op.create_table(
        "incident_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "security_event_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column(
            "correlation_role",
            sa.String(length=64),
            server_default="related_indicator",
            nullable=False,
        ),
        sa.Column("analyst_notes", sa.Text(), nullable=True),
        sa.Column(
            "linked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["incident_id"],
            ["incidents.id"],
            name=op.f("fk_incident_events_incident_id_incidents"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["security_event_id"],
            ["security_events.id"],
            name=op.f("fk_incident_events_security_event_id_security_events"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_incident_events")),
        sa.UniqueConstraint(
            "incident_id",
            "security_event_id",
            name="uq_incident_events_incident_security_event",
        ),
    )
    op.create_index(
        op.f("ix_incident_events_incident_id"),
        "incident_events",
        ["incident_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_incident_events_security_event_id"),
        "incident_events",
        ["security_event_id"],
        unique=False,
    )

    # 7. audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "actor_user_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column(
            "details_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            name=op.f("fk_audit_logs_actor_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_logs")),
    )
    op.create_index(
        op.f("ix_audit_logs_actor_user_id"),
        "audit_logs",
        ["actor_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False
    )
    op.create_index(
        op.f("ix_audit_logs_entity_type"),
        "audit_logs",
        ["entity_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_audit_logs_entity_id"),
        "audit_logs",
        ["entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_audit_logs_entity",
        "audit_logs",
        ["entity_type", "entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_audit_logs_action_created",
        "audit_logs",
        ["action", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("incident_events")
    op.drop_table("incidents")
    op.drop_table("response_playbooks")
    op.drop_table("security_events")
    op.drop_table("assets")
    op.drop_table("users")
