# app/utils/audit_logger.py
import json
from datetime import datetime
from typing import Dict, Optional, Any
from app.database import get_db_pool

class AuditLogger:
    """감사 로그 시스템 - 개인정보보호법 준수"""
    
    # 로그 레벨
    INFO = "INFO"
    WARNING = "WARNING" 
    ERROR = "ERROR"
    SECURITY = "SECURITY"
    
    # 이벤트 타입
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGOUT = "LOGOUT"
    SESSION_TIMEOUT = "SESSION_TIMEOUT"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    DATA_ACCESS = "DATA_ACCESS"
    DATA_EXPORT = "DATA_EXPORT"
    CONFIG_CHANGE = "CONFIG_CHANGE"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"
    
    @staticmethod
    async def log_event(
        event_type: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        level: str = INFO,
        resource: Optional[str] = None
    ) -> bool:
        """
        감사 로그 기록
        Args:
            event_type: 이벤트 타입
            user_id: 사용자 ID
            ip_address: 클라이언트 IP
            user_agent: User Agent
            details: 추가 상세 정보
            level: 로그 레벨
            resource: 접근한 리소스
        """
        try:
            db_pool = get_db_pool()
            
            async with db_pool.acquire() as conn:
                await AuditLogger._ensure_audit_table_exists(conn)
                
                # 개인정보 마스킹
                masked_details = AuditLogger._mask_sensitive_data(details or {})
                
                await conn.execute("""
                    INSERT INTO audit_logs (
                        event_type, user_id, ip_address, user_agent,
                        details, level, resource, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, 
                event_type, user_id, ip_address, user_agent,
                json.dumps(masked_details, ensure_ascii=False), 
                level, resource, datetime.now()
                )
                
            return True
            
        except Exception as e:
            print(f"감사 로그 기록 실패: {str(e)}")
            return False
    
    @staticmethod
    async def log_login_success(user_id: str, ip_address: str, user_agent: str = ""):
        """로그인 성공 기록"""
        await AuditLogger.log_event(
            AuditLogger.LOGIN_SUCCESS,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"login_time": datetime.now().isoformat()},
            level=AuditLogger.INFO
        )
    
    @staticmethod
    async def log_login_failure(user_id: str, ip_address: str, reason: str, user_agent: str = ""):
        """로그인 실패 기록"""
        await AuditLogger.log_event(
            AuditLogger.LOGIN_FAILURE,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"failure_reason": reason, "attempt_time": datetime.now().isoformat()},
            level=AuditLogger.WARNING
        )
    
    @staticmethod
    async def log_logout(user_id: str, ip_address: str, logout_type: str = "manual"):
        """로그아웃 기록"""
        await AuditLogger.log_event(
            AuditLogger.LOGOUT,
            user_id=user_id,
            ip_address=ip_address,
            details={"logout_type": logout_type, "logout_time": datetime.now().isoformat()},
            level=AuditLogger.INFO
        )
    
    @staticmethod
    async def log_data_access(user_id: str, ip_address: str, resource: str, action: str):
        """데이터 접근 기록"""
        await AuditLogger.log_event(
            AuditLogger.DATA_ACCESS,
            user_id=user_id,
            ip_address=ip_address,
            details={"action": action, "access_time": datetime.now().isoformat()},
            level=AuditLogger.INFO,
            resource=resource
        )
    
    @staticmethod
    async def log_security_event(event_type: str, ip_address: str, details: Dict[str, Any]):
        """보안 이벤트 기록"""
        await AuditLogger.log_event(
            event_type,
            ip_address=ip_address,
            details=details,
            level=AuditLogger.SECURITY
        )
    
    @staticmethod
    async def _ensure_audit_table_exists(conn):
        """감사 로그 테이블 생성"""
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(100) NOT NULL,
                user_id VARCHAR(100),
                ip_address INET,
                user_agent TEXT,
                details JSONB,
                level VARCHAR(20) DEFAULT 'INFO',
                resource VARCHAR(200),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # 인덱스 생성
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_logs(user_id, created_at)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_ip_time ON audit_logs(ip_address, created_at)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at)
        """)
    
    @staticmethod
    def _mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """민감 정보 마스킹"""
        masked = data.copy()
        
        sensitive_keys = ['password', 'pwd', 'token', 'secret', 'key']
        
        for key, value in masked.items():
            if any(sens in key.lower() for sens in sensitive_keys):
                if isinstance(value, str) and len(value) > 4:
                    masked[key] = value[:2] + '*' * (len(value) - 4) + value[-2:]
                else:
                    masked[key] = '****'
        
        return masked
    
    @staticmethod
    async def get_audit_logs(
        user_id: Optional[str] = None,
        event_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> list:
        """감사 로그 조회"""
        try:
            db_pool = get_db_pool()
            
            async with db_pool.acquire() as conn:
                conditions = []
                params = []
                param_count = 0
                
                if user_id:
                    param_count += 1
                    conditions.append(f"user_id = ${param_count}")
                    params.append(user_id)
                
                if event_type:
                    param_count += 1
                    conditions.append(f"event_type = ${param_count}")
                    params.append(event_type)
                
                if start_date:
                    param_count += 1
                    conditions.append(f"created_at >= ${param_count}")
                    params.append(start_date)
                
                if end_date:
                    param_count += 1
                    conditions.append(f"created_at <= ${param_count}")
                    params.append(end_date)
                
                param_count += 1
                params.append(limit)
                
                where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
                
                query = f"""
                    SELECT * FROM audit_logs
                    {where_clause}
                    ORDER BY created_at DESC
                    LIMIT ${param_count}
                """
                
                rows = await conn.fetch(query, *params)
                return [dict(row) for row in rows]
                
        except Exception as e:
            print(f"감사 로그 조회 실패: {str(e)}")
            return []