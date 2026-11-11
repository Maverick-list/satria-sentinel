"""Health check endpoint (/api/v1/health)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.schemas.health import HealthCheckQuery, HealthCheckResponse
from app.services.health_service import HealthService

router = APIRouter(tags=["System Health"])


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="Platform & Database Health Check",
    description="Returns operational status of the SATRIA SENTINEL API and PostgreSQL database connectivity without exposing sensitive configuration.",
)
def get_health(
    response: Response,
    query: Annotated[HealthCheckQuery, Query()],
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> HealthCheckResponse:
    """Execute health check for API service and PostgreSQL database."""
    service = HealthService(db=db, settings=settings)
    result = service.check_health(
        include_schema_check=query.include_schema_check
    )
    if not result.database.connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return result
