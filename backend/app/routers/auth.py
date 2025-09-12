from fastapi import APIRouter, HTTPException, Depends, Request
from app.models.auth import LoginRequest, LoginResponse, CreateUserRequest, CreateUserResponse
from pydantic import BaseModel
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
async def verify_token(current_user: dict = Depends(get_current_user)):
    """토큰 검증"""
    return {"valid": True, "user": current_user}


@router.post("/create-user", response_model=CreateUserResponse)
async def create_user(user_data: CreateUserRequest, current_user: dict = Depends(get_current_user)):
    """새 사용자 생성 (관리자만 가능)"""
    return await auth_service.create_user(user_data, current_user["user_level"])


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest, 
    current_user: dict = Depends(get_current_user)
):
    """비밀번호 변경"""
    try:
        result = await auth_service.change_password(
            current_user["user_uid"],
            password_data.current_password,
            password_data.new_password
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))