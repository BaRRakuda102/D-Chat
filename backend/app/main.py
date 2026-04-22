from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import os
from typing import List

from .models import (
    UserCreate, UserLogin, UserResponse, Token, MessageCreate, MessageResponse, ChatInfo,
    UserUpdate, FriendRequestCreate, FriendRequestResponse, FriendResponse,
    GroupCreate, ChannelCreate
)
from .auth import get_password_hash, verify_password, create_access_token, get_current_user
from .redis_client import redis_client
from .websocket_manager import manager
from .database import get_db, init_db, UserDB, ChatDB, MessageDB, FriendRequestDB
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

# ==================== USER PROFILE ====================

@app.get("/api/users/me", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user

@app.patch("/api/users/me", response_model=UserResponse)
async def update_profile(
    update: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(UserDB).filter(UserDB.id == int(current_user["sub"])).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    if update.display_name is not None:
        user.display_name = update.display_name
    if update.bio is not None:
        user.bio = update.bio
    if update.birth_date is not None:
        user.birth_date = update.birth_date
    if update.avatar_url is not None:
        user.avatar_url = update.avatar_url
    
    db.commit()
    db.refresh(user)
    return user

@app.get("/api/users/search")
async def search_users(
    query: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_id = int(current_user["sub"])
    users = db.query(UserDB).filter(
        UserDB.username.ilike(f"%{query}%"),
        UserDB.id != current_id
    ).limit(20).all()
    
    return [UserResponse(
        id=u.id,
        username=u.username,
        display_name=u.display_name,
        bio=u.bio,
        birth_date=u.birth_date,
        avatar_url=u.avatar_url,
        created_at=u.created_at
    ) for u in users]

# ==================== FRIENDS ====================

@app.post("/api/friends/request")
async def send_friend_request(
    req: FriendRequestCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from_id = int(current_user["sub"])
    
    to_user = db.query(UserDB).filter(UserDB.username == req.to_username).first()
    if not to_user:
        raise HTTPException(404, "User not found")
    
    if to_user.id == from_id:
        raise HTTPException(400, "Cannot add yourself")
    
    existing = db.query(FriendRequestDB).filter(
        ((FriendRequestDB.from_user_id == from_id) & (FriendRequestDB.to_user_id == to_user.id)) |
        ((FriendRequestDB.from_user_id == to_user.id) & (FriendRequestDB.to_user_id == from_id))
    ).filter(FriendRequestDB.status == "pending").first()
    
    if existing:
        raise HTTPException(400, "Request already pending")
    
    existing_friend = db.query(FriendRequestDB).filter(
        ((FriendRequestDB.from_user_id == from_id) & (FriendRequestDB.to_user_id == to_user.id)) |
        ((FriendRequestDB.from_user_id == to_user.id) & (FriendRequestDB.to_user_id == from_id))
    ).filter(FriendRequestDB.status == "accepted").first()
    
    if existing_friend:
        raise HTTPException(400, "Already friends")
    
    request = FriendRequestDB(from_user_id=from_id, to_user_id=to_user.id)
    db.add(request)
    db.commit()
    
    # Notify via WebSocket
    await manager.send_personal(to_user.id, {
        "type": "friend_request",
        "data": {
            "id": request.id,
            "from_user": {
                "id": from_id,
                "username": db.query(UserDB).filter(UserDB.id == from_id).first().username,
                "display_name": db.query(UserDB).filter(UserDB.id == from_id).first().display_name
            }
        }
    })
    
    return {"status": "sent"}

@app.get("/api/friends/requests", response_model=List[FriendRequestResponse])
async def get_friend_requests(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    requests = db.query(FriendRequestDB).filter(
        FriendRequestDB.to_user_id == user_id,
        FriendRequestDB.status == "pending"
    ).all()
    
    return [FriendRequestResponse(
        id=r.id,
        from_user=UserResponse(
            id=r.from_user.id,
            username=r.from_user.username,
            display_name=r.from_user.display_name,
            bio=r.from_user.bio,
            birth_date=r.from_user.birth_date,
            avatar_url=r.from_user.avatar_url,
            created_at=r.from_user.created_at
        ),
        to_user_id=r.to_user_id,
        status=r.status,
        created_at=r.created_at
    ) for r in requests]

@app.post("/api/friends/requests/{request_id}/accept")
async def accept_friend_request(
    request_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    req = db.query(FriendRequestDB).filter(
        FriendRequestDB.id == request_id,
        FriendRequestDB.to_user_id == user_id,
        FriendRequestDB.status == "pending"
    ).first()
    
    if not req:
        raise HTTPException(404, "Request not found")
    
    req.status = "accepted"
    db.commit()
    
    # Create private chat
    chat_id = f"private_{min(req.from_user_id, req.to_user_id)}_{max(req.from_user_id, req.to_user_id)}"
    existing_chat = db.query(ChatDB).filter(ChatDB.chat_id == chat_id).first()
    
    if not existing_chat:
        chat = ChatDB(
            chat_id=chat_id,
            name=req.from_user.display_name or req.from_user.username,
            type="private",
            participants=[req.from_user, req.to_user]
        )
        db.add(chat)
        db.commit()
        
        await redis_client.add_chat_participant(chat_id, req.from_user_id)
        await redis_client.add_chat_participant(chat_id, req.to_user_id)
    
    # Notify both users
    await manager.send_personal(req.from_user_id, {
        "type": "friend_accepted",
        "data": {"user_id": user_id}
    })
    
    return {"status": "accepted"}

@app.post("/api/friends/requests/{request_id}/reject")
async def reject_friend_request(
    request_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    req = db.query(FriendRequestDB).filter(
        FriendRequestDB.id == request_id,
        FriendRequestDB.to_user_id == user_id,
        FriendRequestDB.status == "pending"
    ).first()
    
    if not req:
        raise HTTPException(404, "Request not found")
    
    req.status = "rejected"
    db.commit()
    return {"status": "rejected"}

@app.get("/api/friends", response_model=List[FriendResponse])
async def get_friends(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = int(current_user["sub"])
    
    friendships = db.query(FriendRequestDB).filter(
        ((FriendRequestDB.from_user_id == user_id) | (FriendRequestDB.to_user_id == user_id)),
        FriendRequestDB.status == "accepted"
    ).all()
    
    friends = []
    for f in friendships:
        friend_id = f.to_user_id if f.from_user_id == user_id else f.from_user_id
        friend = db.query(UserDB).filter(UserDB.id == friend_id).first()
        if friend:
            friends.append(FriendResponse(
                id=friend.id,
                user=UserResponse(
                    id=friend.id,
                    username=friend.username,
                    display_name=friend.display_name,
                    bio=friend.bio,
                    birth_date=friend.birth_date,
                    avatar_url=friend.avatar_url,
                    created_at=friend.created_at
                ),
                since=f.created_at
            ))
    
    return friends

# ==================== GROUPS ====================

@app.post("/api/groups")
async def create_group(
    group: GroupCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    creator_id = int(current_user["sub"])
    
    chat_id = f"group_{uuid.uuid4().hex[:12]}"
    
    # Find members by username
    members = [db.query(UserDB).filter(UserDB.id == creator_id).first()]
    for username in group.member_usernames:
        user = db.query(UserDB).filter(UserDB.username == username).first()
        if user and user.id != creator_id:
            members.append(user)
    
    chat = ChatDB(
        chat_id=chat_id,
        name=group.name,
        type="group",
        description=group.description,
        created_by=creator_id,
        participants=members
    )
    db.add(chat)
    db.commit()
    
    for member in members:
        await redis_client.add_chat_participant(chat_id, member.id)
    
    return {"chat_id": chat_id, "name": group.name}

# ==================== CHANNELS ====================

@app.post("/api/channels")
async def create_channel(
    channel: ChannelCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    creator_id = int(current_user["sub"])
    
    chat_id = f"channel_{uuid.uuid4().hex[:12]}"
    
    chat = ChatDB(
        chat_id=chat_id,
        name=channel.name,
        type="channel",
        description=channel.description,
        created_by=creator_id,
        participants=[db.query(UserDB).filter(UserDB.id == creator_id).first()]
    )
    db.add(chat)
    db.commit()
    
    await redis_client.add_chat_participant(chat_id, creator_id)
    
    return {"chat_id": chat_id, "name": channel.name}        

# ==================== STATIC FILES (SPA) ====================

class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code == 404:
                index_path = os.path.join(self.directory, "index.html")
                if os.path.exists(index_path):
                    return FileResponse(index_path)
            raise exc

static_dir = os.getenv("STATIC_DIR", "./static")
if static_dir and os.path.exists(static_dir):
    app.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)