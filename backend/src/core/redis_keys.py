class RedisKeys:
    """Все ключи Redis."""

    @staticmethod
    def all_chats(user_id: int) -> str:
        return f"chat:{user_id}:all_chats"

    @staticmethod
    def profile(user_id: int) -> str:
        return f"user:{user_id}:profile"
