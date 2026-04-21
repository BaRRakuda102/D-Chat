from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, WebSocketException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from passlib.context import CryptContext
from .models import Token
import os

SECRET_KEY = os.getenv("JWT_SECRET", "change-this-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Argon2 для новых пользователей
ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1,
    hash_len=32,
    salt_len=16
)

# bcrypt для старых пользователей (обратная совместимость)
bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Пробуем argon2 первым
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except VerifyMismatchError:
        return False
    except Exception:
        # Если не argon2 — пробуем bcrypt (старые пользователи)
        try:
            return bcrypt_context.verify(plain_password, hashed_password)
        except Exception:
            return False

def get_password_hash(password: str) -> str:
    # Всегда используем argon2 для новых
    return ph.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_ws(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise WebSocketException(code=1008, reason="Invalid token type")
        if datetime.fromtimestamp(payload.get("exp", 0)) < datetime.utcnow():
            raise WebSocketException(code=1008, reason="Token expired")
        return payload
    except JWTError:
        raise WebSocketException(code=1008, reason="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    return decode_token(credentials.credentials)