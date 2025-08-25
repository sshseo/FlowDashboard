import React, { useState, useEffect, useMemo } from 'react'
import {
  Camera, MapPin, AlertTriangle, Waves, Gauge, Clock,
  Wifi, WifiOff, RefreshCw, Menu, X, Bell, Settings,
  TrendingUp, Droplets, Wind, Thermometer
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts'

// API 기본 설정 (Python 백엔드 연동용)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

// 샘플 데이터 (개발용 - 실제로는 API에서 가져올 데이터)
// 수위
const initialWaterLevel = [
  { t: '09:00', h: 7.2, timestamp: '2025-08-21T09:00:00+09:00' },
  { t: '09:05', h: 7.8, timestamp: '2025-08-21T09:05:00+09:00' },
  { t: '09:10', h: 8.3, timestamp: '2025-08-21T09:10:00+09:00' },
  { t: '09:15', h: 9.0, timestamp: '2025-08-21T09:15:00+09:00' },
  { t: '09:20', h: 9.5, timestamp: '2025-08-21T09:20:00+09:00' }
]

//유속
const initialFlowFlux = [
  { t: '09:00', v: 0.6 },
  { t: '09:05', v: 0.7 },
  { t: '09:10', v: 0.9 },
  { t: '09:15', v: 1.1 },
  { t: '09:20', v: 1.3 }
]

//유량
const initialFlowRate = [
  { t: '09:00', q: 12 },
  { t: '09:05', q: 14 },
  { t: '09:10', q: 16 },
  { t: '09:15', q: 18 },
  { t: '09:20', q: 21 }
]

const initialAlerts = [
  { id: 'AL-001', ts: '09:20', level: 'CRITICAL', message: '수위 급상승 감지 (15cm 임계치 접근)', location: '중앙' },
  { id: 'AL-002', ts: '09:18', level: 'WARNING', message: '유속 증가 (1.3 m/s)', location: '중앙' },
  { id: 'AL-003', ts: '09:15', level: 'INFO', message: 'AI 분석 완료 - 차량 2대 감지', location: '입구' }
]

const locations = [
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

// 카카오맵 컴포넌트
function KakaoMap({ selectedLocation }) {
  const mapRef = React.useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const currentLocation = locations.find(loc => loc.id === selectedLocation)

  useEffect(() => {
    // 이미 로드된 경우 바로 사용
    if (window.kakao && window.kakao.maps) {
      setIsLoaded(true)
      return
    }

    // 카카오맵 스크립트 동적 로드
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]')

    if (existingScript) {
      // 이미 스크립트가 있지만 로드되지 않은 경우 대기
      const checkKakao = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkKakao)
          window.kakao.maps.load(() => {
            setIsLoaded(true)
          })
        }
      }, 100)

      return () => clearInterval(checkKakao)
    }

    const script = document.createElement('script')
    script.async = true
    const apiKey = process.env.REACT_APP_KAKAO_API_KEY
    if (!apiKey) {
      setLoadError('카카오맵 API 키가 설정되지 않았습니다')
      return
    }
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`

    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          setIsLoaded(true)
          setLoadError(null)
        })
      } else {
        setLoadError('카카오맵 객체를 찾을 수 없습니다')
      }
    }

    script.onerror = (error) => {
      console.error('카카오맵 스크립트 로드 실패:', error)
      setLoadError('카카오맵 스크립트 로드에 실패했습니다')
    }

    document.head.appendChild(script)

    return () => {
      // 클린업은 하지 않음 (전역 리소스)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !currentLocation || !mapRef.current) return

    try {
      const container = mapRef.current
      const options = {
        center: new window.kakao.maps.LatLng(currentLocation.lat, currentLocation.lng),
        level: 3,
        draggable: true,
        scrollwheel: true,
        doubleClickZoom: true
      }

      const map = new window.kakao.maps.Map(container, options)

      // 마커 생성
      const markerPosition = new window.kakao.maps.LatLng(currentLocation.lat, currentLocation.lng)
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        title: `${currentLocation.name} 모니터링 지점`
      })

      marker.setMap(map)

      // 인포윈도우 생성
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="padding:8px; font-size:12px; width:200px; text-align:center;">
            <strong style="color:#2563eb;">영오지하차도</strong><br/>
            <span style="color:#666; font-size:11px;">${currentLocation.name} 모니터링 지점</span><br/>
            <span style="color:#10b981; font-size:10px;">🟢 수위센서 + AI CCTV 정상 작동</span>
          </div>
        `,
        removable: false
      })

      infowindow.open(map, marker)

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker)
      })

      // 지도 클릭 시 인포윈도우 닫기
      window.kakao.maps.event.addListener(map, 'click', () => {
        infowindow.close()
      })

    } catch (error) {
      console.error('카카오맵 초기화 에러:', error)
      setLoadError('지도 초기화에 실패했습니다')
    }
  }, [isLoaded, currentLocation])

  // 로딩 상태
  if (!isLoaded && !loadError) {
    return (
      <div className="relative h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="font-medium">지도 로딩 중...</div>
            <div className="text-xs mt-1 text-gray-500">카카오맵을 불러오고 있습니다</div>
          </div>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (loadError) {
    return (
      <div className="relative h-32 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-sm text-red-600">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <div className="font-medium">지도 로드 실패</div>
            <div className="text-xs mt-1">{loadError}</div>
            <div className="text-xs mt-1 text-red-500">
              유효한 카카오맵 API 키가 필요합니다
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="h-32 rounded-lg border shadow-sm"
        style={{ minHeight: '240px' }}
      />
    </div>
  )
}
// API 호출 함수들 (Python 백엔드 연동용)
const apiService = {
  // 실시간 수위 데이터 가져오기
  getRealtimeData: async (locationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/realtime/${locationId}`)
      if (!response.ok) throw new Error('API 호출 실패')
      return await response.json()
    } catch (error) {
      console.error('실시간 데이터 로딩 실패:', error)
      return null
    }
  },

  // 시계열 데이터 가져오기
  getTimeseriesData: async (locationId, timeRange = '1h') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/timeseries/${locationId}?range=${timeRange}`)
      if (!response.ok) throw new Error('API 호출 실패')
      return await response.json()
    } catch (error) {
      console.error('시계열 데이터 로딩 실패:', error)
      return null
    }
  },

  // 알림 목록 가져오기
  getAlerts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts`)
      if (!response.ok) throw new Error('API 호출 실패')
      return await response.json()
    } catch (error) {
      console.error('알림 데이터 로딩 실패:', error)
      return null
    }
  }
}

export default function AICCTVFloodDashboard() {
  // 상태 관리
  const [selectedLocation, setSelectedLocation] = useState('center')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

  // 데이터 상태
  const [waterLevel, setWaterLevel] = useState(initialWaterLevel)
  const [flowVelocity, setFlowVelocity] = useState(initialFlowFlux)
  const [discharge, setDischarge] = useState(initialFlowRate)
  const [alerts, setAlerts] = useState(initialAlerts)
  const [videoKey, setVideoKey] = useState(0) // 비디오 리로드를 위한 키

  // 실시간 데이터 업데이트
  useEffect(() => {
    const updateData = async () => {
      setIsLoading(true)
      try {
        // Python 백엔드에서 데이터 가져오기
        const timeseriesData = await apiService.getTimeseriesData(selectedLocation)
        const alertsData = await apiService.getAlerts()

        if (timeseriesData) {
          setWaterLevel(timeseriesData.waterLevel || initialWaterLevel)
          setFlowVelocity(timeseriesData.flowVelocity || initialFlowFlux)
          setDischarge(timeseriesData.discharge || initialFlowRate)
        }

        if (alertsData) {
          setAlerts(alertsData.alerts || initialAlerts)
        }

        setLastUpdate(new Date())
        setIsOnline(true)
      } catch (error) {
        console.error('데이터 업데이트 실패:', error)
        setIsOnline(false)
      } finally {
        setIsLoading(false)
      }
    }

    // 초기 로드
    updateData()

    // 5초마다 자동 업데이트
    const interval = setInterval(updateData, 5000)
    return () => clearInterval(interval)
  }, [selectedLocation])

  // 온라인 상태 감지
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 위치 변경 시 비디오 리로드
  useEffect(() => {
    setVideoKey(prev => prev + 1)
  }, [selectedLocation])

  // KPI 계산
  const kpis = useMemo(() => {
    const latestWater = waterLevel[waterLevel.length - 1]
    const latestVelocity = flowVelocity[flowVelocity.length - 1]
    const latestDischarge = discharge[discharge.length - 1]

    return {
      levelCm: latestWater?.h ?? 0,
      velocityMs: latestVelocity?.v ?? 0,
      dischargeM3s: latestDischarge?.q ?? 0,
      trend: waterLevel.length > 1 ?
        ((latestWater?.h ?? 0) - (waterLevel[waterLevel.length - 2]?.h ?? 0)) : 0
    }
  }, [waterLevel, flowVelocity, discharge])

  // 위험도 계산
  const riskLevel = useMemo(() => {
    if (kpis.levelCm > 15) return { level: 'critical', label: '위험', color: 'text-red-500' }
    if (kpis.levelCm > 10) return { level: 'warning', label: '주의', color: 'text-yellow-500' }
    return { level: 'safe', label: '안전', color: 'text-green-500' }
  }, [kpis.levelCm])

  const currentLocation = locations.find(loc => loc.id === selectedLocation)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 lg:flex">
      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <div className={`
        fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:shadow-none lg:border-r lg:flex-shrink-0
      `}>
        <div className="p-4 border-b lg:hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">메뉴</h2>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* 위치 선택 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">모니터링 위치</h3>
            <div className="space-y-2">
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    setSelectedLocation(location.id)
                    setSidebarOpen(false)
                  }}
                  className={`
                    w-full flex items-center justify-between p-3 rounded-lg border transition-colors
                    ${selectedLocation === location.id
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="font-medium">{location.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      location.status === 'online' ? 'bg-green-500' :
                      location.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <Camera className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 시스템 상태 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">시스템 상태</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                <span className="text-sm">{isOnline ? '온라인' : '오프라인'}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-4 w-4 text-blue-500" />
                <div className="text-sm">
                  <div>마지막 업데이트</div>
                  <div className="text-xs text-gray-500">{lastUpdate.toLocaleTimeString('ko-KR')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 알림 설정 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">알림 설정</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                <Bell className="h-4 w-4" />
                <span className="text-sm">알림 설정</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                <Settings className="h-4 w-4" />
                <span className="text-sm">시스템 설정</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="lg:flex-1 lg:flex lg:flex-col min-w-0">
        {/* 헤더 */}
        <header className="bg-white border-b sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Waves className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-lg font-semibold sm:text-xl">AI CCTV 수위 모니터링</h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {currentLocation?.name} | 실시간 분석 시스템
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                disabled={isLoading}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                title="새로고침"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${riskLevel.color} bg-current bg-opacity-10`}>
                {riskLevel.label}
              </div>
            </div>
          </div>
        </header>

        {/* 대시보드 콘텐츠 */}
        <main className="p-4 space-y-6 flex-1">
          {/* KPI 카드들 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="실시간 수위"
              value={`${kpis.levelCm.toFixed(1)}`}
              unit="cm"
              subtitle="AI CCTV 분석"
              icon={<Gauge className="h-5 w-5" />}
              trend={kpis.trend}
              color="blue"
            />
            <KpiCard
              title="유속"
              value={`${kpis.velocityMs.toFixed(1)}`}
              unit="m/s"
              subtitle="광학 유속계"
              icon={<Wind className="h-5 w-5" />}
              color="green"
            />
            <KpiCard
              title="유량"
              value={`${kpis.dischargeM3s.toFixed(0)}`}
              unit="m³/s"
              subtitle="Q = A × v"
              icon={<Droplets className="h-5 w-5" />}
              color="cyan"
            />
            <KpiCard
              title="온도"
              value="23.5"
              unit="°C"
              subtitle="수온 센서"
              icon={<Thermometer className="h-5 w-5" />}
              color="orange"
            />
          </div>

          {/* CCTV 및 차트 영역 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* CCTV 실시간 분석 */}
            <div className="xl:col-span-2">
              <Panel title="CCTV 실시간 분석" subtitle={`${currentLocation?.name} 위치`}>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-900">
                  {/* 각 위치별 다른 영상 재생 */}
                  <video
                    key={videoKey} // 위치 변경 시 비디오 리로드
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onError={(e) => console.log('비디오 로드 에러:', e)}
                  >
                    <source src={currentLocation?.videoPath} type="video/mp4" />
                    <source src={currentLocation?.videoPath?.replace('.mp4', '.webm')} type="video/webm" />
                    {/* 비디오가 로드되지 않을 때 폴백 */}
                    <div className="absolute inset-0 flex items-center justify-center text-white bg-slate-900">
                      <div className="text-center">
                        <Camera className="h-12 w-12 mx-auto mb-3 opacity-60" />
                        <div className="text-lg font-medium">영상 로딩 중...</div>
                        <div className="text-sm opacity-75">{currentLocation?.name} 위치 영상</div>
                      </div>
                    </div>
                  </video>

                  {/* 수위 라인 표시 */}
                  <div
                    className="absolute left-0 right-0 border-t-2 border-blue-400 z-10"
                    style={{ top: `${60 - (kpis.levelCm / 20) * 30}%` }}
                  />

                  {/* 수위 감지 박스 */}
                  <div
                    className="absolute border-2 border-red-400 bg-red-400/20 z-10"
                    style={{
                      top: '20%',
                      left: '65%',
                      width: '8%',
                      height: '40%'
                    }}
                  />

                  {/* 오버레이 정보 */}
                  <div className="absolute top-4 left-4 space-y-1 z-10">
                    <div className="px-2 py-1 bg-black/60 text-white text-xs rounded">
                      🔴 LIVE
                    </div>
                    <div className="px-2 py-1 bg-black/60 text-white text-xs rounded">
                      수위: {kpis.levelCm.toFixed(1)}cm
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            {/* 알림 및 로그 */}
            <div className="space-y-4">
              <Panel title="실시간 알림">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.level === 'CRITICAL' ? 'bg-red-50 border-red-400' :
                        alert.level === 'WARNING' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                          alert.level === 'CRITICAL' ? 'text-red-500' :
                          alert.level === 'WARNING' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{alert.message}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {alert.location} · {alert.ts}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="위치 정보">
                <div className="space-y-3">
                  <KakaoMap selectedLocation={selectedLocation} />
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• 영오지하차도 (칠곡 지천면)</div>
                    <div>• {currentLocation?.address}</div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* 차트 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard title="수위 변화 추이" color="blue">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={waterLevel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    formatter={(value) => [`${value}cm`, '수위']}
                    labelFormatter={(label) => `시간: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="h"
                    stroke="#3B82F6"
                    fill="#DBEAFE"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="유속 변화 추이" color="green">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={flowVelocity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    formatter={(value) => [`${value}m/s`, '유속']}
                  />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="유량 변화 추이" color="cyan">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={discharge}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    formatter={(value) => [`${value}m³/s`, '유량']}
                  />
                  <Line
                    type="monotone"
                    dataKey="q"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </main>

        {/* 푸터 */}
        <footer className="p-4 border-t bg-white/50">
          <div className="text-xs text-gray-500 text-center">
            © 2025 AI CCTV 수위 모니터링 시스템 · 실시간 분석 대시보드
          </div>
        </footer>
      </div>
    </div>
  )
}

// 컴포넌트들
function KpiCard({ title, value, unit, subtitle, icon, trend, color = "blue" }) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100 border-blue-200",
    green: "from-green-50 to-green-100 border-green-200",
    cyan: "from-cyan-50 to-cyan-100 border-cyan-200",
    orange: "from-orange-50 to-orange-100 border-orange-200"
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${
            trend > 0 ? 'text-red-500' : trend < 0 ? 'text-blue-500' : 'text-gray-400'
          }`}>
            <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend).toFixed(1)}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-500">{unit}</div>
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}

function Panel({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function ChartCard({ title, children, color = "blue" }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="h-48 sm:h-56">
        {children}
      </div>
    </div>
  )
}