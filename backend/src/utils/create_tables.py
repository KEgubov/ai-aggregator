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

        # Каскадное удаление всех таблиц, определенных в Base.metadata
        # sorted_tables возвращает таблицы в порядке зависимости (родители перед детьми),
        # поэтому разворачиваем список, чтобы удалять от дочерних к родительским.
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(text(f"DROP TABLE IF EXISTS {table.fullname} CASCADE"))

        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(create_tables())
