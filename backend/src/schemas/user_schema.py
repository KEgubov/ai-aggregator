from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserAddDTO(BaseModel):
    """Данные для регистрации пользователя."""

    email: EmailStr = Field(max_length=255, description="Email")
    password: str = Field(min_length=8, max_length=100, description="Пароль")
    about_me: str = Field(max_length=20, description="Краткое описание профиля")


class UserDTO(BaseModel):
    """Пользователь после создания/чтения из БД."""

    user_id: int = Field(description="ID пользователя")
    email: EmailStr = Field(max_length=255, description="Email")
    username: str = Field(description="Имя пользователя")
    about_me: str = Field(max_length=20, description="Краткое описание профиля")
    created_at: Optional[datetime] = Field(description="Дата создания")
    last_seen_at: Optional[datetime] = Field(description="Последняя активность")
