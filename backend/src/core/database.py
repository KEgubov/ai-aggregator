from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from backend.src.configs.db_url import db_settings

async_engine = create_async_engine(
    db_settings.DATABASE_URL,
    future=True,
    pool_size=10,  # базовый пул
    max_overflow=20,  # дополнительные соединения при пике
)

async_session = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
)
