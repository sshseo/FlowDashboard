# app/config.py
import os
from typing import List

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://mac@localhost/postgres")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://172.30.1.4:3000"]

# 전역에서 사용할 설정 인스턴스
settings = Settings()