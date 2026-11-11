"""Repository for database connectivity and schema readiness diagnostics."""

import time

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

EXPECTED_FOUNDATION_TABLES = {
    "users",
    "assets",
    "security_events",
    "incidents",
    "incident_events",
    "response_playbooks",
    "audit_logs",
}


class HealthRepository:
    """Executes safe read-only database health probes."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def ping_database(self, *, include_schema_check: bool = True) -> tuple[bool, float | None, bool, int]:
        """Verify database reachability and optionally inspect foundational tables.

        Returns:
            (connected, latency_ms, migration_ready, registered_tables_count)
        """
        start = time.perf_counter()
        self.db.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start) * 1000.0, 2)

        if not include_schema_check:
            return True, latency_ms, True, len(EXPECTED_FOUNDATION_TABLES)

        inspector = inspect(self.db.bind)
        existing_tables = set(inspector.get_table_names())
        present_foundation = EXPECTED_FOUNDATION_TABLES.intersection(existing_tables)
        migration_ready = len(present_foundation) == len(EXPECTED_FOUNDATION_TABLES)
        return True, latency_ms, migration_ready, len(present_foundation)
