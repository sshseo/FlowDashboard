from datetime import datetime
from app.database import get_db_pool


class LoginLogger:
    """로그인 시도 기록 (제한 기능 없이 로깅만)"""
    
    @staticmethod
    async def log_attempt(username: str, ip_address: str, success: bool, user_agent: str = ""):
        """로그인 시도 기록"""
        db_pool = get_db_pool()
        
        async with db_pool.acquire() as conn:
            # 테이블 존재 확인 및 생성
            await LoginLogger._ensure_table_exists(conn)
            
            # 로그인 시도 기록
            await conn.execute("""
                INSERT INTO login_attempts 
                (username, ip_address, attempt_time, success, user_agent)
                VALUES ($1, $2, $3, $4, $5)
            """, username, ip_address, datetime.now(), success, user_agent)
    
    @staticmethod
    async def _ensure_table_exists(conn):
        """login_attempts 테이블 생성"""
        
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
        
        # 인덱스 생성 (성능 향상)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_username_time ON login_attempts(username, attempt_time DESC)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_ip_time ON login_attempts(ip_address, attempt_time DESC)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_success_time ON login_attempts(success, attempt_time DESC)
        """)