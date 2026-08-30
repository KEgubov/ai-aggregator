import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from backend.src.api.dependency import (
    get_ai_orchestrator,
    get_current_user,
    get_model_service,
    get_message_service,
    get_session,
)
from backend.src.schemas.custom import CurrentUserDTO
from backend.src.schemas.message_schema import MessageSendDTO
from backend.src.service.message_service import MessageService
from backend.src.service.model_orchestrator import AIOrchestrator
from backend.src.service.model_service import ModelService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["Message"])


@router.post("/send", response_model=None)
async def stream_message(
    payload: MessageSendDTO,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
    model_service: ModelService = Depends(get_model_service),
    message_service: MessageService = Depends(get_message_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse | dict:
    """Сохраняет сообщение пользователя и при наличии model_id стримит ответ AI."""
    saved_user = await message_service.validate_save_message(
        session, payload, current_user.user_id
    )
    if not saved_user:
        raise HTTPException(
            status_code=400,
            detail="Failed to save message: invalid or missing parent_id",
        )
    if not payload.model_id:
        return {"status": "ok", "message": saved_user.model_dump(mode="json")}
    await model_service.link_model(
        session, payload.chat_id, payload.model_id, current_user.user_id
    )
    return StreamingResponse(
        orchestrator.orchestrate_generation(
            session=session,
            model_id=payload.model_id,
            chat_id=payload.chat_id,
            parent_id=saved_user.message_id,
        ),
        media_type="text/plain; charset=utf-8",
    )


@router.get("/")
async def get_messages(
    chat_id: int,
    message_service: MessageService = Depends(get_message_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Возвращает все сообщения указанного чата."""
    all_message = await message_service.validate_all_messages(session, chat_id)
    return {"status": "ok", "messages": all_message.messages}
