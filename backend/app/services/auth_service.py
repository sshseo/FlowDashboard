from fastapi import HTTPException, Request
from datetime import timedelta
from app.models.auth import LoginRequest, LoginResponse
from app.utils.auth_utils import verify_password, create_access_token
from app.utils.rate_limiter import LoginAttemptTracker
from app.utils.audit_logger import AuditLogger
from app.database import get_db_pool
from app.config import settings


class AuthService:
    async def authenticate_user(self, login_data: LoginRequest, client_ip: str) -> LoginResponse:
        """사용자 인증 처리 (로그인 시도 제한 포함)"""
        
        # 1. 로그인 시도 제한 확인
        attempt_status = await LoginAttemptTracker.check_login_attempts(
            login_data.username, client_ip
        )
        
        if not attempt_status["allowed"]:
            raise HTTPException(
                status_code=429,
                detail=attempt_status["reason"]
            )
        
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # 사용자 정보 조회
            user_row = await conn.fetchrow(
                "SELECT user_uid, user_id, user_pwd, user_name, user_level FROM users WHERE user_id = $1",
                login_data.username
            )

            # 인증 실패 처리
            if not user_row or not verify_password(login_data.password, user_row['user_pwd']):
                # 감사 로그 기록
                await AuditLogger.log_login_failure(
                    login_data.username, client_ip, 
                    "잘못된 사용자명 또는 비밀번호"
                )
                
                # 실패 시도 기록
                await LoginAttemptTracker.record_failed_attempt(login_data.username, client_ip)
                
                # 남은 시도 횟수 계산
                remaining = attempt_status.get("remaining_attempts", 0) - 1
                
                if remaining <= 0:
                    # 계정 잠금 보안 이벤트 기록
                    await AuditLogger.log_security_event(
                        AuditLogger.ACCOUNT_LOCKED,
                        client_ip,
                        {"username": login_data.username, "reason": "로그인 시도 횟수 초과"}
                    )
                    raise HTTPException(
                        status_code=429, 
                        detail="로그인 시도 횟수를 초과했습니다. 30분 후 다시 시도하세요."
                    )
                else:
                    raise HTTPException(
                        status_code=401, 
                        detail=f"사용자명 또는 비밀번호가 올바르지 않습니다. (남은 시도: {remaining}회)"
                    )
            
            # 로그인 성공 - 성공 기록 및 잠금 해제
            await LoginAttemptTracker.record_successful_attempt(login_data.username, client_ip)
            
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