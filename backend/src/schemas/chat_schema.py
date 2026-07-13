from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ChatAddDTO(BaseModel):
    name: str = Field(max_length=255, description="Chat name")
    description: Optional[str] = Field(description="Chat description")

class ChatDTO(ChatAddDTO):
    chat_id: int = Field(description="Chat ID")
    ai_models: Optional[list[str]] = Field(description="AI models")
    created_at: datetime = Field(description="Created at")
    updated_at: datetime = Field(description="Updated at")