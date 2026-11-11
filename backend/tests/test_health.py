"""Unit and integration tests for SATRIA SENTINEL Phase 1 Backend Foundation."""

from fastapi.testclient import TestClient

from app.db.base import Base
import app.models  # noqa: F401
from app.repositories.health_repository import EXPECTED_FOUNDATION_TABLES


def test_health_endpoint_returns_valid_schema_and_no_sensitive_data(
    client: TestClient,
) -> None:
    """Verify GET /api/v1/health returns structured status without leaking credentials."""
    response = client.get("/api/v1/health")
    assert response.status_code in (200, 503)

    body = response.json()
    assert body["service"] == "SATRIA SENTINEL"
    assert body["version"] == "0.1.0"
    assert body["status"] in ("healthy", "degraded")
    assert "database" in body
    assert isinstance(body["database"]["connected"], bool)
    assert body["database"]["status"] in ("healthy", "degraded", "unreachable")

    # Ensure no sensitive credentials or connection strings are leaked
    serialized = response.text.lower()
    assert "postgresql+psycopg" not in serialized
    assert "password" not in serialized
    assert "database_url" not in serialized

    # Verify security headers
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert "X-Request-ID" in response.headers


def test_health_query_input_validation_rejects_invalid_boolean(
    client: TestClient,
) -> None:
    """Verify invalid query parameters trigger centralized 422 VALIDATION_ERROR response."""
    response = client.get("/api/v1/health?include_schema_check=not_a_boolean")
    assert response.status_code == 422
    payload = response.json()
    assert "error" in payload
    assert payload["error"]["code"] == "VALIDATION_ERROR"
    assert "request_id" in payload["error"]
    assert isinstance(payload["error"]["details"], list)


def test_not_found_returns_centralized_error_envelope(
    client: TestClient,
) -> None:
    """Verify unknown routes return structured error envelope without stack trace."""
    response = client.get("/api/v1/non-existent-route")
    assert response.status_code == 404
    payload = response.json()
    assert "error" in payload
    assert payload["error"]["code"] == "HTTP_404"
    assert "traceback" not in response.text.lower()


def test_sqlalchemy_foundation_models_registered_with_relations() -> None:
    """Verify all 7 Phase 1 foundational entities and foreign keys are registered."""
    registered_tables = set(Base.metadata.tables.keys())
    assert EXPECTED_FOUNDATION_TABLES.issubset(registered_tables)

    # Check key foreign keys exist
    assets_fks = {
        fk.target_fullname for fk in Base.metadata.tables["assets"].foreign_keys
    }
    assert "users.id" in assets_fks

    events_fks = {
        fk.target_fullname
        for fk in Base.metadata.tables["security_events"].foreign_keys
    }
    assert "assets.id" in events_fks

    incidents_fks = {
        fk.target_fullname
        for fk in Base.metadata.tables["incidents"].foreign_keys
    }
    assert "users.id" in incidents_fks
    assert "response_playbooks.id" in incidents_fks

    incident_events_fks = {
        fk.target_fullname
        for fk in Base.metadata.tables["incident_events"].foreign_keys
    }
    assert "incidents.id" in incident_events_fks
    assert "security_events.id" in incident_events_fks
