import asyncio

from sqlalchemy import select

from backend.src.core.database import async_session
from backend.src.models.orm_models import AIModel
from backend.src.repository.base_repository import BaseRepository


class ModelRepository(BaseRepository[AIModel]):
    def __init__(self):
        super().__init__(AIModel)

    @staticmethod
    async def all_name_for_api() -> list[AIModel]:
        async with async_session() as session:
            query = (
                select(AIModel.name)
            )
            result = await session.execute(query)
            return result.scalars().all()

model_repository = ModelRepository()
print(asyncio.run(model_repository.all_name_for_api()))