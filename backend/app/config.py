# app/config.py
import os
from typing import List

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    # DATABASE_URL 은 실제 환경에 따라 아이디 비밀번호는 다르게설정해줘야함
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:1234@localhost:5432/postgres")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://172.30.1.95:3000", "http://222.103.78.124:3000"]

# 전역에서 사용할 설정 인스턴스
settings = Settings()