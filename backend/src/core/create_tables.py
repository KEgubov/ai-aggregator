import asyncio

from sqlalchemy import text

from backend.src.core.database import async_engine
from backend.src.models.orm_models import Base


async def create_tables() -> None:
    """
    Функция создаёт таблицы в базе данных.
    Если необходимо пересоздать текущие таблицы,
    то можно сначала использовать drop all
    :return: None
    """
    async with async_engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS ltree"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(create_tables())