"""Main API v1 router aggregator."""

from fastapi import APIRouter

from app.api.v1.routes.health import router as health_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
