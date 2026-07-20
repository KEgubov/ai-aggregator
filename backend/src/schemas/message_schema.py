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
    model_id: Optional[int] = None

class MessageDTO(MessageAddDTO):
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
        return str(value) if value is not None else value
