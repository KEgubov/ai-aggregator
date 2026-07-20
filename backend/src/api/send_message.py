import logging

from fastapi import APIRouter, Depends
from starlette.responses import StreamingResponse

from backend.src.api.dependency import (
    get_ai_orchestrator,
    get_current_user,
    get_model_service,
    get_message_service,
)
from backend.src.schemas.custom import CurrentUserDTO
from backend.src.schemas.message_schema import MessageSendDTO
from backend.src.service.message_service import MessageService
from backend.src.service.model_orchestrator import AIOrchestrator
from backend.src.service.model_service import ModelService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/message", tags=["Message"])


@router.post("/send", response_model=None)
async def stream_message(
    payload: MessageSendDTO,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
    model_service: ModelService = Depends(get_model_service),
    message_service: MessageService = Depends(get_message_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
) -> StreamingResponse | dict[str, str]:
    await message_service.validate_save_message(payload, current_user.user_id)
    if payload.model_id:
        await model_service.link_model(
            payload.chat_id, payload.model_id, current_user.user_id
        )
        ai_message = StreamingResponse(
            orchestrator.orchestrate_generation(
                model_id=payload.model_id, text=payload.content
            ),
            media_type="text/plain; charset=utf-8",
        )
        return ai_message
    return {"status": "ok"}


@router.get("/")
async def get_messages(
    chat_id: int,
    message_service: MessageService = Depends(get_message_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
):
    all_message = await message_service.validate_all_messages(chat_id)
    return {"status": "ok", "messages": all_message.messages}
