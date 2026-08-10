from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

class ChatDTO(BaseModel):
    """Личный чат с идентификатором и метаданными."""

    chat_id: int = Field(description="Chat ID")
    name: str = Field(max_length=255, description="Chat name")
    description: Optional[str] = Field(default=None, description="Chat description")
    ai_models: Optional[list[str]] = Field(description="AI models")
    created_at: datetime = Field(description="Created at")
    updated_at: datetime = Field(description="Updated at")
