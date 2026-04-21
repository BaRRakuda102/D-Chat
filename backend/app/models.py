from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=32, pattern=r'^[a-zA-Z0-9_@.]+$')
    password: str = Field(..., min_length=6, max_length=71)
    display_name: Optional[str] = Field(None, max_length=64)

class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6, max_length=71)

class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=64)
    bio: Optional[str] = Field(None, max_length=256)
    birth_date: Optional[str] = Field(None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    avatar_url: Optional[str] = Field(None, max_length=512)

class UserResponse(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    bio: Optional[str]
    birth_date: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class FriendRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class FriendRequestCreate(BaseModel):
    to_username: str = Field(..., min_length=3, max_length=32)

class FriendRequestResponse(BaseModel):
    id: int
    from_user: UserResponse
    to_user_id: int
    status: FriendRequestStatus
    created_at: datetime

class FriendResponse(BaseModel):
    id: int
    user: UserResponse
    since: datetime

class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = Field(None, max_length=256)
    member_usernames: List[str] = Field(default_factory=list)

class ChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = Field(None, max_length=256)

class ChatType(str, Enum):
    PRIVATE = "private"
    GROUP = "group"
    CHANNEL = "channel"

class MessageType(str, Enum):
    TEXT = "text"
    SYSTEM = "system"

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4096)
    chat_id: str = Field(..., pattern=r'^[a-zA-Z0-9_-]+$')

class MessageResponse(BaseModel):
    id: str
    sender_id: int
    sender_name: str
    chat_id: str
    content: str
    type: MessageType
    timestamp: datetime
    edited: bool = False

class ChatInfo(BaseModel):
    id: str
    name: str
    type: str
    description: Optional[str]
    avatar_url: Optional[str]
    participants: List[int]
    last_message: Optional[MessageResponse]
    unread_count: int = 0
    is_admin: bool = False