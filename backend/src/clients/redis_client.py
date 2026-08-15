import json
from typing import Optional, Any
from backend.src.configs.redis_config import redis_settings

import redis.asyncio as aioredis


class RedisCacheBackend:
    def __init__(self, url: str):
        self._url = url
        self._redis: Optional[aioredis.Redis] = None

    async def connect(self):
        self._redis = aioredis.from_url(url=self._url, decode_responses=True)

    async def disconnect(self):
        if self._redis:
            await self._redis.aclose()

    async def get(self, key: str) -> Optional[Any]:
        if self._redis is None:
            raise RuntimeError("Redis is not connected")
        raw = await self._redis.get(key)
        return json.loads(raw) if raw else None

    async def set(self, key: str, value: str, expire: int = 3600) -> None:
        await self._redis.set(key, json.dumps(value), ex=expire)

    async def delete_key(self, key: str) -> None:
        await self._redis.delete(key)


redis_client = RedisCacheBackend(redis_settings.url)
