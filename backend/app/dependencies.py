from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.config import settings
from app.database import get_db_pool

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """JWT 토큰에서 현재 사용자 정보 추출"""
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        user_uid: int = payload.get("user_uid")
        
        if user_id is None or user_uid is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        # 데이터베이스에서 사용자 정보 조회
        db_pool = get_db_pool()
        async with db_pool.acquire() as conn:
            user_row = await conn.fetchrow(
                "SELECT user_uid, user_id, user_name, user_level FROM users WHERE user_uid = $1 AND user_id = $2",
                user_uid, user_id
            )
            
            if not user_row:
                raise HTTPException(status_code=401, detail="User not found")
            
            return {
                "user_uid": user_row['user_uid'],
                "user_id": user_row['user_id'],
                "user_name": user_row['user_name'],
                "user_level": user_row['user_level']
            }
            
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")