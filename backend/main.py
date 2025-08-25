from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import asyncpg
import bcrypt
import jwt
from datetime import datetime, timedelta
import os
from contextlib import asynccontextmanager

# 환경 변수 설정
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mac@localhost/postgres")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Pydantic 모델들
class LoginRequest(BaseModel):
    username: str
    password: str
    rememberMe: bool = False

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_info: dict

class UserInfo(BaseModel):
    user_uid: int
    user_id: str
    user_name: str
    user_level: int

class RealtimeData(BaseModel):
    waterLevel: List[dict]
    flowVelocity: List[dict]
    discharge: List[dict]

class AlertData(BaseModel):
    alerts: List[dict]

# 데이터베이스 연결 풀
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    # 시작 시 데이터베이스 연결 풀 생성
    db_pool = await asyncpg.create_pool(DATABASE_URL)
    yield
    # 종료 시 연결 풀 닫기
    await db_pool.close()

app = FastAPI(
    title="AI CCTV 수위 모니터링 API",
    description="소하천 실시간 모니터링 시스템 백엔드 API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT 토큰 보안 설정
security = HTTPBearer()

# 유틸리티 함수들
def hash_password(password: str) -> str:
    """비밀번호 해시화"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWT 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """JWT 토큰에서 현재 사용자 정보 추출"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# API 엔드포인트들

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """사용자 로그인"""
    async with db_pool.acquire() as conn:
        # 사용자 정보 조회
        user_row = await conn.fetchrow(
            "SELECT user_uid, user_id, user_pwd, user_name, user_level FROM users WHERE user_id = $1",
            login_data.username
        )

        if not user_row:
            raise HTTPException(status_code=401, detail=f'사용자명 또는 비밀번호가 올바르지 않습니다.')

        # 비밀번호 검증
        if not verify_password(login_data.password, user_row['user_pwd']):
            raise HTTPException(status_code=401, detail="사용자명 또는 비밀번호가 올바르지 않습니다.")

        # JWT 토큰 생성
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        if login_data.rememberMe:
            access_token_expires = timedelta(days=30)  # 30일

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

@app.get("/api/auth/verify")
async def verify_token(current_user: str = Depends(get_current_user)):
    """토큰 검증"""
    return {"valid": True, "user_id": current_user}

@app.get("/api/realtime/{location_id}")
async def get_realtime_data(location_id: str, current_user: str = Depends(get_current_user)):
    """실시간 데이터 조회"""
    async with db_pool.acquire() as conn:
        # 위치 ID를 flow_uid로 매핑 (실제 구현에서는 더 정교한 매핑 필요)
        location_mapping = {
            'entrance': 1,
            'center': 2,
            'exit': 3
        }

        flow_uid = location_mapping.get(location_id, 2)  # 기본값은 center

        # 최근 1시간 데이터 조회
        data = await conn.fetch("""
            SELECT 
                flow_waterlevel,
                flow_rate,
                flow_flux,
                flow_time
            FROM flow_detail_info 
            WHERE flow_uid = $1 
                AND flow_time >= NOW() - INTERVAL '1 hour'
            ORDER BY flow_time DESC
            LIMIT 20
        """, flow_uid)

        if not data:
            # 데이터가 없을 경우 샘플 데이터 반환
            return {
                "waterLevel": [
                    {"t": "09:00", "h": 7.2, "timestamp": "2025-08-21T09:00:00+09:00"},
                    {"t": "09:05", "h": 7.8, "timestamp": "2025-08-21T09:05:00+09:00"},
                    {"t": "09:10", "h": 8.3, "timestamp": "2025-08-21T09:10:00+09:00"},
                    {"t": "09:15", "h": 9.0, "timestamp": "2025-08-21T09:15:00+09:00"},
                    {"t": "09:20", "h": 9.5, "timestamp": "2025-08-21T09:20:00+09:00"}
                ],
                "flowVelocity": [
                    {"t": "09:00", "v": 0.6},
                    {"t": "09:05", "v": 0.7},
                    {"t": "09:10", "v": 0.9},
                    {"t": "09:15", "v": 1.1},
                    {"t": "09:20", "v": 1.3}
                ],
                "discharge": [
                    {"t": "09:00", "q": 12},
                    {"t": "09:05", "q": 14},
                    {"t": "09:10", "q": 16},
                    {"t": "09:15", "q": 18},
                    {"t": "09:20", "q": 21}
                ]
            }

        # 실제 데이터를 프론트엔드 형식으로 변환
        water_level = []
        flow_velocity = []
        discharge = []

        for row in reversed(data):  # 시간 순서로 정렬
            time_str = row['flow_time'].strftime('%H:%M')
            timestamp = row['flow_time'].isoformat()

            water_level.append({
                "t": time_str,
                "h": float(row['flow_waterlevel']),
                "timestamp": timestamp
            })

            flow_velocity.append({
                "t": time_str,
                "v": float(row['flow_rate']) / 100  # cm/s를 m/s로 변환
            })

            discharge.append({
                "t": time_str,
                "q": float(row['flow_flux'])
            })

        return {
            "waterLevel": water_level,
            "flowVelocity": flow_velocity,
            "discharge": discharge
        }

@app.get("/api/timeseries/{location_id}")
async def get_timeseries_data(
        location_id: str,
        range_param: str = "1h",
        current_user: str = Depends(get_current_user)
):
    """시계열 데이터 조회"""
    # 실시간 데이터와 동일한 로직 사용
    return await get_realtime_data(location_id, current_user)

@app.get("/api/alerts", response_model=AlertData)
async def get_alerts(current_user: str = Depends(get_current_user)):
    """알림 목록 조회"""
    async with db_pool.acquire() as conn:
        alerts = await conn.fetch("""
            SELECT 
                a.alert_uid,
                a.alert_date,
                a.alert_type,
                a.alert_message,
                f.flow_name
            FROM alert_info a
            JOIN flow_info f ON a.flow_uid = f.flow_uid
            WHERE a.alert_date >= NOW() - INTERVAL '24 hours'
            ORDER BY a.alert_date DESC
            LIMIT 10
        """)

        if not alerts:
            # 샘플 알림 데이터
            return AlertData(alerts=[
                {
                    "id": "AL-001",
                    "ts": "09:20",
                    "level": "CRITICAL",
                    "message": "수위 급상승 감지 (15cm 임계치 접근)",
                    "location": "중앙"
                },
                {
                    "id": "AL-002",
                    "ts": "09:18",
                    "level": "WARNING",
                    "message": "유속 증가 (1.3 m/s)",
                    "location": "중앙"
                },
                {
                    "id": "AL-003",
                    "ts": "09:15",
                    "level": "INFO",
                    "message": "AI 분석 완료 - 차량 2대 감지",
                    "location": "입구"
                }
            ])

        alert_list = []
        for alert in alerts:
            alert_list.append({
                "id": f"AL-{alert['alert_uid']:03d}",
                "ts": alert['alert_date'].strftime('%H:%M'),
                "level": alert['alert_type'].upper(),
                "message": alert['alert_message'],
                "location": alert['flow_name'] or "알 수 없음"
            })

        return AlertData(alerts=alert_list)

@app.get("/api/locations")
async def get_locations(current_user: str = Depends(get_current_user)):
    """모니터링 위치 목록 조회"""
    async with db_pool.acquire() as conn:
        locations = await conn.fetch("""
            SELECT 
                flow_uid,
                flow_name,
                flow_latitude,
                flow_longitude,
                flow_region
            FROM flow_info
            ORDER BY flow_uid
        """)

        location_list = []
        for loc in locations:
            location_list.append({
                "id": f"location_{loc['flow_uid']}",
                "name": loc['flow_name'],
                "status": "online",  # 실제로는 카메라 상태 확인 로직 필요
                "lat": float(loc['flow_latitude']),
                "lng": float(loc['flow_longitude']),
                "region": loc['flow_region']
            })

        return {"locations": location_list}

@app.get("/")
async def root():
    """서버 상태 확인"""
    return {
        "message": "AI CCTV 수위 모니터링 API 서버가 정상 작동 중입니다",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)