# Backend - FastAPI 서버

> AI CCTV 수위 모니터링 시스템의 백엔드 API 서버

## 🚀 빠른 시작

### 설치 및 실행

```bash
# 의존성 설치
pip install -r requirements.txt

# 개발 서버 실행 (로컬만)
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# 네트워크 접근 가능
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 환경 설정

`.env` 파일 생성:
```env
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
ALLOWED_ORIGINS=["http://localhost:3000", "http://172.30.1.25:3000"]
```

## 🏗️ 프로젝트 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 애플리케이션 진입점
│   ├── config.py            # 설정 관리
│   ├── database.py          # 데이터베이스 연결
│   ├── dependencies.py      # 의존성 주입
│   │
│   ├── routers/             # API 라우터
│   │   ├── __init__.py
│   │   ├── auth.py          # 인증 관련 API
│   │   ├── flow.py          # 수위 데이터 API
│   │   └── websocket.py     # WebSocket 연결
│   │
│   ├── services/            # 비즈니스 로직
│   │   ├── __init__.py
│   │   ├── auth_service.py  # 인증 서비스
│   │   └── flow_service.py  # 수위 데이터 서비스
│   │
│   ├── models/              # 데이터 모델
│   │   ├── __init__.py
│   │   └── auth.py          # 인증 관련 모델
│   │
│   └── utils/               # 유틸리티
│       ├── __init__.py
│       └── auth_utils.py    # 인증 유틸리티
│
├── requirements.txt         # Python 의존성
├── .env.example            # 환경 변수 예시
└── README.md               # 이 파일
```

## 📊 데이터베이스 스키마

### 테이블 생성

```sql
-- 사용자 테이블
CREATE TABLE users (
    user_uid BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL,
    user_pwd VARCHAR(255) NOT NULL,
    user_name VARCHAR(50),
    user_level INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 하천 정보 테이블
CREATE TABLE flow_info (
    flow_uid BIGSERIAL PRIMARY KEY,
    flow_name VARCHAR(15),
    flow_latitude DOUBLE PRECISION NOT NULL,
    flow_longitude DOUBLE PRECISION NOT NULL,
    flow_region VARCHAR(5),
    flow_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 실시간 데이터 테이블
CREATE TABLE flow_detail_info (
    id BIGSERIAL PRIMARY KEY,
    flow_uid BIGINT REFERENCES flow_info(flow_uid),
    flow_rate DECIMAL(10,2),      -- 유속 (cm/s * 10)
    flow_flux DECIMAL(10,2),      -- 유량 (m³/s)
    flow_waterlevel DECIMAL(10,2), -- 수위 (cm)
    flow_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(flow_uid, flow_time)
);

-- 알람 테이블
CREATE TABLE alert_info (
    alert_uid BIGSERIAL PRIMARY KEY,
    flow_uid BIGINT REFERENCES flow_info(flow_uid),
    alert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_message TEXT,
    alert_type VARCHAR(10) -- '주의', '경계', '긴급', '정상'
);
```

### 샘플 데이터

```sql
-- 테스트 사용자 생성 (비밀번호: admin123)
INSERT INTO users (user_id, user_pwd, user_name, user_level) 
VALUES ('admin', '$2b$12$hash...', '관리자', 1);

-- 하천 정보 등록
INSERT INTO flow_info (flow_name, flow_latitude, flow_longitude, flow_region, flow_address)
VALUES ('영오지하차도', 35.923508, 128.519230, '칠곡', '경북 칠곡군 지천면 영오리 894');
```

## 📡 API 문서

### 인증 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/login` | 사용자 로그인 |

**로그인 요청:**
```json
{
  "username": "admin",
  "password": "admin123",
  "rememberMe": false
}
```

**로그인 응답:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user_info": {
    "user_id": "admin",
    "user_name": "관리자",
    "user_level": 1
  }
}
```

### 데이터 API

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| GET | `/api/realtime/{location_id}` | 실시간 데이터 | ✅ |
| GET | `/api/timeseries/{location_id}` | 시계열 데이터 | ✅ |
| GET | `/api/alerts` | 알람 목록 | ✅ |
| GET | `/api/info` | 하천 정보 | ✅ |
| GET | `/api/status` | 시스템 상태 | ✅ |
| GET | `/api/health` | 서버 상태 | ❌ |

**실시간 데이터 응답:**
```json
{
  "flow_rate": 1.5,        // 유속 (m/s)
  "flow_flux": 0.8,        // 유량 (m³/s)
  "flow_waterlevel": 8.2,  // 수위 (cm)
  "flow_time": "2025-01-15T10:30:00",
  "status": "success"
}
```

### WebSocket API

| Endpoint | 설명 |
|----------|------|
| `WS /api/ws` | 실시간 데이터 스트림 |

**WebSocket 메시지 형식:**
```json
{
  "type": "alert_update",
  "alert_type": "alert_added",
  "data": {
    "id": "AL-001",
    "ts": "10:30",
    "level": "WARNING",
    "message": "수위 임계값 초과",
    "location": "중앙"
  },
  "timestamp": "2025-01-15T10:30:00"
}
```

## 🔒 보안

### 인증 방식
- **JWT 토큰**: 무상태 인증
- **bcrypt 해싱**: 비밀번호 암호화 (Salt 자동 생성)
- **토큰 만료**: 30분 (rememberMe 시 30일)

### CORS 설정
```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://172.30.1.25:3000",
    # 프로덕션 도메인 추가
]
```

### 권한 관리
- **인증 필수**: 모든 데이터 API
- **공개 접근**: 헬스 체크 API
- **Bearer 토큰**: Authorization 헤더 필요

## 🌐 WebSocket 실시간 통신

### 연결 관리
- **자동 재연결**: 클라이언트 측에서 구현
- **Keep-alive**: 30초 간격 ping/pong
- **멀티 클라이언트**: 동시 접속 지원

### 메시지 타입
- `alert_update`: 알람 추가/삭제 시 브로드캐스트
- `system_status`: 시스템 상태 변경 시

## 🚀 배포

### 개발 환경
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 프로덕션 환경
```bash
# Gunicorn 사용 권장
pip install gunicorn uvloop
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```

### Docker 배포
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

## 🔧 개발 도구

### 의존성 관리
```bash
# 새 의존성 추가 후
pip freeze > requirements.txt
```

### API 문서 자동 생성
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

### 디버깅
```python
# main.py에서 로그 레벨 설정
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🧪 테스트

### 단위 테스트
```bash
pytest tests/ -v
```

### API 테스트 (curl)
```bash
# 로그인
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 실시간 데이터
curl -X GET "http://localhost:8001/api/realtime/center" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📞 문의

- **개발팀**: 010-2863-6901
- **API 이슈**: 백엔드 관련 문제
- **데이터베이스**: 스키마 및 쿼리 최적화

---

**FastAPI Backend - AI CCTV 수위 모니터링 시스템**