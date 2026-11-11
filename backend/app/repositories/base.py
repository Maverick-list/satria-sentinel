"""Generic base repository for SQLAlchemy 2.0 ORM operations."""

from typing import Generic, TypeVar
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Reusable data access foundation for domain repositories."""

    def __init__(self, db: Session, model: type[ModelType]) -> None:
        self.db = db
        self.model = model

    def get_by_id(self, entity_id: uuid.UUID) -> ModelType | None:
        return self.db.get(self.model, entity_id)

    def list_items(self, *, offset: int = 0, limit: int = 20) -> list[ModelType]:
        stmt = select(self.model).offset(offset).limit(limit)
        return list(self.db.scalars(stmt).all())
