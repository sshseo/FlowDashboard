from fastapi import APIRouter, HTTPException, Depends
from app.models.auth import LoginRequest, LoginResponse
from app.services.auth_service import AuthService
from app.dependencies import get_current_user

router = APIRouter()
auth_service = AuthService()


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """사용자 로그인"""
    return await auth_service.authenticate_user(login_data)


@router.get("/verify")
async def verify_token(current_user: str = Depends(get_current_user)):
    """토큰 검증"""
    return {"valid": True, "user_id": current_user}