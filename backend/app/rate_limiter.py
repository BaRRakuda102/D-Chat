from fastapi import Request, HTTPException
from .redis_client import redis_client

class RateLimiter:
    async def check(self, request: Request, key: str, limit: int, window: int):
        allowed = await redis_client.check_rate_limit(key, limit, window)
        if not allowed:
            raise HTTPException(429, "Rate limit exceeded")