from pydantic import BaseModel


class AIModelNameDTO(BaseModel):
    name: str

