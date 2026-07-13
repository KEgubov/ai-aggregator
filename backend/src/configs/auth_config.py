from datetime import timedelta

from authx import AuthXConfig
from pydantic_settings import BaseSettings, SettingsConfigDict

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


class AuthXSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    JWT_SECRET_KEY: str
    JWT_ACCESS_COOKIE_NAME: str

    @property
    def config(self) -> AuthXConfig:
        return AuthXConfig(
            JWT_SECRET_KEY=self.JWT_SECRET_KEY,
            JWT_ACCESS_COOKIE_NAME=self.JWT_ACCESS_COOKIE_NAME,
            JWT_COOKIE_CSRF_PROTECT=False,
            JWT_TOKEN_LOCATION=["cookies"],
            JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=24),
        )


authx_settings = AuthXSettings()
