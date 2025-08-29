# AI CCTV 수위 모니터링 시스템

> 실시간 하천 수위 모니터링 및 AI CCTV 분석을 통한 홍수 예방 통합 시스템

## 🌊 프로젝트 개요

본 시스템은 소하천의 수위, 유속, 유량을 실시간으로 모니터링하고 AI CCTV 분석을 통해 홍수 위험을 조기에 감지하는 통합 대시보드입니다.

![시스템 아키텍처](./docs/architecture.png)

## 🏗️ 프로젝트 구조

```
📁 react/ (프로젝트 루트)
├── 📁 flow_dashboard/          # Frontend (React + PWA)
│   ├── 📁 src/
│   │   ├── 📁 components/      # React 컴포넌트
│   │   ├── 📁 services/        # API & WebSocket 서비스
│   │   └── 📁 utils/           # 유틸리티 함수
│   ├── 📁 public/              # 정적 파일 (PWA 설정)
│   └── 📄 README.md            # Frontend 상세 문서
│
├── 📁 backend/                 # Backend (FastAPI)
│   ├── 📁 app/
│   │   ├── 📁 routers/         # API 라우터
│   │   ├── 📁 services/        # 비즈니스 로직
│   │   └── 📁 models/          # 데이터 모델
│   └── 📄 README.md            # Backend 상세 문서
│
└── 📄 README.md                # 이 파일 (프로젝트 전체 개요)
```

## 🚀 빠른 시작

### 1️⃣ 전체 시스템 설정

**필수 요구사항:**
- Node.js (v16+)
- Python (v3.8+)
- PostgreSQL
- 카카오맵 API 키

### 2️⃣ Backend 실행
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
👉 **상세 설정**: [backend/README.md](./backend/README.md)

### 3️⃣ Frontend 실행
```bash
cd flow_dashboard
npm install
npm start
```
👉 **상세 설정**: [flow_dashboard/README.md](./flow_dashboard/README.md)

### 4️⃣ 접속
- **대시보드**: http://localhost:3000
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

## 📞 지원 및 문의

- **개발팀**: 010-2863-6901
- **이슈 리포팅**: GitHub Issues
- **문서**: 각 폴더의 README.md 참조

## 🤝 기여 가이드

1. Fork 생성
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📄 라이선스

이 프로젝트는 비공개 소프트웨어입니다. 모든 권리는 개발팀에게 있습니다.

---

**© 2025 AI CCTV 수위 모니터링 시스템. All rights reserved.**

**개발팀**: 010-2863-6901