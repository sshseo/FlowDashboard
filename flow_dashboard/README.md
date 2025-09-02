# 🌊 Frontend - React 대시보드

> **전자정부 표준 준수** AI CCTV 수위 모니터링 시스템의 프론트엔드 대시보드 (React + PWA + 보안 강화)

[![Security](https://img.shields.io/badge/Security-Government%20Standard-green.svg)](https://github.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blue.svg)](https://github.com)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://github.com)

## 🚀 빠른 시작

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm start

# 프로덕션 빌드
npm run build

# 프리뷰 서버
npm run preview
```

### 환경 설정

`.env` 파일 생성:
```env
REACT_APP_API_URL=http://localhost:8001
REACT_APP_KAKAO_API_KEY=your-kakao-api-key
```

## 🏗️ 프로젝트 구조

```
src/
├── components/              # React 컴포넌트
│   ├── charts/             # 차트 컴포넌트
│   │   ├── ChartCard.js    # 차트 카드 래퍼
│   │   └── KpiCard.js      # KPI 표시 카드
│   ├── common/             # 공통 UI 컴포넌트
│   │   ├── Loading.js      # 로딩 스피너
│   │   ├── ErrorMessage.js # 에러 메시지
│   │   └── StatusIndicator.js # 상태 표시기
│   ├── dashboard/          # 대시보드 전용 컴포넌트
│   │   ├── KakaoMap.js     # 카카오맵 컴포넌트
│   │   ├── Panel.js        # 패널 래퍼
│   │   └── VideoPlayer.js  # 비디오 플레이어
│   ├── forms/              # 폼 관련 컴포넌트
│   │   └── LoginForm.js    # 로그인 폼
│   ├── floodDashboard.js   # 메인 대시보드
│   └── login.js            # 로그인 페이지
├── services/               # 서비스 레이어
│   ├── apiService.js       # REST API 호출
│   ├── authService.js      # 인증 관리
│   └── websocketService.js # WebSocket 통신
├── utils/                  # 유틸리티 함수
│   ├── constants.js        # 상수 정의
│   └── formatters.js       # 데이터 포맷팅
├── styles/                 # 스타일
│   └── commonStyles.js     # 공통 스타일
├── App.js                  # 앱 진입점
└── index.js                # React 진입점
```

## ✨ 주요 기능

### 🌊 실시간 모니터링
- 수위, 유속, 유량 데이터 실시간 표시
- 1분 간격 자동 업데이트
- 임계값 기반 위험도 표시

### 🎥 AI CCTV 분석  
- 실시간 비디오 스트리밍
- 수위 오버레이 표시
- 다중 카메라 지원

### 🚨 실시간 알람
- WebSocket 기반 즉시 알림
- 알람 레벨별 색상 구분
- 자동 재연결 지원

### 🗺️ 위치 기반 지도
- 카카오맵 API 연동
- DB 기반 동적 위치 정보
- 인터랙티브 마커 및 정보창

### 📱 PWA 지원
- 오프라인 캐싱 (Service Worker)
- 홈 화면 앱 설치 지원
- 모바일 최적화 UI

## 🛠️ 기술 스택

### Core
- **React 18**: 함수형 컴포넌트 + Hooks
- **JavaScript (ES6+)**: 최신 JS 문법
- **Create React App**: 개발 환경 설정

### UI/UX
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **Lucide React**: 일관성 있는 아이콘
- **Responsive Design**: 모든 디바이스 지원

### 데이터 시각화
- **Recharts**: React 차트 라이브러리
- **Real-time Updates**: WebSocket 기반
- **Interactive Charts**: 마우스 호버, 툴팁

### 지도 및 미디어
- **Kakao Map API**: 위치 기반 서비스
- **HTML5 Video**: 실시간 영상 스트리밍
- **Canvas API**: 수위 오버레이

### 상태 관리
- **React Hooks**: useState, useEffect, useMemo
- **Local Storage**: 로그인 상태 유지
- **WebSocket**: 실시간 데이터 동기화

## 🌐 API 통신

### REST API
```javascript
// apiService.js 사용 예시
import { apiService } from './services/apiService'

// 실시간 데이터 조회
const data = await apiService.getRealtimeData('center')

// 시계열 데이터 조회
const timeseries = await apiService.getTimeseriesData('center', '1h')

// 알람 목록 조회
const alerts = await apiService.getAlerts()
```

### WebSocket 연결
```javascript
// websocketService.js 사용 예시
import websocketService from './services/websocketService'

// 연결
websocketService.connect()

// 알람 업데이트 수신
websocketService.onAlertUpdate((data) => {
  console.log('새 알람:', data)
})
```

## 🔐 보안 시스템 (전자정부 표준 준수)

### ✅ 구현된 보안 기능

#### 1. **세션 관리**
- **자동 타임아웃**: 30분 비활성시 자동 로그아웃
- **경고 알림**: 5분 전 모달 팝업
- **활동 감지**: 마우스, 키보드, 스크롤 등 7가지 이벤트
- **세션 연장**: 사용자 선택으로 연장 가능

```javascript
// SessionManager.js - 세션 관리
class SessionManager {
  constructor() {
    this.timeout = 30 * 60 * 1000; // 30분
    this.warningTime = 5 * 60 * 1000; // 5분 전 경고
    this.activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  }
}
```

#### 2. **JWT 토큰 보안**
- **자동 헤더 추가**: Authorization Bearer
- **안전한 저장**: localStorage/sessionStorage
- **만료 처리**: 자동 로그아웃 및 리다이렉트
- **토큰 갱신**: 백엔드와 동기화

```javascript
// authService.js - 토큰 관리
const authService = {
  getAuthHeaders: () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }),
  
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}
```

#### 3. **입력 검증 및 보안**
- **XSS 방지**: 사용자 입력 sanitization
- **CSRF 보호**: 토큰 기반 요청 검증
- **입력 길이 제한**: 버퍼 오버플로우 방지
- **특수문자 필터링**: SQL 인젝션 방지

```javascript
// 입력 검증 예시
const validateInput = (input) => {
  const sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  return sanitized.length > 1000 ? sanitized.substring(0, 1000) : sanitized;
}
```

## 📱 PWA 구성

### Service Worker
```javascript
// public/sw.js
const CACHE_NAME = 'flow-dashboard-v1'
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css'
]
```

### Web App Manifest
```json
// public/manifest.json
{
  "short_name": "AI 기반 수위·유속·유량 계측 대시보드",
  "name": "Flow Dashboard",
  "display": "standalone",
  "theme_color": "#000000"
}
```

## 🎨 스타일링

### Tailwind CSS 클래스
```jsx
// 반응형 그리드
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// 다크 모드 지원
<div className="bg-white dark:bg-gray-800">

// 애니메이션
<div className="transition-all duration-300 hover:scale-105">
```

### 공통 스타일
```javascript
// styles/commonStyles.js
export const cardStyle = "bg-white rounded-lg shadow-sm border p-6"
export const buttonStyle = "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
```

## 🚀 배포

### 개발 환경
```bash
npm start
# http://localhost:3000
```

### 프로덕션 빌드
```bash
npm run build
# build/ 폴더에 최적화된 파일 생성
```

### 배포 체크리스트
- [ ] 환경 변수 설정 (`.env.production`)
- [ ] 카카오맵 도메인 등록
- [ ] HTTPS 설정
- [ ] PWA 매니페스트 도메인 업데이트
- [ ] Service Worker 캐시 정책 확인

## 🔧 개발 도구

### 코드 품질
```bash
# ESLint 검사
npm run lint

# 자동 포맷팅
npm run format
```

### 디버깅
- **React DevTools**: 컴포넌트 상태 검사
- **Network Tab**: API 호출 모니터링  
- **Console**: WebSocket 메시지 확인

## 🧪 테스트

### 기능 테스트
```bash
# 테스트 실행
npm test

# 커버리지 리포트
npm run test:coverage
```

### E2E 테스트
```javascript
// cypress/integration/dashboard.spec.js
it('로그인 후 대시보드 표시', () => {
  cy.visit('/login')
  cy.get('[data-testid=username]').type('admin')
  cy.get('[data-testid=password]').type('admin123')
  cy.get('[data-testid=login-btn]').click()
  cy.url().should('include', '/dashboard')
})

## 📞 지원

문의사항이나 기술 지원이 필요한 경우:
- 개발팀 연락처: 010-2863-6901
- 이슈 트래커: [GitHub Issues]

---

**© 2025 AI CCTV 수위 모니터링 시스템. All rights reserved.**