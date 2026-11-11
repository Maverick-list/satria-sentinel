"""Data access repositories package."""

from app.repositories.base import BaseRepository
from app.repositories.health_repository import HealthRepository

__all__ = ["BaseRepository", "HealthRepository"]
