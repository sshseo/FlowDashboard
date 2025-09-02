from fastapi import APIRouter, HTTPException, Depends, Request
from app.models.auth import LoginRequest, LoginResponse
from app.services.auth_service import AuthService
from app.dependencies import get_current_user

router = APIRouter()
auth_service = AuthService()


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, request: Request):
    """사용자 로그인 (로그인 시도 제한 포함)"""
    # 클라이언트 IP 추출
    client_ip = request.client.host
    
    # X-Forwarded-For 헤더 확인 (프록시 환경)
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    
    return await auth_service.authenticate_user(login_data, client_ip)


@router.get("/verify")
async def verify_token(current_user: str = Depends(get_current_user)):
    """토큰 검증"""
    return {"valid": True, "user_id": current_user}