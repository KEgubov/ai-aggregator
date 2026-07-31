from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field, field_validator

class MessageAddDTO(BaseModel):
    """POST /message/send или POST /message — тело запроса."""
    chat_id: int
    content: str = Field(max_length=4096)
    # ветвление — только если пользователь ответил на абзац/фрагмент
    parent_id: Optional[int] = None
    context_anchor: Optional[str] = None
    context_text_snippet: Optional[str] = None

class MessageSendDTO(MessageAddDTO):
    """Запрос отправки сообщения; при model_id запускается генерация ответа AI."""

    model_id: Optional[int] = None

class MessageDTO(MessageAddDTO):
    """Сообщение чата с id, путём ветки и метаданными автора/модели."""

    content: str
    message_id: int
    path: Optional[str] = None  # для дерева веток
    author_id: Optional[int] = None  # NULL у assistant
    author_type: Literal["user", "assistant", "system"]
    ai_model: Optional[str] = None  # заполняется у ответов AI
    ai_provider: Optional[str] = None
    position: int = 0
    created_at: datetime
    updated_at: datetime

    @field_validator("path", mode="before")
    @classmethod
    def normalize_path(cls, value):
        """Приводит ltree/path к строке для сериализации."""
        return str(value) if value is not None else value
