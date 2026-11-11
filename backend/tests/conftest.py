"""Pytest fixtures for SATRIA SENTINEL backend tests."""

from collections.abc import Generator

from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Provide a FastAPI TestClient instance."""
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
