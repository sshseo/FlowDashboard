# app/utils/rate_limiter.py
from datetime import datetime, timedelta
from typing import Dict, Optional
import json
from app.database import get_db_pool

class LoginAttemptTracker:
    """로그인 시도 추적 및 제한"""
    
    # 설정값
    MAX_ATTEMPTS = 5  # 최대 시도 횟수
    LOCKOUT_DURATION = 30  # 잠금 시간 (분)
    IP_LOCKOUT_DURATION = 30  # IP 잠금 시간 (분)
    
    @staticmethod
    async def check_login_attempts(username: str, ip_address: str) -> Dict[str, any]:
        """
        로그인 시도 확인
        Returns:
            {
                "allowed": bool,
                "reason": str,
                "remaining_attempts": int,
                "lockout_until": datetime or None
            }
        """
        db_pool = get_db_pool()
        
        async with db_pool.acquire() as conn:
            # 테이블 존재 확인 및 생성
            await LoginAttemptTracker._ensure_tables_exist(conn)
            
            # 1. 계정 기반 확인
            account_status = await LoginAttemptTracker._check_account_lockout(conn, username)
            if not account_status["allowed"]:
                return account_status
            
            # 2. IP 기반 확인
            ip_status = await LoginAttemptTracker._check_ip_lockout(conn, ip_address)
            if not ip_status["allowed"]:
                return ip_status
            
            return {
                "allowed": True,
                "reason": "OK",
                "remaining_attempts": LoginAttemptTracker.MAX_ATTEMPTS - account_status["attempt_count"],
                "lockout_until": None
            }
    
    @staticmethod
    async def record_failed_attempt(username: str, ip_address: str) -> Dict[str, any]:
        """실패한 로그인 시도 기록"""
        db_pool = get_db_pool()
        
        async with db_pool.acquire() as conn:
            await LoginAttemptTracker._ensure_tables_exist(conn)
            
            # 실패 기록 추가
            await conn.execute("""
                INSERT INTO login_attempts 
                (username, ip_address, attempt_time, success, user_agent)
                VALUES ($1, $2, $3, $4, $5)
            """, username, ip_address, datetime.now(), False, "")
            
            # 현재 시도 횟수 확인
            account_attempts = await LoginAttemptTracker._get_recent_attempts(
                conn, username, "username"
            )
            ip_attempts = await LoginAttemptTracker._get_recent_attempts(
                conn, ip_address, "ip_address"
            )
            
            result = {
                "account_locked": False,
                "ip_locked": False,
                "remaining_attempts": LoginAttemptTracker.MAX_ATTEMPTS - account_attempts,
                "lockout_until": None
            }
            
            # 계정 잠금 확인
            if account_attempts >= LoginAttemptTracker.MAX_ATTEMPTS:
                lockout_until = datetime.now() + timedelta(minutes=LoginAttemptTracker.LOCKOUT_DURATION)
                await conn.execute("""
                    INSERT INTO account_lockouts 
                    (username, locked_at, locked_until, lock_reason)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (username) DO UPDATE SET
                        locked_at = $2,
                        locked_until = $3,
                        lock_reason = $4
                """, username, datetime.now(), lockout_until, 
                "연속 로그인 실패로 인한 자동 잠금")
                
                result["account_locked"] = True
                result["lockout_until"] = lockout_until
            
            # IP 잠금 확인
            if ip_attempts >= LoginAttemptTracker.MAX_ATTEMPTS:
                lockout_until = datetime.now() + timedelta(minutes=LoginAttemptTracker.IP_LOCKOUT_DURATION)
                await conn.execute("""
                    INSERT INTO ip_lockouts 
                    (ip_address, locked_at, locked_until, lock_reason)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (ip_address) DO UPDATE SET
                        locked_at = $2,
                        locked_until = $3,
                        lock_reason = $4
                """, ip_address, datetime.now(), lockout_until,
                "연속 로그인 실패로 인한 IP 차단")
                
                result["ip_locked"] = True
                if not result["lockout_until"]:
                    result["lockout_until"] = lockout_until
            
            return result
    
    @staticmethod
    async def record_successful_attempt(username: str, ip_address: str):
        """성공한 로그인 시도 기록 및 잠금 해제"""
        db_pool = get_db_pool()
        
        async with db_pool.acquire() as conn:
            await LoginAttemptTracker._ensure_tables_exist(conn)
            
            # 성공 기록 추가
            await conn.execute("""
                INSERT INTO login_attempts 
                (username, ip_address, attempt_time, success, user_agent)
                VALUES ($1, $2, $3, $4, $5)
            """, username, ip_address, datetime.now(), True, "")
            
            # 계정 잠금 해제
            await conn.execute("""
                DELETE FROM account_lockouts WHERE username = $1
            """, username)
            
            # IP 잠금 해제 (해당 사용자 성공시 IP도 해제)
            await conn.execute("""
                DELETE FROM ip_lockouts WHERE ip_address = $1
            """, ip_address)
    
    @staticmethod
    async def _ensure_tables_exist(conn):
        """필요한 테이블들 생성"""
        
        # 로그인 시도 기록 테이블
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100),
                ip_address INET,
                attempt_time TIMESTAMP DEFAULT NOW(),
                success BOOLEAN DEFAULT FALSE,
                user_agent TEXT
            )
        """)
        
        # 인덱스 생성
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_username_time ON login_attempts(username, attempt_time)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_ip_time ON login_attempts(ip_address, attempt_time)
        """)
        
        # 계정 잠금 테이블
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS account_lockouts (
                username VARCHAR(100) PRIMARY KEY,
                locked_at TIMESTAMP DEFAULT NOW(),
                locked_until TIMESTAMP,
                lock_reason TEXT
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_account_locked_until ON account_lockouts(locked_until)
        """)
        
        # IP 잠금 테이블
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS ip_lockouts (
                ip_address INET PRIMARY KEY,
                locked_at TIMESTAMP DEFAULT NOW(),
                locked_until TIMESTAMP,
                lock_reason TEXT
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_ip_locked_until ON ip_lockouts(locked_until)
        """)
    
    @staticmethod
    async def _check_account_lockout(conn, username: str) -> Dict[str, any]:
        """계정 잠금 상태 확인"""
        # 만료된 잠금 정리
        await conn.execute("""
            DELETE FROM account_lockouts 
            WHERE locked_until < NOW()
        """)
        
        # 현재 잠금 상태 확인
        lockout = await conn.fetchrow("""
            SELECT * FROM account_lockouts 
            WHERE username = $1
        """, username)
        
        if lockout:
            return {
                "allowed": False,
                "reason": f"계정이 잠겨있습니다. 해제 시간: {lockout['locked_until'].strftime('%Y-%m-%d %H:%M')}",
                "remaining_attempts": 0,
                "lockout_until": lockout['locked_until']
            }
        
        # 최근 시도 횟수 확인
        attempt_count = await LoginAttemptTracker._get_recent_attempts(
            conn, username, "username"
        )
        
        return {
            "allowed": True,
            "reason": "OK",
            "attempt_count": attempt_count,
            "remaining_attempts": LoginAttemptTracker.MAX_ATTEMPTS - attempt_count
        }
    
    @staticmethod
    async def _check_ip_lockout(conn, ip_address: str) -> Dict[str, any]:
        """IP 잠금 상태 확인"""
        # 만료된 잠금 정리
        await conn.execute("""
            DELETE FROM ip_lockouts 
            WHERE locked_until < NOW()
        """)
        
        # 현재 IP 잠금 상태 확인
        lockout = await conn.fetchrow("""
            SELECT * FROM ip_lockouts 
            WHERE ip_address = $1
        """, ip_address)
        
        if lockout:
            return {
                "allowed": False,
                "reason": f"IP가 차단되었습니다. 해제 시간: {lockout['locked_until'].strftime('%Y-%m-%d %H:%M')}",
                "remaining_attempts": 0,
                "lockout_until": lockout['locked_until']
            }
        
        return {"allowed": True, "reason": "OK"}
    
    @staticmethod
    async def _get_recent_attempts(conn, identifier: str, field: str) -> int:
        """최근 30분간 실패 시도 횟수 조회"""
        since_time = datetime.now() - timedelta(minutes=30)
        
        result = await conn.fetchrow(f"""
            SELECT COUNT(*) as count
            FROM login_attempts 
            WHERE {field} = $1 
            AND attempt_time > $2 
            AND success = FALSE
        """, identifier, since_time)
        
        return result['count'] if result else 0