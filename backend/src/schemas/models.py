from pydantic import BaseModel, Field

class AIModelsDTO(BaseModel):
    """Краткое представление AI-модели для интерфейса."""

    model_id: int = Field(description="Model ID")
    display_name: str = Field(max_length=20, description="Name for interface")
