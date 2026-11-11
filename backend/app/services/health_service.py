"""Health check application service."""

from datetime import datetime, timezone
import logging

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.repositories.health_repository import EXPECTED_FOUNDATION_TABLES, HealthRepository
from app.schemas.health import DatabaseStatus, HealthCheckResponse

logger = logging.getLogger("satria.health")


class HealthService:
    """Orchestrates application and database health status checks."""

    def __init__(self, db: Session, settings: Settings) -> None:
        self.repository = HealthRepository(db)
        self.settings = settings

    def check_health(self, *, include_schema_check: bool = True) -> HealthCheckResponse:
        """Evaluate application and database status without leaking sensitive details."""
        try:
            connected, latency_ms, migration_ready, tables_count = (
                self.repository.ping_database(
                    include_schema_check=include_schema_check
                )
            )
            db_state = "healthy" if (connected and migration_ready) else "degraded"
            db_status = DatabaseStatus(
                connected=connected,
                latency_ms=latency_ms,
                migration_ready=migration_ready,
                registered_tables_count=tables_count,
                status=db_state,
            )
        except SQLAlchemyError as exc:
            logger.warning("Database health check failed: %s", exc.__class__.__name__)
            db_status = DatabaseStatus(
                connected=False,
                latency_ms=None,
                migration_ready=False,
                registered_tables_count=0,
                status="unreachable",
            )
        except Exception as exc:
            logger.error("Unexpected error during database health check: %s", exc.__class__.__name__)
            db_status = DatabaseStatus(
                connected=False,
                latency_ms=None,
                migration_ready=False,
                registered_tables_count=0,
                status="unreachable",
            )

        overall_status = (
            "healthy" if db_status.connected else "degraded"
        )

        return HealthCheckResponse(
            status=overall_status,
            service=self.settings.PROJECT_NAME,
            version=self.settings.APP_VERSION,
            environment=self.settings.ENVIRONMENT,
            timestamp=datetime.now(timezone.utc),
            database=db_status,
        )
