"""Health check schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthCheckQuery(BaseModel):
    """Validated query parameters for the health check endpoint."""

    model_config = ConfigDict(extra="forbid")

    include_schema_check: bool = Field(
        default=True,
        description="Whether to verify foundational database tables exist.",
    )


class DatabaseStatus(BaseModel):
    """Database connectivity status without exposing credentials or connection strings."""

    connected: bool
    latency_ms: float | None = None
    migration_ready: bool = False
    registered_tables_count: int = 0
    status: Literal["healthy", "degraded", "unreachable"]


class HealthCheckResponse(BaseModel):
    """Response model for GET /api/v1/health."""

    status: Literal["healthy", "degraded"]
    service: str
    version: str
    environment: str
    timestamp: datetime
    database: DatabaseStatus
