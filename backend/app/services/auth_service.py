from fastapi import HTTPException, Request
from datetime import timedelta
from app.models.auth import LoginRequest, LoginResponse, CreateUserRequest, CreateUserResponse
from app.utils.auth_utils import verify_password, create_access_token, hash_password
from app.utils.audit_logger import AuditLogger
from app.utils.login_logger import LoginLogger
from app.database import get_db_pool
from app.config import settings


class AuthService:
    async def authenticate_user(self, login_data: LoginRequest, client_ip: str) -> LoginResponse:
        """사용자 인증 처리"""
        
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # 사용자 정보 조회
            user_row = await conn.fetchrow(
                "SELECT user_uid, user_id, user_pwd, user_name, user_level FROM users WHERE user_id = $1",
                login_data.username
            )

            # 인증 실패 처리
            if not user_row or not verify_password(login_data.password, user_row['user_pwd']):
                # 로그인 실패 기록
                await LoginLogger.log_attempt(login_data.username, client_ip, success=False)
                
                # 감사 로그 기록
                await AuditLogger.log_login_failure(
                    login_data.username, client_ip, 
                    "잘못된 사용자명 또는 비밀번호"
                )
                
                raise HTTPException(
                    status_code=401, 
                    detail="사용자명 또는 비밀번호가 올바르지 않습니다."
                )
            
            # 로그인 성공 기록
            await LoginLogger.log_attempt(login_data.username, client_ip, success=True)
            
            # 감사 로그 기록
            await AuditLogger.log_login_success(login_data.username, client_ip)

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

    async def create_user(self, user_data: CreateUserRequest, current_user_level: int) -> CreateUserResponse:
        """새 사용자 생성 (관리자만 가능)"""
        
        # 관리자 권한 확인 (user_level 0만 가능)
        if current_user_level != 0:
            raise HTTPException(
                status_code=403,
                detail="권한이 없습니다. 관리자만 회원을 추가할 수 있습니다."
            )
        
        db_pool = get_db_pool()
        
        async with db_pool.acquire() as conn:
            # 중복 아이디 확인
            existing_user = await conn.fetchrow(
                "SELECT user_id FROM users WHERE user_id = $1",
                user_data.user_id
            )
            
            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="이미 존재하는 아이디입니다."
                )
            
            # 비밀번호 해시화
            hashed_password = hash_password(user_data.password)
            
            try:
                # 새 사용자 추가
                user_uid = await conn.fetchval(
                    """INSERT INTO users (user_id, user_pwd, user_name, user_level, user_phone, user_createtime)
                       VALUES ($1, $2, $3, $4, $5, NOW())
                       RETURNING user_uid""",
                    user_data.user_id,
                    hashed_password,
                    user_data.user_name,
                    user_data.user_level,
                    user_data.phone
                )
                
                return CreateUserResponse(
                    success=True,
                    message="회원이 성공적으로 추가되었습니다.",
                    user_uid=user_uid
                )
                
            except Exception as e:
                # 데이터베이스 오류 처리
                raise HTTPException(
                    status_code=500,
                    detail="회원 추가 중 오류가 발생했습니다."
                )