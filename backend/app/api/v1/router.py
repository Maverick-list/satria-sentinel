"""Main API v1 router aggregator."""

from fastapi import APIRouter

from app.api.v1.routes.assets import router as assets_router
from app.api.v1.routes.audit_logs import router as audit_logs_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.correlations import router as correlations_router
from app.api.v1.routes.detections import router as detections_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.incidents import router as incidents_router
from app.api.v1.routes.log_ingestion import router as log_ingestion_router
from app.api.v1.routes.playbooks import router as playbooks_router
from app.api.v1.routes.risk_assessments import router as risk_assessments_router
from app.api.v1.routes.security_events import router as security_events_router
from app.api.v1.routes.users import router as users_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(assets_router)
api_v1_router.include_router(security_events_router)
api_v1_router.include_router(log_ingestion_router)
api_v1_router.include_router(detections_router)
api_v1_router.include_router(correlations_router)
api_v1_router.include_router(risk_assessments_router)
api_v1_router.include_router(incidents_router)
api_v1_router.include_router(playbooks_router)
api_v1_router.include_router(audit_logs_router)
