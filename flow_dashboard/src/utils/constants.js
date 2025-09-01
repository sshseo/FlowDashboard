// API 설정
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://222.103.78.124:8001'

// 위치 정보
export const locations = [
  {
    id: 'entrance',
    name: '입구',
    status: 'online',
    videoPath: '/videos/영오지하도.mp4',
    lat: 35.923508,
    lng: 128.519230,
    address: '경북 칠곡군 지천면 영오리 894'
  },
  {
    id: 'center',
    name: '중앙',
    status: 'online',
    videoPath: '/videos/산동지하도.mp4',
    lat: 35.923508,
    lng: 128.519230,
    address: '경북 칠곡군 지천면 영오리 894 (영오지하차도)'
  },
  {
    id: 'exit',
    name: '출구',
    status: 'maintenance',
    videoPath: '/videos/영오지하도.mp4',
    lat: 35.923508,
    lng: 128.519230,
    address: '경북 칠곡군 지천면 영오리 894'
  }
]

// 위험도 레벨 설정
export const RISK_LEVELS = {
  SAFE: { level: 'safe', label: '안전', color: 'text-green-500' },
  WARNING: { level: 'warning', label: '주의', color: 'text-yellow-500' },
  CRITICAL: { level: 'critical', label: '위험', color: 'text-red-500' }
}

// 수위 임계값
export const WATER_LEVEL_THRESHOLDS = {
  WARNING: 10,
  CRITICAL: 15
}

// 업데이트 간격 (ms)
export const UPDATE_INTERVALS = {
  REALTIME: 60000,    // 1분
  CHART: 300000,      // 5분
  ALERTS: 300000,     // 5분
  SERVER_STATUS: 30000 // 30초
}