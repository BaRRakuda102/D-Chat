import redis.asyncio as redis
import os
import json
from typing import Optional, List, Dict, Any
from datetime import datetime

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

class RedisClient:
    def __init__(self):
        self.client: Optional[redis.Redis] = None
    
    async def connect(self):
        self.client = redis.from_url(REDIS_URL, decode_responses=True)
    
    async def disconnect(self):
        if self.client:
            await self.client.close()
    
    # Rate Limiting
    async def check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """Sliding window rate limit. Returns True if allowed."""
        pipe = self.client.pipeline()
        now = datetime.utcnow().timestamp()
        window_start = now - window
        
        # Удаляем старые записи
        pipe.zremrangebyscore(f"rl:{key}", 0, window_start)
        # Считаем текущие
        pipe.zcard(f"rl:{key}")
        # Добавляем текущий запрос
        pipe.zadd(f"rl:{key}", {str(now): now})
        # Устанавливаем TTL
        pipe.expire(f"rl:{key}", window + 1)
        
        results = await pipe.execute()
        current_count = results[1]
        
        return current_count < limit
    
    # User sessions
    async def store_user_session(self, user_id: int, session_data: dict, ttl: int = 86400):
        await self.client.setex(f"session:{user_id}", ttl, json.dumps(session_data))
    
    async def get_user_session(self, user_id: int) -> Optional[dict]:
        data = await self.client.get(f"session:{user_id}")
        return json.loads(data) if data else None
    
    # Active WebSocket connections
    async def add_ws_connection(self, user_id: int, connection_id: str, server_id: str = "default"):
        await self.client.sadd(f"ws:user:{user_id}", connection_id)
        await self.client.hset(f"ws:conn:{connection_id}", mapping={
            "user_id": user_id,
            "server": server_id,
            "connected_at": datetime.utcnow().isoformat()
        })
        await self.client.expire(f"ws:conn:{connection_id}", 86400)
    
    async def remove_ws_connection(self, user_id: int, connection_id: str):
        await self.client.srem(f"ws:user:{user_id}", connection_id)
        await self.client.delete(f"ws:conn:{connection_id}")
    
    async def get_user_connections(self, user_id: int) -> List[str]:
        return list(await self.client.smembers(f"ws:user:{user_id}"))
    
    # Messages (recent history in Redis, persistent in DB)
    async def store_message(self, chat_id: str, message: dict, max_history: int = 100):
        key = f"chat:{chat_id}:messages"
        await self.client.lpush(key, json.dumps(message))
        await self.client.ltrim(key, 0, max_history - 1)
        await self.client.expire(key, 604800)  # 7 days
    
    async def get_recent_messages(self, chat_id: str, count: int = 50) -> List[dict]:
        key = f"chat:{chat_id}:messages"
        messages = await self.client.lrange(key, 0, count - 1)
        return [json.loads(m) for m in messages]
    
    # Online status
    async def set_user_online(self, user_id: int, ttl: int = 120):
        await self.client.setex(f"online:{user_id}", ttl, "1")
        await self.client.sadd("online:users", user_id)
    
    async def set_user_offline(self, user_id: int):
        await self.client.delete(f"online:{user_id}")
        await self.client.srem("online:users", user_id)
    
    async def is_user_online(self, user_id: int) -> bool:
        return await self.client.exists(f"online:{user_id}") > 0
    
    # Chat metadata
    async def get_chat_participants(self, chat_id: str) -> List[int]:
        participants = await self.client.smembers(f"chat:{chat_id}:participants")
        return [int(p) for p in participants]
    
    async def add_chat_participant(self, chat_id: str, user_id: int):
        await self.client.sadd(f"chat:{chat_id}:participants", user_id)
    
    # Presence in chat (typing, etc)
    async def set_typing(self, chat_id: str, user_id: int, ttl: int = 10):
        await self.client.setex(f"typing:{chat_id}:{user_id}", ttl, "1")
    
    async def get_typing_users(self, chat_id: str) -> List[int]:
        pattern = f"typing:{chat_id}:*"
        keys = await self.client.keys(pattern)
        return [int(k.split(":")[-1]) for k in keys]

redis_client = RedisClient()