import os
from datetime import timedelta

from authx import AuthXConfig, AuthX
from dotenv import load_dotenv

load_dotenv()

config  = AuthXConfig(
    JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY"),
    JWT_ACCESS_COOKIE_NAME=os.getenv("JWT_ACCESS_COOKIE_NAME"),
    JWT_COOKIE_CSRF_PROTECT=False,
    JWT_TOKEN_LOCATION=["cookies"],
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(minutes=30),
)

security = AuthX(config=config)