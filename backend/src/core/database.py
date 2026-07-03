from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from backend.src.configs.db_url import db_settings

async_engine = create_async_engine(
    db_settings.DATABASE_URL,
    future=True,
    echo=True,
)

async_session = async_sessionmaker(bind=async_engine)
