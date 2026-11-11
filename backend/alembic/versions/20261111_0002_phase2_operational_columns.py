"""Phase 2 operational columns for detection, correlation, risk scoring, and incident timeline.

Revision ID: 20261111_0002
Revises: 20261111_0001
Create Date: 2026-11-11 20:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20261111_0002"
down_revision: Union[str, None] = "20261111_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # security_events operational extensions
    op.add_column(
        "security_events",
        sa.Column("event_fingerprint", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "security_events",
        sa.Column(
            "is_synthetic",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.add_column(
        "security_events",
        sa.Column(
            "detection_reasons",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "security_events",
        sa.Column("correlation_group_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "security_events",
        sa.Column(
            "risk_score",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "security_events",
        sa.Column(
            "risk_level",
            sa.String(length=32),
            server_default="low",
            nullable=False,
        ),
    )
    op.add_column(
        "security_events",
        sa.Column(
            "risk_breakdown",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.create_index(
        op.f("ix_security_events_event_fingerprint"),
        "security_events",
        ["event_fingerprint"],
        unique=True,
    )
    op.create_index(
        op.f("ix_security_events_correlation_group_id"),
        "security_events",
        ["correlation_group_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_security_events_risk_level"),
        "security_events",
        ["risk_level"],
        unique=False,
    )

    # incidents operational extensions
    op.add_column(
        "incidents",
        sa.Column(
            "risk_level",
            sa.String(length=32),
            server_default="medium",
            nullable=False,
        ),
    )
    op.add_column(
        "incidents",
        sa.Column(
            "risk_breakdown",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "incidents",
        sa.Column("correlation_explanation", sa.Text(), nullable=True),
    )
    op.add_column(
        "incidents",
        sa.Column(
            "timeline_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )
    op.create_index(
        op.f("ix_incidents_risk_level"),
        "incidents",
        ["risk_level"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_incidents_risk_level"), table_name="incidents")
    op.drop_column("incidents", "timeline_json")
    op.drop_column("incidents", "correlation_explanation")
    op.drop_column("incidents", "risk_breakdown")
    op.drop_column("incidents", "risk_level")

    op.drop_index(
        op.f("ix_security_events_risk_level"), table_name="security_events"
    )
    op.drop_index(
        op.f("ix_security_events_correlation_group_id"),
        table_name="security_events",
    )
    op.drop_index(
        op.f("ix_security_events_event_fingerprint"),
        table_name="security_events",
    )
    op.drop_column("security_events", "risk_breakdown")
    op.drop_column("security_events", "risk_level")
    op.drop_column("security_events", "risk_score")
    op.drop_column("security_events", "correlation_group_id")
    op.drop_column("security_events", "detection_reasons")
    op.drop_column("security_events", "is_synthetic")
    op.drop_column("security_events", "event_fingerprint")
