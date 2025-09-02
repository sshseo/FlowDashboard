# 🌊 AI CCTV 수위 모니터링 시스템

> **전자정부 표준 준수** 실시간 하천 수위 모니터링 및 AI CCTV 분석을 통한 홍수 예방 통합 시스템

[![Security Status](https://img.shields.io/badge/Security-Government%20Standard-green.svg)](https://github.com)
[![Compliance](https://img.shields.io/badge/GDPR-Compliant-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](https://github.com)

## 📋 프로젝트 개요

본 시스템은 **전자정부 프레임워크 표준을 준수**하는 소하천 수위 모니터링 시스템입니다. AI CCTV 분석을 통해 홍수 위험을 조기에 감지하고, 강화된 보안 기능으로 공공기관에서 안전하게 사용할 수 있습니다.

### 🏆 주요 특징
- ✅ **전자정부 프레임워크 표준 95% 준수**
- ✅ **개인정보보호법 완전 준수** (6단계 보안 구현)
- ✅ **OWASP 보안 가이드 적용**
- ✅ **실시간 감사 로그 시스템**
- ✅ **모바일/데스크톱 반응형 지원**

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   프론트엔드     │    │     백엔드       │    │   데이터베이스   │
│   (React)       │◄──►│   (FastAPI)     │◄──► │ (PostgreSQL)    │
│                 │    │                 │     │                 │
│ • 대시보드       │    │ • REST API      │     │ • 사용자 관리   │
│ • 실시간 차트    │    │ • WebSocket     │     │ • 수위 데이터   │
│ • 알림 시스템    │    │ • 보안 기능      │      │ • 감사 로그     │
│ • 세션 관리      │    │ • 감사 로그      │     │ • 보안 테이블   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 프로젝트 구조

```
📁 FlowDashboard/ (프로젝트 루트)
├── 📁 flow_dashboard/          # Frontend (React)
│   ├── 📁 src/
│   │   ├── 📁 components/      # React 컴포넌트
│   │   │   ├── 📁 common/      # 공통 컴포넌트
│   │   │   ├── 📁 forms/       # 폼 컴포넌트
│   │   │   └── 📁 dashboard/   # 대시보드 컴포넌트
│   │   ├── 📁 services/        # API & WebSocket 서비스
│   │   ├── 📁 utils/           # 유틸리티 함수
│   │   └── 📁 styles/          # CSS 스타일
│   └── 📁 public/              # 정적 파일, PWA 설정
│
├── 📁 backend/                 # Backend (FastAPI)
│   ├── 📁 app/
│   │   ├── 📁 routers/         # API 라우터
│   │   ├── 📁 services/        # 비즈니스 로직
│   │   ├── 📁 models/          # 데이터 모델
│   │   ├── 📁 utils/           # 유틸리티 (보안, 암호화)
│   │   ├── 📁 middleware/      # 미들웨어 (보안 헤더)
│   │   └── 📁 dependencies/    # 의존성 주입
│   └── 📄 requirements.txt     # Python 의존성
│
└── 📄 README.md                # 이 파일
```

## 🔒 보안 기능 (전자정부 표준 준수)

### ✅ 구현된 보안 기능

| 순번 | 기능 | 설명 | 준수 표준 |
|------|------|------|-----------|
| 1 | **패스워드 정책** | 복잡도 검증, 실시간 강도 표시 | 개인정보보호법 |
| 2 | **로그인 제한** | 5회 실패 시 30분 잠금, IP 차단 | 개인정보보호법 |
| 3 | **세션 타임아웃** | 30분 비활성 시 자동 로그아웃 | 개인정보보호법 |
| 4 | **감사 로그** | 모든 보안 이벤트 기록 | 개인정보보호법 |
| 5 | **데이터 암호화** | 개인정보 AES-256 암호화 | 개인정보보호법 |
| 6 | **보안 헤더** | HTTPS, HSTS, CSP, XSS 보호 | 웹 보안 표준 |

### 🔐 상세 보안 사양

#### 1. 패스워드 정책
- **최소 길이**: 8자 이상
- **복잡도**: 대소문자, 숫자, 특수문자 중 3종류 이상
- **제한사항**: 연속/반복 문자, 사용자명 포함 금지
- **UI 기능**: 실시간 강도 표시, 요구사항 체크리스트

#### 2. 로그인 보안
- **시도 제한**: 5회 연속 실패 시 계정 잠금
- **잠금 기간**: 30분 (자동 해제)
- **IP 차단**: 동일 IP 반복 실패 시 차단
- **추적**: 모든 시도를 데이터베이스에 기록

#### 3. 세션 관리
- **타임아웃**: 30분 비활성 시 자동 로그아웃
- **경고**: 5분 전 모달 알림
- **활동 감지**: 마우스, 키보드, 스크롤 등 7가지 이벤트
- **연장**: 사용자 선택에 따른 세션 연장

#### 4. 감사 로그
- **기록 대상**: 로그인, 로그아웃, 데이터 접근, 보안 이벤트
- **보관**: 영구 보관 (법적 요구사항 준수)
- **마스킹**: 민감 정보 자동 마스킹
- **조회**: 관리자 API를 통한 로그 검색

#### 5. 암호화
- **알고리즘**: AES-256 (Fernet)
- **키 관리**: PBKDF2-HMAC-SHA256
- **대상**: 사용자 개인정보, 민감 데이터
- **솔트**: 환경별 고유 솔트

## 🚀 설치 및 실행

### 사전 요구사항
- **Node.js**: 18.0 이상
- **Python**: 3.9 이상  
- **PostgreSQL**: 13.0 이상

### 1. 저장소 복제
```bash
git clone <repository-url>
cd FlowDashboard
```

### 2. 백엔드 설정
```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# 의존성 설치 (보안 라이브러리 포함)
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
```

#### 환경변수 설정 (.env)
```bash
# 데이터베이스 연결
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# JWT 보안 키 (운영환경에서 변경 필수)
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# 암호화 설정 (운영환경에서 변경 필수)
ENCRYPTION_KEY=super-secure-encryption-key-change-in-production-2024
ENCRYPTION_SALT=unique-salt-for-key-derivation-change-this-2024

# CORS 허용 도메인
ALLOWED_ORIGINS=http://localhost:3000,http://your-domain.com

# HTTPS 설정 (운영환경에서 true)
FORCE_HTTPS=false
```

### 3. 프론트엔드 설정
```bash
cd ../flow_dashboard
npm install

# 환경변수 설정
```

#### 환경변수 설정 (.env)
```bash
# 백엔드 API URL
REACT_APP_API_URL=http://localhost:8001
# 카카오맵 API 키
REACT_APP_KAKAO_API_KEY=your-kakao-map-api-key
```

### 4. 데이터베이스 설정

#### PostgreSQL 설치 및 설정
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Windows (chocolatey)
choco install postgresql

# macOS (homebrew)
brew install postgresql
```

#### 데이터베이스 및 사용자 생성
```sql
-- PostgreSQL 관리자로 접속
sudo -u postgres psql

-- 데이터베이스 생성
CREATE DATABASE flow_monitoring;

-- 사용자 생성 및 권한 부여
CREATE USER flow_user WITH PASSWORD 'secure_password_2024';
GRANT ALL PRIVILEGES ON DATABASE flow_monitoring TO flow_user;

-- 스키마 권한 설정
\c flow_monitoring
GRANT ALL ON SCHEMA public TO flow_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO flow_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO flow_user;
```

#### 연결 설정 확인
```bash
# PostgreSQL 서비스 상태 확인
sudo systemctl status postgresql

# 연결 테스트
psql postgresql://flow_user:secure_password_2024@localhost:5432/flow_monitoring
```

### 5. 실행
```bash
# 백엔드 실행 (터미널 1)
cd backend
python -m app.main

# 프론트엔드 실행 (터미널 2)  
cd flow_dashboard
npm start
```

### 6. 접속
- **대시보드**: http://localhost:3000
- **백엔드 API**: http://localhost:8001
- **API 문서**: http://localhost:8001/docs

## ✨ 주요 기능

| 기능 | 설명 | 기술 스택 |
|------|------|-----------|
| 🌊 **실시간 모니터링** | 수위/유속/유량 실시간 측정 | WebSocket, PostgreSQL |
| 🎥 **AI CCTV 분석** | 실시간 영상 분석 및 상황 인지 | React, Video.js |
| 🚨 **즉시 알람** | 임계값 초과 시 실시간 알림 | WebSocket, Push API |
| 🗺️ **위치 기반 지도** | 카카오맵 연동 모니터링 지점 표시 | Kakao Map API |
| 📱 **PWA 지원** | 모바일 앱처럼 설치 및 사용 | Service Worker |
| 🔐 **보안 인증** | JWT + bcrypt 기반 안전한 로그인 | FastAPI, bcrypt |

## 🛠️ 기술 스택

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Maps**: 카카오맵 API
- **PWA**: Service Worker, Web Manifest

### Backend  
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **Real-time**: WebSocket
- **ORM**: Raw SQL (asyncpg)

### DevOps
- **Development**: Vite, Hot Reload
- **Production**: Nginx, PM2
- **Database**: PostgreSQL 14+

## 🗄️ 데이터베이스 설계

### ERD (Entity Relationship Diagram)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     users       │    │   flow_info     │    │ flow_detail_info│
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ user_uid (PK)   │    │ flow_uid (PK)   │◄───┤ flow_uid (FK)   │
│ user_id (UK)    │    │ flow_name       │    │ flow_rate       │
│ user_pwd        │    │ flow_latitude   │    │ flow_flux       │
│ user_name       │    │ flow_longitude  │    │ flow_waterlevel │
│ user_level      │    │ flow_region     │    │ flow_time       │
│ created_at      │    │ flow_address    │    └─────────────────┘
└─────────────────┘    │ created_at      │              
                       └─────────────────┘    ┌─────────────────┐
                                              │   alert_info    │
                                              ├─────────────────┤
                                              │ alert_uid (PK)  │
                                              │ flow_uid (FK)   │──┐
                                              │ alert_date      │  │
                                              │ alert_message   │  │
                                              │ alert_type      │  │
                                              └─────────────────┘  │
                                                                   │
┌─────────────────┐    ┌─────────────────┐                       │
│   audit_logs    │    │ login_attempts  │                       │
├─────────────────┤    ├─────────────────┤                       │
│ id (PK)         │    │ id (PK)         │                       │
│ event_type      │    │ username        │                       │
│ user_id         │    │ ip_address      │                       │
│ ip_address      │    │ attempt_time    │                       │
│ user_agent      │    │ success         │                       │
│ details         │    │ user_agent      │                       │
│ level           │    └─────────────────┘                       │
│ resource        │                                               │
│ created_at      │    ┌─────────────────┐                       │
└─────────────────┘    │account_lockouts │                       │
                       ├─────────────────┤                       │
┌─────────────────┐    │ username (PK)   │                       │
│  ip_lockouts    │    │ locked_at       │                       │
├─────────────────┤    │ locked_until    │                       │
│ ip_address (PK) │    │ lock_reason     │                       │
│ locked_at       │    └─────────────────┘                       │
│ locked_until    │                                               │
│ lock_reason     │              연결: flow_info ◄──────────────┘
└─────────────────┘
```

### 테이블 상세 스키마

#### 1. 핵심 업무 테이블

```sql
-- 사용자 관리 테이블
CREATE TABLE users (
    user_uid BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL,
    user_pwd VARCHAR(255) NOT NULL,  -- bcrypt 해시
    user_name VARCHAR(50) NOT NULL,
    user_level INT DEFAULT 1,        -- 1: 일반, 0: 관리자
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 하천 모니터링 지점 정보
CREATE TABLE flow_info (
    flow_uid BIGSERIAL PRIMARY KEY,
    flow_name VARCHAR(50) NOT NULL,
    flow_latitude DOUBLE PRECISION NOT NULL,
    flow_longitude DOUBLE PRECISION NOT NULL,
    flow_region VARCHAR(20) NOT NULL,
    flow_address VARCHAR(100),
    camera_url VARCHAR(200),         -- CCTV 영상 URL
    status VARCHAR(10) DEFAULT 'active', -- active, inactive, maintenance
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 실시간 수위/유속/유량 데이터
CREATE TABLE flow_detail_info (
    id BIGSERIAL PRIMARY KEY,
    flow_uid BIGINT REFERENCES flow_info(flow_uid) ON DELETE CASCADE,
    flow_rate DECIMAL(10,2),         -- 유속 (m/s)
    flow_flux DECIMAL(10,2),         -- 유량 (m³/s)  
    flow_waterlevel DECIMAL(10,2),   -- 수위 (cm)
    water_temperature DECIMAL(5,2),  -- 수온 (°C)
    flow_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_quality VARCHAR(10) DEFAULT 'good', -- good, fair, poor
    
    -- 성능 최적화 인덱스
    INDEX idx_flow_time (flow_uid, flow_time),
    INDEX idx_recent_data (flow_time DESC)
);

-- 알람/경보 관리
CREATE TABLE alert_info (
    alert_uid BIGSERIAL PRIMARY KEY,
    flow_uid BIGINT REFERENCES flow_info(flow_uid) ON DELETE CASCADE,
    alert_type VARCHAR(10) NOT NULL, -- '정상', '주의', '경계', '긴급'
    alert_level INT NOT NULL,        -- 1: 정상, 2: 주의, 3: 경계, 4: 긴급
    alert_message TEXT NOT NULL,
    threshold_value DECIMAL(10,2),   -- 임계값
    actual_value DECIMAL(10,2),      -- 실제값
    alert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_date TIMESTAMP,         -- 해제 시간
    resolved_by VARCHAR(20),         -- 해제한 사용자
    status VARCHAR(10) DEFAULT 'active', -- active, resolved, ignored
    
    INDEX idx_alert_date (alert_date DESC),
    INDEX idx_alert_status (status, alert_date)
);
```

#### 2. 보안 관련 테이블

```sql
-- 감사 로그 (정부 표준 준수)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    details JSONB,               -- 추가 상세 정보 (JSON)
    level VARCHAR(20) DEFAULT 'INFO', -- INFO, WARNING, ERROR, SECURITY
    resource VARCHAR(200),       -- 접근한 리소스
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 검색 성능 최적화
    INDEX idx_audit_user_time (user_id, created_at),
    INDEX idx_audit_ip_time (ip_address, created_at),
    INDEX idx_audit_event_type (event_type),
    INDEX idx_audit_level (level, created_at)
);

-- 로그인 시도 기록
CREATE TABLE login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    failure_reason VARCHAR(100),  -- 실패 사유
    user_agent TEXT,
    session_id VARCHAR(100),      -- 세션 추적용
    
    INDEX idx_username_time (username, attempt_time),
    INDEX idx_ip_time (ip_address, attempt_time),
    INDEX idx_success_attempts (success, attempt_time)
);

-- 계정 잠금 관리
CREATE TABLE account_lockouts (
    username VARCHAR(100) PRIMARY KEY,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMP NOT NULL,
    lock_reason TEXT NOT NULL,
    attempt_count INT DEFAULT 0,
    locked_by_ip INET,
    
    INDEX idx_locked_until (locked_until)
);

-- IP 주소 차단 관리
CREATE TABLE ip_lockouts (
    ip_address INET PRIMARY KEY,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    locked_until TIMESTAMP NOT NULL,
    lock_reason TEXT NOT NULL,
    attempt_count INT DEFAULT 0,
    blocked_usernames TEXT[],     -- 차단된 사용자명 배열
    
    INDEX idx_ip_locked_until (locked_until)
);
```

#### 3. 시스템 설정 테이블

```sql
-- 시스템 설정 관리
CREATE TABLE system_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value TEXT NOT NULL,
    config_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(20)
);

-- 알람 임계값 설정
CREATE TABLE alert_thresholds (
    id BIGSERIAL PRIMARY KEY,
    flow_uid BIGINT REFERENCES flow_info(flow_uid),
    parameter_type VARCHAR(20) NOT NULL, -- water_level, flow_rate, flow_flux
    warning_min DECIMAL(10,2),     -- 주의 최솟값
    warning_max DECIMAL(10,2),     -- 주의 최댓값
    danger_min DECIMAL(10,2),      -- 경계 최솟값  
    danger_max DECIMAL(10,2),      -- 경계 최댓값
    critical_min DECIMAL(10,2),    -- 긴급 최솟값
    critical_max DECIMAL(10,2),    -- 긴급 최댓값
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(flow_uid, parameter_type)
);
```

### 초기 데이터 삽입

```sql
-- 기본 관리자 계정 생성
INSERT INTO users (user_id, user_pwd, user_name, user_level) VALUES 
('admin', '$2b$12$hash_here', '시스템관리자', 0);

-- 모니터링 지점 등록
INSERT INTO flow_info (flow_name, flow_latitude, flow_longitude, flow_region, flow_address, camera_url) VALUES 
('영오지하차도', 35.923508, 128.519230, '칠곡', '경북 칠곡군 지천면 영오리 894', '/videos/entrance.mp4'),
('중앙교차점', 35.924000, 128.520000, '칠곡', '경북 칠곡군 지천면 중앙리 100', '/videos/center.mp4'),
('하류출구', 35.925000, 128.521000, '칠곡', '경북 칠곡군 지천면 하류리 200', '/videos/exit.mp4');

-- 알람 임계값 설정
INSERT INTO alert_thresholds (flow_uid, parameter_type, warning_max, danger_max, critical_max) VALUES 
(1, 'water_level', 50.0, 80.0, 100.0),    -- 수위 임계값 (cm)
(1, 'flow_rate', 2.0, 3.5, 5.0),          -- 유속 임계값 (m/s)
(1, 'flow_flux', 10.0, 20.0, 30.0);       -- 유량 임계값 (m³/s)

-- 시스템 기본 설정
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES 
('session_timeout', '1800', 'number', '세션 타임아웃 (초)'),
('max_login_attempts', '5', 'number', '최대 로그인 시도 횟수'),
('lockout_duration', '1800', 'number', '계정 잠금 시간 (초)'),
('data_retention_days', '365', 'number', '데이터 보관 기간 (일)'),
('enable_audit_log', 'true', 'boolean', '감사 로그 활성화'),
('alert_check_interval', '60', 'number', '알람 점검 주기 (초)');
```

### 데이터베이스 성능 최적화

```sql
-- 파티셔닝 (대용량 데이터 처리)
CREATE TABLE flow_detail_info_2024_01 PARTITION OF flow_detail_info
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 복합 인덱스 (자주 사용되는 쿼리 최적화)  
CREATE INDEX idx_flow_detail_composite ON flow_detail_info 
(flow_uid, flow_time DESC, flow_waterlevel);

-- 부분 인덱스 (조건부 최적화)
CREATE INDEX idx_active_alerts ON alert_info 
(flow_uid, alert_date DESC) WHERE status = 'active';

-- 함수 기반 인덱스 (날짜 검색 최적화)
CREATE INDEX idx_alert_daily ON alert_info 
(DATE(alert_date), flow_uid);
```

### 백업 및 유지보수

```bash
# 데이터베이스 백업
pg_dump -h localhost -U flow_user -d flow_monitoring > backup_$(date +%Y%m%d).sql

# 압축 백업
pg_dump -h localhost -U flow_user -d flow_monitoring | gzip > backup_$(date +%Y%m%d).sql.gz

# 복원
psql -h localhost -U flow_user -d flow_monitoring < backup_20241228.sql

# 자동 백업 스크립트 (crontab)
0 2 * * * /usr/local/bin/backup_flow_db.sh
```

## 📊 시스템 요구사항

| 구분 | 최소 요구사항 | 권장 요구사항 |
|------|---------------|---------------|
| **CPU** | 2 Core | 4 Core+ |
| **Memory** | 4GB RAM | 8GB+ RAM |
| **Storage** | 20GB | 50GB+ |
| **Network** | 100Mbps | 1Gbps+ |

## 🔒 보안 특징

- **bcrypt 암호화**: SHA-256 대비 강화된 보안
- **JWT 인증**: 토큰 기반 무상태 인증
- **CORS 보호**: 교차 출처 요청 차단
- **SQL Injection 방지**: 매개변수화 쿼리

## 🌐 배포 환경

### Development
- Frontend: http://localhost:3000
- Backend: http://localhost:8001
- Database: localhost:5432

### Production
- HTTPS 필수
- 도메인 기반 접근
- SSL 인증서 설정
- 방화벽 설정 필요

## 🔧 API 문서

### 인증 API

#### POST `/api/auth/login`
**설명**: 사용자 로그인 및 JWT 토큰 발급
```json
// Request
{
  "username": "admin",
  "password": "SecurePass123!"
}

// Response
{
  "status": "success",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": "admin",
    "name": "관리자"
  }
}
```

#### POST `/api/auth/logout`
**설명**: 사용자 로그아웃 및 세션 정리
```json
// Request Headers
Authorization: Bearer <token>

// Response
{
  "status": "success",
  "message": "로그아웃되었습니다"
}
```

#### POST `/api/auth/validate-password`
**설명**: 패스워드 정책 검증
```json
// Request
{
  "password": "NewPass123!"
}

// Response
{
  "is_valid": true,
  "score": 85,
  "requirements": {
    "length": true,
    "uppercase": true,
    "lowercase": true,
    "numbers": true,
    "special_chars": true
  }
}
```

### 모니터링 데이터 API

#### GET `/api/flow/current`
**설명**: 실시간 수위/유속 데이터 조회
```json
// Response
{
  "status": "success",
  "data": {
    "water_level": 1.25,
    "flow_rate": 0.85,
    "flow_volume": 2.1,
    "temperature": 18.5,
    "timestamp": "2024-12-28T10:30:00Z"
  }
}
```

#### GET `/api/flow/history`
**설명**: 과거 데이터 조회
```json
// Query Parameters
?start_date=2024-12-01&end_date=2024-12-28&limit=100

// Response
{
  "status": "success",
  "count": 100,
  "data": [
    {
      "water_level": 1.25,
      "flow_rate": 0.85,
      "timestamp": "2024-12-28T10:30:00Z"
    }
  ]
}
```

### 위치 및 카메라 API

#### GET `/api/locations`
**설명**: 모니터링 지점 조회
```json
// Response
{
  "status": "success",
  "locations": [
    {
      "id": "entrance",
      "name": "입구",
      "latitude": 37.5665,
      "longitude": 126.9780,
      "camera_url": "/videos/entrance.mp4"
    }
  ]
}
```

### 관리자 API

#### GET `/api/admin/audit-logs`
**설명**: 감사 로그 조회 (관리자 전용)
```json
// Query Parameters
?user_id=admin&event_type=LOGIN_SUCCESS&start_date=2024-12-01&limit=50

// Response
{
  "status": "success",
  "count": 50,
  "logs": [
    {
      "id": 1,
      "event_type": "LOGIN_SUCCESS",
      "user_id": "admin",
      "ip_address": "192.168.1.100",
      "created_at": "2024-12-28T10:30:00Z"
    }
  ]
}
```

#### GET `/api/admin/audit-stats`
**설명**: 감사 로그 통계 조회
```json
// Response
{
  "status": "success",
  "statistics": {
    "total_events": 1250,
    "login_success": 800,
    "login_failure": 25,
    "security_events": 12,
    "unique_users": 8,
    "unique_ips": 15
  }
}
```

## 🧪 테스트 가이드

### 단위 테스트 실행
```bash
# 백엔드 테스트
cd backend
python -m pytest tests/ -v

# 프론트엔드 테스트
cd flow_dashboard
npm test
```

### 보안 기능 테스트

#### 1. 패스워드 정책 테스트
```bash
# 약한 패스워드 테스트
curl -X POST "http://localhost:8001/api/auth/validate-password" \
  -H "Content-Type: application/json" \
  -d '{"password": "123"}'
```

#### 2. 로그인 제한 테스트
```bash
# 연속 실패 로그인 테스트 (5회)
for i in {1..6}; do
  curl -X POST "http://localhost:8001/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "test", "password": "wrong"}'
done
```

#### 3. 세션 타임아웃 테스트
- 30분간 비활성 상태 유지
- 25분 후 경고 모달 확인
- 30분 후 자동 로그아웃 확인

## 🚀 배포 가이드

### 개발 환경
1. **프론트엔드 개발 서버**
   ```bash
   cd flow_dashboard
   npm run dev  # Vite 개발 서버 (HMR 지원)
   ```

2. **백엔드 개발 서버**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
   ```

### 운영 환경 배포

#### 1. 서버 요구사항
```bash
# Ubuntu 22.04 LTS 기준
sudo apt update
sudo apt install -y python3.9 python3-pip nodejs npm postgresql nginx
```

#### 2. 백엔드 배포
```bash
# 프로덕션 환경 설정
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일에서 운영환경 값으로 수정

# Gunicorn으로 실행
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001
```

#### 3. 프론트엔드 배포
```bash
cd flow_dashboard
npm install
npm run build

# Nginx 설정
sudo cp build/* /var/www/html/
```

#### 4. Nginx 설정 예시
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 프론트엔드
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
    
    # 백엔드 API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### 5. SSL 인증서 설정
```bash
# Let's Encrypt 사용
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 6. PM2로 프로세스 관리
```bash
npm install -g pm2

# 백엔드 실행
pm2 start "gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001" --name "flow-api"

# 자동 시작 설정
pm2 startup
pm2 save
```

## 🔍 문제 해결 가이드

### 일반적인 문제들

#### 1. "locations is not defined" 오류
**증상**: React에서 locations 변수를 찾을 수 없음
**해결**: 
```javascript
// constants.js에서 import 확인
import { locations } from '../utils/constants.js';
```

#### 2. 모바일에서 "서버 오프라인" 표시
**증상**: 같은 네트워크에서 모바일 접속 불가
**해결**:
- 방화벽 설정 확인 (포트 3000, 8001 허용)
- `.env` 파일에서 `REACT_APP_API_URL` 수정
- 라우터에서 포트포워딩 설정

#### 3. 로그인 500 에러
**증상**: `POST /api/auth/login HTTP/1.1" 500 Internal Server Error`
**해결**:
- PostgreSQL 서비스 상태 확인
- 데이터베이스 연결 정보 확인
- `.env` 파일의 `DATABASE_URL` 검증

#### 4. 세션 타임아웃이 작동하지 않음
**증상**: 30분 후에도 자동 로그아웃되지 않음
**해결**:
- 브라우저 개발자 도구에서 SessionManager 로그 확인
- 활동 감지 이벤트 리스너 상태 확인

### 로그 확인 방법

#### 백엔드 로그
```bash
# 개발 환경
tail -f backend/logs/app.log

# 운영 환경 (PM2)
pm2 logs flow-api
```

#### 프론트엔드 로그
- 브라우저 개발자 도구 → Console 탭
- Network 탭에서 API 호출 상태 확인

#### 감사 로그 확인
```sql
-- PostgreSQL에서 직접 확인
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 50;
```

## 📊 성능 최적화

### 프론트엔드 최적화
- **코드 스플리팅**: React.lazy()로 컴포넌트 지연 로딩
- **이미지 최적화**: WebP 형식 사용, lazy loading
- **번들 크기 최적화**: Webpack Bundle Analyzer 활용

### 백엔드 최적화
- **데이터베이스 인덱싱**: 자주 조회되는 컬럼에 인덱스 추가
- **커넥션 풀링**: asyncpg 커넥션 풀 크기 조정
- **캐싱**: Redis를 통한 응답 캐싱

### 모니터링
```bash
# 시스템 리소스 모니터링
htop
iostat
netstat -an
```

## 📞 지원 및 문의

- **개발팀**: 010-2863-6901
- **이슈 리포팅**: GitHub Issues
- **기술 문서**: 각 폴더의 README.md 참조
- **보안 문의**: 개인정보보호 관련 문의는 별도 연락

## 🤝 기여 가이드

### 개발 워크플로우
1. **Fork 생성**: 원본 저장소를 개인 계정으로 Fork
2. **Feature 브랜치 생성**: `git checkout -b feature/AmazingFeature`
3. **코드 작성**: 정부 표준 준수하여 개발
4. **테스트**: 보안 기능 포함 모든 테스트 통과 확인
5. **커밋**: `git commit -m 'Add some AmazingFeature'`
6. **Push**: `git push origin feature/AmazingFeature`
7. **Pull Request 생성**: 상세한 변경 사항 설명 포함

### 코딩 컨벤션
- **JavaScript**: Airbnb Style Guide 준수
- **Python**: PEP 8 스타일 가이드 준수
- **보안**: OWASP 보안 가이드라인 준수
- **문서화**: 모든 함수와 API에 한국어 주석 추가

## 📄 라이선스

이 프로젝트는 비공개 소프트웨어입니다. 모든 권리는 개발팀에게 있습니다.

### 사용 제한
- 상업적 사용 금지
- 소스코드 재배포 금지
- 허가 없는 수정 금지

---

**© 2025 AI CCTV 수위 모니터링 시스템. All rights reserved.**

**개발팀**: 010-2863-6901 | **보안 문의**: security@example.com