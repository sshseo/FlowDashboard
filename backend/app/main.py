# main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime

from app.config import settings
from app.database import init_db_pool, close_db_pool, get_db_pool
from app.routers import auth, flow, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_pool()
    yield
    await close_db_pool()


app = FastAPI(
    title="AI CCTV 수위 모니터링 API",
    description="소하천 실시간 모니터링 시스템 백엔드 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(flow.router, prefix="/api", tags=["Flow Data"])
app.include_router(websocket.router, prefix="/api", tags=["WebSocket"])

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