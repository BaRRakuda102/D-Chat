from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Table, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dchat.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

chat_participants = Table(
    'chat_participants',
    Base.metadata,
    Column('chat_id', Integer, ForeignKey('chats.id')),
    Column('user_id', Integer, ForeignKey('users.id'))
)

class UserDB(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(32), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    display_name = Column(String(64), nullable=True)
    bio = Column(Text, nullable=True)
    birth_date = Column(String(10), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    messages = relationship("MessageDB", back_populates="sender")
    chats = relationship("ChatDB", secondary=chat_participants, back_populates="participants")
    sent_requests = relationship("FriendRequestDB", foreign_keys="FriendRequestDB.from_user_id", back_populates="from_user")
    received_requests = relationship("FriendRequestDB", foreign_keys="FriendRequestDB.to_user_id", back_populates="to_user")

class FriendRequestDB(Base):
    __tablename__ = "friend_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(16), default="pending")  # pending, accepted, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    
    from_user = relationship("UserDB", foreign_keys=[from_user_id], back_populates="sent_requests")
    to_user_rel = relationship("UserDB", foreign_keys=[to_user_id], back_populates="received_requests")

class ChatDB(Base):
    __tablename__ = "chats"
    
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    type = Column(String(16), default="private")  # private, group, channel
    description = Column(Text, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    participants = relationship("UserDB", secondary=chat_participants, back_populates="chats")
    messages = relationship("MessageDB", back_populates="chat")

class MessageDB(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(64), unique=True, index=True, nullable=False)
    chat_id = Column(String(64), ForeignKey("chats.chat_id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(16), default="text")
    created_at = Column(DateTime, default=datetime.utcnow)
    edited = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    
    sender = relationship("UserDB", back_populates="messages")
    chat = relationship("ChatDB", back_populates="messages")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)