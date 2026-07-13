from backend.src.schemas.custom import LoginData, UserIDDTO


class AuthService:
    def __init__(self, auth_repository):
        self.auth_repository = auth_repository

    async def resp_authenticate_user(self, creds: LoginData) -> UserIDDTO | None:
        resp = await self.auth_repository.authenticate_user(creds)
        if resp:
            result_dto = UserIDDTO.model_validate(resp, from_attributes=True)
            return result_dto
        return None
