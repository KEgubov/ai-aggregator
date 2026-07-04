from typing import TypeVar, Type, Generic

from backend.src.core.database import async_session

ModelType = TypeVar("ModelType")

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get_by_id(self, obj_id: int) -> ModelType:
        async with async_session() as session:
            model = await session.get(self.model, obj_id)
            return model