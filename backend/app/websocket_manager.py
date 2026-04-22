from fastapi import WebSocket, WebSocketException, WebSocketDisconnect
from typing import Dict, Set, List, Optional
import json
from datetime import datetime
from .redis_client import redis_client
from .auth import get_current_user_ws
import asyncio


class ConnectionManager:
    def __init__(self):
        # Локальные соединения на этом сервере
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[int, Set[str]] = {}
        self.lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, token: str) -> tuple[int, str]:
        """Аутентификация и подключение. Возвращает (user_id, conn_id)"""
        try:
            payload = await get_current_user_ws(token)
            user_id = int(payload.get("sub"))
            if not user_id:
                raise WebSocketException(code=1008, reason="Invalid user")
        except Exception:
            raise WebSocketException(code=1008, reason="Authentication failed")
        
        # Rate limit: max 5 WS connections per user
        current_conns = await redis_client.get_user_connections(user_id)
        if len(current_conns) >= 5:
            raise WebSocketException(code=1008, reason="Too many connections")
        
        conn_id = f"{user_id}_{datetime.utcnow().timestamp()}_{id(websocket)}"
        
        await websocket.accept()
        
        async with self.lock:
            self.active_connections[conn_id] = websocket
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(conn_id)
        
        # Сохраняем в Redis для кросс-серверной синхронизации
        await redis_client.add_ws_connection(user_id, conn_id)
        await redis_client.set_user_online(user_id)
        
        return user_id, conn_id
    
    async def disconnect(self, conn_id: str):
        async with self.lock:
            if conn_id not in self.active_connections:
                return
            
            websocket = self.active_connections.pop(conn_id)
            
            # Находим user_id по conn_id
            user_id = None
            for uid, conns in self.user_connections.items():
                if conn_id in conns:
                    user_id = uid
                    conns.remove(conn_id)
                    if not conns:
                        del self.user_connections[uid]
                    break
        
        if user_id:
            await redis_client.remove_ws_connection(user_id, conn_id)
            # Проверяем, остались ли другие соединения
            remaining = await redis_client.get_user_connections(user_id)
            if not remaining:
                await redis_client.set_user_offline(user_id)
        
        try:
            await websocket.close()
        except Exception:
            pass
    
    async def send_personal(self, user_id: int, message: dict):
        """Отправка конкретному пользователю (все его устройства)"""
        conn_ids = self.user_connections.get(user_id, set())
        dead_conns = []
        
        for conn_id in conn_ids:
            ws = self.active_connections.get(conn_id)
            if ws:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_conns.append(conn_id)
        
        # Очистка мертвых соединений
        for conn_id in dead_conns:
            await self.disconnect(conn_id)
    
    async def broadcast_to_chat(self, chat_id: str, message: dict, exclude_user: int = None):
        """Рассылка участникам чата"""
        participants = await redis_client.get_chat_participants(chat_id)
        
        for user_id in participants:
            if exclude_user and user_id == exclude_user:
                continue
            await self.send_personal(user_id, message)
    
    async def broadcast_system(self, message: dict):
        """Глобальная рассылка (осторожно!)"""
        for conn_id, ws in list(self.active_connections.items()):
            try:
                await ws.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()