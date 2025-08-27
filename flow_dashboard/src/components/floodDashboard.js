import React, { useState, useEffect, useMemo } from 'react'
import {
  Camera, MapPin, AlertTriangle, Waves, Gauge, Clock,
  Wifi, WifiOff, RefreshCw, Menu, X, Bell, Settings,
  TrendingUp, Droplets, Wind, Thermometer, LogOut, User
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts'

// API 기본 설정 (Python 백엔드 연동용)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001'

// 위치 정보
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
function KakaoMap({ selectedLocation, flowInfo }) {
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
      setLoadError('카카오맵 스크립트 로드에 실패했습니다')
    }

    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!isLoaded || !currentLocation || !mapRef.current) return

    try {
      const lat = flowInfo?.flow_latitude || currentLocation.lat
      const lng = flowInfo?.flow_longitude || currentLocation.lng

      const container = mapRef.current
      const options = {
        center: new window.kakao.maps.LatLng(lat, lng),
        level: 3,
        draggable: true,
        scrollwheel: true,
        doubleClickZoom: true
      }

      const map = new window.kakao.maps.Map(container, options)
      // 마커 생성
      const markerPosition = new window.kakao.maps.LatLng(lat, lng)
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        title: `${currentLocation.name} 모니터링 지점`
      })

      marker.setMap(map)

      // 인포윈도우 생성
      const flowName = flowInfo?.flow_name || '영오지하차도'
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="padding:8px; font-size:12px; width:200px; text-align:center;">
            <strong style="color:#2563eb;">${flowName}</strong><br/>
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
      setLoadError('지도 초기화에 실패했습니다')
    }
  }, [isLoaded, currentLocation, flowInfo])

  // 로딩 상태
  if (!isLoaded && !loadError) {
    return (
      <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border flex items-center justify-center">
        <div className="text-center text-sm text-gray-600">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="font-medium">지도 로딩 중...</div>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (loadError) {
    return (
      <div className="h-48 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 flex items-center justify-center">
        <div className="text-center text-sm text-red-600">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-red-400" />
          <div className="font-medium">지도 로드 실패</div>
          <div className="text-xs mt-1">{loadError}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-48 rounded-lg border shadow-sm">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  )
}

// API 호출 함수들
const apiService = {
  // 실시간 수위 데이터 가져오기
  getAuthHeaders: () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  },

  getRealtimeData: async (locationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/realtime/${locationId}`, {
        headers: apiService.getAuthHeaders()
      })
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('실시간 데이터 로딩 실패:', error)
      return null
    }
  },

  // 시계열 데이터 가져오기
  getTimeseriesData: async (locationId, timeRange = '1h') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/timeseries/${locationId}?range=${timeRange}`, {
        headers: apiService.getAuthHeaders()
      })
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('시계열 데이터 로딩 실패:', error)
      return null
    }
  },

  // 알림 목록 가져오기
  getAlerts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: apiService.getAuthHeaders()
      })
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('알림 데이터 로딩 실패:', error)
      return null
    }
  },

  getFlowInfo: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/info`, {
        headers: apiService.getAuthHeaders()
      })
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('하천 정보 로딩 실패:', error)
      return null
    }
  }
}

export default function AICCTVFloodDashboard({ onLogout, userInfo }) {
  // 상태 관리
  const [selectedLocation, setSelectedLocation] = useState('center')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // 데이터 상태
  const [waterLevel, setWaterLevel] = useState([])
  const [flowVelocity, setFlowVelocity] = useState([])
  const [discharge, setDischarge] = useState([])
  const [alerts, setAlerts] = useState([])
  const [flowInfo, setFlowInfo] = useState(null)
  const [realtimeData, setRealtimeData] = useState(null)
  const [videoKey, setVideoKey] = useState(0)

  // 실시간 데이터 업데이트
  useEffect(() => {
    const updateRealtimeData = async () => {
      try {
        const realtimeResponse = await apiService.getRealtimeData(selectedLocation)
        if (realtimeResponse && realtimeResponse.status === 'success') {
          setRealtimeData(realtimeResponse)
          setLastUpdate(new Date())
          setIsOnline(true)
        }
      } catch (error) {
        console.error('실시간 데이터 업데이트 실패:', error)
        setIsOnline(false)
      }
    }

    const updateChartData = async () => {
      try {
        const timeseriesResponse = await apiService.getTimeseriesData(selectedLocation, '1h')
        if (timeseriesResponse && timeseriesResponse.status === 'success') {
          setWaterLevel(timeseriesResponse.waterLevel || [])
          setFlowVelocity(timeseriesResponse.flowVelocity || [])
          setDischarge(timeseriesResponse.discharge || [])
        }
      } catch (error) {
        console.error('차트 데이터 업데이트 실패:', error)
      }
    }

    const updateAlerts = async () => {
      try {
        const alertsResponse = await apiService.getAlerts()
        if (alertsResponse && alertsResponse.status === 'success') {
          setAlerts(alertsResponse.alerts || [])
        }
      } catch (error) {
        console.error('알림 데이터 업데이트 실패:', error)
      }
    }

    // 초기 로드
    const updateFlowInfo = async () => {
      try {
        const flowInfoResponse = await apiService.getFlowInfo()
        if (flowInfoResponse && flowInfoResponse.status === 'success') {
          setFlowInfo(flowInfoResponse)
        }
      } catch (error) {
        console.error('하천 정보 업데이트 실패:', error)
      }
    }

    const initData = async () => {
      setIsLoading(true)
      await Promise.all([updateRealtimeData(), updateChartData(), updateAlerts(), updateFlowInfo()])
      setIsLoading(false)
    }

    initData()

    const realtimeInterval = setInterval(updateRealtimeData, 60000) //1분마다 갱신
    const chartInterval = setInterval(updateChartData, 300000) //5분마다 갱신
    const alertInterval = setInterval(updateAlerts, 300000) //5분마다 갱신

    return () => {
      clearInterval(realtimeInterval)
      clearInterval(chartInterval)
      clearInterval(alertInterval)
    }
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

  // 로그아웃 처리
  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      onLogout()
    }
  }

  // KPI 계산
  const kpis = useMemo(() => {
    if (realtimeData) {
      return {
        levelCm: realtimeData.flow_waterlevel || 0,
        velocityMs: realtimeData.flow_rate || 0,
        dischargeM3s: realtimeData.flow_flux || 0,
        trend: 0
      }
    }

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
  }, [realtimeData, waterLevel, flowVelocity, discharge])

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

          {/* 현재 하천 정보 */}
          {flowInfo && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">하천 정보</h3>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-900">{flowInfo.flow_name}</div>
                <div className="text-xs text-blue-600 mt-1">{flowInfo.flow_region} 지역</div>
                <div className="text-xs text-gray-500 mt-1">
                  위도: {flowInfo.flow_latitude?.toFixed(6)}<br/>
                  경도: {flowInfo.flow_longitude?.toFixed(6)}
                </div>
              </div>
            </div>
          )}

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

              {/* 사용자 정보 드롭다운 */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium hidden sm:block">
                    {userInfo?.user_name || '사용자'}
                  </span>
                </button>

                {/* 드롭다운 메뉴 */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-3 border-b">
                      <div className="text-sm font-medium">{userInfo?.user_name || '사용자'}</div>
                      <div className="text-xs text-gray-500">{userInfo?.user_id} 로그인 중</div>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-red-50 text-red-600 rounded transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm">로그아웃</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 드롭다운 닫기를 위한 오버레이 */}
          {showUserMenu && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
          )}
        </header>

        {/* 대시보드 콘텐츠 */}
        <main className="p-4 space-y-8 flex-1">
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
              value={`${kpis.dischargeM3s.toFixed(1)}`}
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

          {/* CCTV 및 알림/지도 영역 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* CCTV 실시간 분석 */}
            <div className="xl:col-span-2">
              <Panel title="CCTV 실시간 분석" subtitle={`${currentLocation?.name} 위치`}>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-900">
                  <video
                    key={videoKey}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src={currentLocation?.videoPath} type="video/mp4" />
                    <source src={currentLocation?.videoPath?.replace('.mp4', '.webm')} type="video/webm" />
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
                    {realtimeData?.flow_time && (
                      <div className="px-2 py-1 bg-black/60 text-white text-xs rounded">
                        {new Date(realtimeData.flow_time).toLocaleTimeString('ko-KR')}
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </div>

            {/* 알림 및 지도 */}
            <div className="space-y-6">
              <Panel title="실시간 알림">
                <div className="space-y-2 h-64 overflow-y-auto">
                  {alerts.length > 0 ? alerts.map((alert) => (
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
                  )) : (
                    <div className="text-center text-sm text-gray-500 py-8">
                      현재 알림이 없습니다
                    </div>
                  )}
                </div>
              </Panel>

              <Panel title="위치 정보">
                <div className="space-y-3">
                  <KakaoMap selectedLocation={selectedLocation} flowInfo={flowInfo} />
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• {flowInfo?.flow_name || '영오지하차도'}</div>
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
        {trend !== undefined && trend !== 0 && (
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