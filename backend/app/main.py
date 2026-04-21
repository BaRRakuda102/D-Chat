from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import os
import json

from .models import UserCreate, UserLogin, UserResponse, Token, MessageCreate, MessageResponse, ChatInfo
from .auth import get_password_hash, verify_password, create_access_token, get_current_user
from .redis_client import redis_client
from .websocket_manager import manager
from .database import get_db, init_db, UserDB, ChatDB, MessageDB
from .rate_limiter import RateLimiter

app = FastAPI(title="D-Chat API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if os.getenv("ENV") == "dev" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rate_limiter = RateLimiter()

@app.on_event("startup")
async def startup():
    await redis_client.connect()
    init_db()

@app.on_event("shutdown")
async def shutdown():
    await redis_client.disconnect()

# ==================== AUTH ====================

@app.post("/api/auth/register", response_model=Token)
async def register(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host
    allowed = await redis_client.check_rate_limit(f"register:{client_ip}", 3, 3600)
    if not allowed:
        raise HTTPException(429, "Too many registration attempts")
    
    if db.query(UserDB).filter(UserDB.username == user.username).first():
        raise HTTPException(400, "Username already taken")
    
    db_user = UserDB(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        display_name=user.display_name or user.username
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    token = create_access_token({"sub": str(db_user.id)})
    return Token(access_token=token)

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host
    allowed = await redis_client.check_rate_limit(f"login:{client_ip}:{credentials.username}", 5, 300)
    if not allowed:
        raise HTTPException(429, "Too many login attempts. Try again in 5 minutes.")
    
    user = db.query(UserDB).filter(UserDB.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user

# ==================== CHATS ====================

@app.get("/api/chats", response_model=list[ChatInfo])
async def get_chats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = int(current_user["sub"])
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    
    chats = []
    for chat in user.chats:
        last_msg = db.query(MessageDB).filter(MessageDB.chat_id == chat.chat_id).order_by(MessageDB.created_at.desc()).first()
        
        unread = db.query(MessageDB).filter(
            MessageDB.chat_id == chat.chat_id,
            MessageDB.sender_id != user_id
        ).count()
        
        chats.append(ChatInfo(
            id=chat.chat_id,
            name=chat.name,
            type=chat.type,
            participants=[u.id for u in chat.participants],
            last_message=MessageResponse(
                id=last_msg.message_id,
                sender_id=last_msg.sender_id,
                sender_name=last_msg.sender.display_name,
                chat_id=last_msg.chat_id,
                content=last_msg.content[:100],
                type=last_msg.type,
                timestamp=last_msg.created_at,
                edited=last_msg.edited
            ) if last_msg else None,
            unread_count=unread
        ))
    
    return sorted(chats, key=lambda x: x.last_message.timestamp if x.last_message else datetime.min, reverse=True)

@app.post("/api/chats/{chat_id}/messages")
async def send_message(
    chat_id: str,
    msg: MessageCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    
    chat = db.query(ChatDB).filter(ChatDB.chat_id == chat_id).first()
    if not chat or user_id not in [u.id for u in chat.participants]:
        raise HTTPException(403, "Not a participant")
    
    message_id = str(uuid.uuid4())
    db_msg = MessageDB(
        message_id=message_id,
        chat_id=chat_id,
        sender_id=user_id,
        content=msg.content,
        type="text"
    )
    db.add(db_msg)
    db.commit()
    
    msg_data = {
        "id": message_id,
        "sender_id": user_id,
        "sender_name": db.query(UserDB).filter(UserDB.id == user_id).first().display_name,
        "chat_id": chat_id,
        "content": msg.content,
        "type": "text",
        "timestamp": datetime.utcnow().isoformat(),
        "edited": False
    }
    await redis_client.store_message(chat_id, msg_data)
    
    await manager.broadcast_to_chat(chat_id, {
        "type": "new_message",
        "data": msg_data
    })
    
    return msg_data

@app.get("/api/chats/{chat_id}/messages")
async def get_messages(
    chat_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    chat = db.query(ChatDB).filter(ChatDB.chat_id == chat_id).first()
    if not chat or user_id not in [u.id for u in chat.participants]:
        raise HTTPException(403, "Not a participant")
    
    redis_msgs = await redis_client.get_recent_messages(chat_id, limit)
    if redis_msgs:
        return redis_msgs
    
    msgs = db.query(MessageDB).filter(MessageDB.chat_id == chat_id).order_by(MessageDB.created_at.desc()).limit(limit).all()
    return [MessageResponse(
        id=m.message_id,
        sender_id=m.sender_id,
        sender_name=m.sender.display_name,
        chat_id=m.chat_id,
        content=m.content,
        type=m.type,
        timestamp=m.created_at,
        edited=m.edited
    ) for m in reversed(msgs)]

# ==================== WEBSOCKET ====================

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user_id = None
    conn_id = None
    
    try:
        user_id, conn_id = await manager.connect(websocket, token)
        
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
            
            elif msg_type == "typing":
                chat_id = data.get("chat_id")
                await redis_client.set_typing(chat_id, user_id)
                await manager.broadcast_to_chat(chat_id, {
                    "type": "typing",
                    "data": {"user_id": user_id, "chat_id": chat_id}
                }, exclude_user=user_id)
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS Error: {e}")
    finally:
        if conn_id:
            await manager.disconnect(conn_id)

# ==================== HEALTH ====================

@app.get("/api/health")
async def health():
    try:
        redis_ok = await redis_client.client.ping()
        return {"status": "ok", "redis": redis_ok}
    except:
        return {"status": "degraded", "redis": False}

# Static files (production)
static_dir = os.getenv("STATIC_DIR")
if static_dir and os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
elif os.path.exists("./static"):
    app.mount("/", StaticFiles(directory="./static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)