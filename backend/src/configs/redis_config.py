from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class RedisSettings(BaseSettings):
    """Настройка Redis"""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        extra="ignore"
    )

    REDIS_URL: str

    @property
    def url(self) -> str:
        return self.REDIS_URL

redis_settings = RedisSettings()

