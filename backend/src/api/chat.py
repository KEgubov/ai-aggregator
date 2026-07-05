from typing import Optional

from fastapi import APIRouter

router = APIRouter(prefix="/chats", tags=["chat"])

@router.post("/create")
async def create_chat(name: str, description: Optional[str] = None):
    pass