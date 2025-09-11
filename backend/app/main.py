# main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import os

from app.config import settings
from app.database import init_db_pool, close_db_pool, get_db_pool
from app.routers import auth, flow, websocket, admin, ai
from app.middleware.security import SecurityMiddleware
from app.services.ai_data_service import ai_data_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시
    await init_db_pool()
    
    # AI 서비스 자동 시작
    try:
        await ai_data_service.start_ai_data_service()
        print("AI 데이터 서비스 자동 시작됨")
    except Exception as e:
        print(f"AI 서비스 시작 실패 (계속 진행): {e}")
    
    yield
    
    # 서버 종료 시
    try:
        await ai_data_service.stop_ai_data_service()
        print("AI 데이터 서비스 중지됨")
    except Exception as e:
        print(f"AI 서비스 중지 중 오류: {e}")
    
    await close_db_pool()


app = FastAPI(
    title="AI CCTV 수위 모니터링 API",
    description="소하천 실시간 모니터링 시스템 백엔드 API",
    version="1.0.0",
    lifespan=lifespan
)

# 보안 미들웨어 설정

# 1. 신뢰할 수 있는 호스트만 허용
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "172.30.1.95", "222.103.78.124", "*.yourdomain.com"]
)

# 2. 보안 헤더 미들웨어
app.add_middleware(SecurityMiddleware)

# 3. CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization", 
        "Content-Type", 
        "X-Requested-With",
        "X-CSRF-Token"
    ],
    expose_headers=["X-Total-Count"]
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(flow.router, prefix="/api", tags=["Flow Data"])
app.include_router(websocket.router, prefix="/api", tags=["WebSocket"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administration"])
app.include_router(ai.router, prefix="/api", tags=["AI Data"])

@app.get("/")
async def root():
    """서버 상태 확인"""
    return {
        "message": "AI CCTV 수위 모니터링 API 서버가 정상 작동 중입니다",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)