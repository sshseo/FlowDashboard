from fastapi import HTTPException
from datetime import timedelta
from app.models.auth import LoginRequest, LoginResponse
from app.utils.auth_utils import verify_password, create_access_token
from app.database import get_db_pool
from app.config import settings


class AuthService:
    async def authenticate_user(self, login_data: LoginRequest) -> LoginResponse:
        """사용자 인증 처리"""
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # 사용자 정보 조회
            user_row = await conn.fetchrow(
                "SELECT user_uid, user_id, user_pwd, user_name, user_level FROM users WHERE user_id = $1",
                login_data.username
            )

            if not user_row:
                raise HTTPException(status_code=401, detail="사용자명 또는 비밀번호가 올바르지 않습니다.")

            # 비밀번호 검증
            if not verify_password(login_data.password, user_row['user_pwd']):
                raise HTTPException(status_code=401, detail="사용자명 또는 비밀번호가 올바르지 않습니다.")

            # JWT 토큰 생성
            access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            if login_data.rememberMe:
                access_token_expires = timedelta(days=30)

            access_token = create_access_token(
                data={"sub": user_row['user_id'], "user_uid": user_row['user_uid']},
                expires_delta=access_token_expires
            )

            return LoginResponse(
                access_token=access_token,
                token_type="bearer",
                user_info={
                    "user_uid": user_row['user_uid'],
                    "user_id": user_row['user_id'],
                    "user_name": user_row['user_name'],
                    "user_level": user_row['user_level']
                }
            )