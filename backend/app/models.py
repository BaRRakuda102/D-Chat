from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=32, pattern=r'^[a-zA-Z0-9_]+$')
    password: str = Field(..., min_length=6, max_length=128)
    display_name: Optional[str] = Field(None, max_length=64)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

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
    type: str  # "private" | "group"
    participants: List[int]
    last_message: Optional[MessageResponse]
    unread_count: int = 0