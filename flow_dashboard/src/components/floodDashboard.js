import React, { useState, useEffect, useMemo } from 'react'
import {
  Camera, AlertTriangle, Waves, Gauge, Clock,
  RefreshCw, Menu, X, Bell, Settings,
  Droplets, Wind, Thermometer, LogOut, User, UserPlus
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts'

// 모듈화된 임포트
import { UPDATE_INTERVALS } from '../utils/constants'
import { locations } from '../utils/constants'
import { calculateKpis, calculateRiskLevel, formatTime } from '../utils/formatters'
import { apiService } from '../services/apiService'
import websocketService from '../services/websocketService'
import sessionManager from '../utils/sessionManager'
import { OnlineStatus, LocationStatus } from './common/StatusIndicator'
import { LoadingSpinner } from './common/Loading'
import SessionTimeoutModal from './common/SessionTimeoutModal'
import KpiCard from './charts/KpiCard'
import ChartCard from './charts/ChartCard'
import NotificationSettings from './NotificationSettings'
import SystemSettings from './SystemSettings'
import UserManagementModal from './UserManagementModal'
import { authService } from '../services/authService'
import Panel from './dashboard/Panel'
import KakaoMap from './dashboard/KakaoMap'
import VideoPlayer from './dashboard/VideoPlayer'

// 차트 컴포넌트 메모이제이션
const ChartsSection = React.memo(({ waterLevel, flowVelocity, discharge }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <ChartCard title="수위 변화 추이" color="blue">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={waterLevel} animationDuration={0}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="t" 
            fontSize={10}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis fontSize={12} />
          <Tooltip
            formatter={(value) => [`${value}cm`, '수위']}
            labelFormatter={(label) => `시간: ${label}`}
            animationDuration={0}
          />
          <Area
            type="monotone"
            dataKey="h"
            stroke="#3B82F6"
            fill="#DBEAFE"
            strokeWidth={2}
            animationDuration={0}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>

    <ChartCard title="유속 변화 추이" color="green">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={flowVelocity} animationDuration={0}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="t" 
            fontSize={10}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis fontSize={12} />
          <Tooltip
            formatter={(value) => [`${value}m/s`, '유속']}
            animationDuration={0}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            animationDuration={0}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>

    <ChartCard title="유량 변화 추이" color="cyan">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={discharge} animationDuration={0}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="t" 
            fontSize={10}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis fontSize={12} />
          <Tooltip
            formatter={(value) => [`${value}m³/s`, '유량']}
            animationDuration={0}
          />
          <Line
            type="monotone"
            dataKey="q"
            stroke="#06B6D4"
            strokeWidth={2}
            dot={false}
            animationDuration={0}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  </div>
))

export default function AICCTVFloodDashboard({ onLogout, userInfo, flowUid = 1 }) {
  // 상태 관리
  const [selectedLocation, setSelectedLocation] = useState('center')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // 세션 타임아웃 상태
  const [showTimeoutModal, setShowTimeoutModal] = useState(false)
  const [sessionRemainingTime, setSessionRemainingTime] = useState(0)
  
  // 컴포넌트 로드 시 브라우저 알림 권한 초기화
  useEffect(() => {
    if ('Notification' in window) {
      // 권한 상태 초기화만 수행 (상태 변수 불필요)
      Notification.requestPermission()
    }
  }, [])

  // 설정 모달 상태
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showSystemSettings, setShowSystemSettings] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)

  // 모바일 사이드바 열림/닫힘에 따른 배경 스크롤 제어
  useEffect(() => {
    if (sidebarOpen) {
      // 사이드바가 열렸을 때 body 스크롤 비활성화
      document.body.style.overflow = 'hidden'
    } else {
      // 사이드바가 닫혔을 때 body 스크롤 활성화
      document.body.style.overflow = 'unset'
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [sidebarOpen])

  // 데이터 상태
  const [waterLevel, setWaterLevel] = useState([])
  const [flowVelocity, setFlowVelocity] = useState([])
  const [discharge, setDischarge] = useState([])
  const [alerts, setAlerts] = useState([])
  const [flowInfo, setFlowInfo] = useState(null)
  const [realtimeData, setRealtimeData] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [videoKey, setVideoKey] = useState(0)
  const [currentTemperature, setCurrentTemperature] = useState({ 
    temperature: null, 
    loading: true 
  })
  //const [wsConnected, setWsConnected] = useState(false)

  // 실시간 데이터 업데이트
  useEffect(() => {
    const updateRealtimeData = async () => {
      try {
        console.log('API 호출 location:', selectedLocation)
        const realtimeResponse = await apiService.getRealtimeData(selectedLocation, flowUid)
        if (realtimeResponse) {
          setRealtimeData(realtimeResponse)
          setLastUpdate(new Date())
          setIsOnline(true)
          
          // 연결 상태 업데이트
          if (realtimeResponse.connection_status) {
            setConnectionStatus(realtimeResponse.connection_status)
          }
        }
      } catch (error) {
        console.error('실시간 데이터 업데이트 실패:', error)
        setIsOnline(false)
        setConnectionStatus('disconnected')
      }
    }

    const updateChartData = async () => {
      try {
        const timeseriesResponse = await apiService.getTimeseriesData(selectedLocation, '7d', flowUid)
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

    const updateTemperature = async () => {
      try {
        let lat, lon
        if (flowInfo?.flow_latitude && flowInfo?.flow_longitude) {
          lat = flowInfo.flow_latitude
          lon = flowInfo.flow_longitude
        }
        
        const temperatureData = await apiService.getCurrentTemperature(lat, lon)
        if (temperatureData) {
          console.log('온도 갱신:', temperatureData)
          setCurrentTemperature({ 
            temperature: temperatureData.temperature,
            timestamp: temperatureData.timestamp,
            source: temperatureData.source,
            loading: false
          })
        } else {
          // API 실패 시 온도 데이터를 null로 설정
          console.log('온도 데이터 로드 실패 - 표시 없음')
          setCurrentTemperature({ 
            temperature: null, 
            loading: false 
          })
        }
      } catch (error) {
        console.error('온도 데이터 업데이트 실패:', error)
        setCurrentTemperature({ 
          temperature: null, 
          loading: false 
        })
      }
    }

    const initData = async () => {
      setIsLoading(true)
      await Promise.all([updateRealtimeData(), updateChartData(), updateAlerts(), updateFlowInfo()])
      // 온도 데이터는 flowInfo 로드 후에 별도로 호출
      await updateTemperature()
      setIsLoading(false)
    }

    initData()

    const realtimeInterval = setInterval(updateRealtimeData, UPDATE_INTERVALS.REALTIME)
    const chartInterval = setInterval(updateChartData, UPDATE_INTERVALS.CHART)
    const temperatureInterval = setInterval(updateTemperature, parseInt(process.env.REACT_APP_TEMPERATURE_UPDATE_INTERVAL) || 300000) // 환경변수에서 온도 업데이트 간격 설정
    // 알람은 WebSocket으로 실시간 수신하므로 폴링 제거

    return () => {
      clearInterval(realtimeInterval)
      clearInterval(chartInterval)
      clearInterval(temperatureInterval)
    }
  }, [flowInfo?.flow_latitude, flowInfo?.flow_longitude, selectedLocation, flowUid])

  // WebSocket 연결 및 실시간 알람 수신
  useEffect(() => {
    // WebSocket 연결
    websocketService.connect()

    // 연결 상태 콜백
    const handleConnection = (data) => {
      console.log('WebSocket 연결 상태:', data.status)
    }

    // 알람 업데이트 콜백
    const handleAlertUpdate = (messageData) => {
      console.log('WebSocket 알람 업데이트 수신:', messageData)
      const { alert_type, data: alertData } = messageData

      if (alert_type === 'alert_added') {
        console.log('알람 추가:', alertData)
        // 새 알람 추가 (중복 방지)
        setAlerts(prevAlerts => {
          const existsAlready = prevAlerts.some(alert => alert.id === alertData.id)
          if (existsAlready) {
            console.log('중복 알람 무시:', alertData.id)
            return prevAlerts
          }
          return [alertData, ...prevAlerts]
        })
        
        // 브라우저 알림 표시
        showBrowserNotification(alertData)
      } else if (alert_type === 'alert_deleted') {
        console.log('알람 삭제:', alertData)
        // 알람 삭제
        setAlerts(prevAlerts => 
          prevAlerts.filter(alert => alert.id !== alertData.id)
        )
      }
    }

    // 콜백 등록
    websocketService.onConnection(handleConnection)
    websocketService.onAlertUpdate(handleAlertUpdate)

    // 컴포넌트 언마운트 시 정리
    return () => {
      websocketService.removeCallback('connection', handleConnection)
      websocketService.removeCallback('alert_update', handleAlertUpdate)
      websocketService.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // 초기 비디오 로드 및 위치 변경시 비디오 새로고침
  useEffect(() => {
    setVideoKey(prev => prev + 1)
  }, [selectedLocation])

  // flowInfo 변경시 온도 데이터 업데이트
  useEffect(() => {
    const updateTemperatureWhenLocationChanged = async () => {
      if (flowInfo?.flow_latitude && flowInfo?.flow_longitude) {
        try {
          const temperatureData = await apiService.getCurrentTemperature(
            flowInfo.flow_latitude, 
            flowInfo.flow_longitude
          )
          if (temperatureData) {
            setCurrentTemperature({ 
              temperature: temperatureData.temperature,
              timestamp: temperatureData.timestamp,
              source: temperatureData.source,
              loading: false
            })
          }
        } catch (error) {
          console.error('위치 변경시 온도 데이터 업데이트 실패:', error)
        }
      }
    }

    if (flowInfo) {
      updateTemperatureWhenLocationChanged()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowInfo])

  // 세션 타임아웃 관리
  useEffect(() => {
    // 로그인 유지 여부 확인
    const isRememberMe = localStorage.getItem('isLoggedIn') === 'true'
    const loginTimestamp = localStorage.getItem('loginTimestamp')
    
    // 로그인 유지가 체크되어 있고, 7일 이내인 경우
    if (isRememberMe && loginTimestamp) {
      const now = new Date().getTime()
      const loginTime = parseInt(loginTimestamp)
      const sevenDays = 7 * 24 * 60 * 60 * 1000 // 7일 (밀리초)
      
      if (now - loginTime < sevenDays) {
        console.log('로그인 유지 모드 - 세션 타임아웃 7일')
        // 7일 세션 타임아웃 설정
        sessionManager.setSessionTimeout(sevenDays, 5 * 60 * 1000) // 7일, 5분 전 경고
      } else {
        console.log('로그인 유지 기간 만료 - 로그아웃')
        onLogout()
        return
      }
    } else {
      console.log('일반 모드 - 세션 타임아웃 30분')
      // 일반 30분 세션 타임아웃 설정
      sessionManager.setSessionTimeout(30 * 60 * 1000, 5 * 60 * 1000) // 30분, 5분 전 경고
    }

    // 세션 타임아웃 시작
    sessionManager.start(
      // 타임아웃 콜백 (자동 로그아웃)
      () => {
        console.log('세션 타임아웃 - 자동 로그아웃')
        setShowTimeoutModal(false)
        onLogout()
      },
      // 경고 콜백 (5분 전 알림)
      () => {
        console.log('세션 타임아웃 경고 표시')
        setSessionRemainingTime(300) // 5분(300초) 카운트다운 설정
        setShowTimeoutModal(true)
      }
    )

    // 컴포넌트 언마운트 시 세션 관리 중지
    return () => {
      sessionManager.stop()
    }
  }, [onLogout])

  // 로그아웃 처리
  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      sessionManager.stop()
      onLogout()
    }
  }

  // 세션 연장 처리
  const handleSessionExtend = () => {
    console.log('사용자가 세션 연장 선택')
    sessionManager.extend()
    setShowTimeoutModal(false)
  }

  // 세션 타임아웃으로 인한 로그아웃
  const handleSessionLogout = () => {
    console.log('사용자가 로그아웃 선택')
    setShowTimeoutModal(false)
    sessionManager.stop()
    onLogout()
  }

  // 회원 추가 처리
  const handleAddUser = async (userData) => {
    try {
      await authService.createUser(userData)
      alert('회원이 성공적으로 추가되었습니다.')
    } catch (error) {
      console.error('회원 추가 실패:', error)
      throw error
    }
  }

  // 관리자 권한 확인 (user_level이 0인 경우만 관리자)
  const isAdmin = userInfo && userInfo.user_level === 0
  
  // 브라우저 알림 권한 요청
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission
    }
    return 'denied'
  }

  // 브라우저 알림 표시
  const showBrowserNotification = async (alertData) => {
    try {
      // 알림 설정 확인
      const savedSettings = localStorage.getItem('notificationSettings')
      let notificationsEnabled = true
      let notificationMethod = 'browser'
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        notificationsEnabled = settings.notificationsEnabled
        notificationMethod = settings.notificationMethod
      }

      // 알림이 비활성화되어 있거나 브라우저 알림이 아닌 경우 스킵
      if (!notificationsEnabled || notificationMethod !== 'browser') {
        return
      }

      // 브라우저 알림 지원 여부 확인
      if (!('Notification' in window)) {
        console.warn('브라우저가 알림을 지원하지 않습니다.')
        return
      }

      // 권한 확인 및 요청
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await requestNotificationPermission()
      }

      if (permission === 'granted') {
        // 알림 레벨에 따른 아이콘과 우선순위 설정
        const getNotificationConfig = (level) => {
          switch (level) {
            case 'CRITICAL':
              return {
                icon: '🚨',
                tag: 'water-level-critical',
                requireInteraction: true,
                silent: false
              }
            case 'WARNING':
              return {
                icon: '⚠️',
                tag: 'water-level-warning',
                requireInteraction: false,
                silent: false
              }
            default:
              return {
                icon: '✅',
                tag: 'water-level-info',
                requireInteraction: false,
                silent: true
              }
          }
        }

        const config = getNotificationConfig(alertData.level)
        
        const notification = new Notification(`[수위 알림] ${alertData.location || '중앙'}`, {
          body: alertData.message,
          icon: '/favicon.ico',
          tag: config.tag,
          requireInteraction: config.requireInteraction,
          silent: config.silent,
          timestamp: Date.now()
        })

        // 알림 클릭 시 창 포커스
        notification.onclick = () => {
          window.focus()
          notification.close()
        }

        // 자동 닫기 (긴급 알림 제외)
        if (!config.requireInteraction) {
          setTimeout(() => notification.close(), 5000)
        }

        console.log(`브라우저 알림 표시: ${alertData.level} - ${alertData.message}`)
      } else {
        console.warn('브라우저 알림 권한이 거부되었습니다.')
      }
    } catch (error) {
      console.error('브라우저 알림 표시 실패:', error)
    }
  }

  // KPI 계산
  const kpis = useMemo(() => 
    calculateKpis(realtimeData, waterLevel, flowVelocity, discharge), 
    [realtimeData, waterLevel, flowVelocity, discharge]
  )

  const riskLevel = useMemo(() => 
    calculateRiskLevel(kpis.levelCm), 
    [kpis.levelCm]
  )

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
        fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col
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

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 위치 선택 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">모니터링 위치</h3>
            <div className="space-y-2">
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    console.log('위치 변경:', location.id)
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
                    <LocationStatus status={location.status} />
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
                <OnlineStatus isOnline={isOnline} />
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-4 w-4 text-blue-500" />
                <div className="text-sm">
                  <div>마지막 업데이트</div>
                  <div className="text-xs text-gray-500">{formatTime(lastUpdate)}</div>
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
                  위도: {flowInfo.flow_latitude?.toFixed(2)}<br/>
                  경도: {flowInfo.flow_longitude?.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* 알림 설정 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">알림 설정</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setShowNotificationSettings(true)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <Bell className="h-4 w-4" />
                <span className="text-sm">알림 설정</span>
              </button>
              <button 
                onClick={() => setShowSystemSettings(true)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
              >
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
                    {flowInfo?.flow_name || '모니터링 지점'} | 실시간 분석 시스템
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
                {isLoading ? <LoadingSpinner size="small" /> : <RefreshCw className="h-4 w-4" />}
              </button>

              {/* 관리자 전용 회원 추가 버튼 */}
              {isAdmin && (
                <button
                  onClick={() => setShowUserManagement(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                  title="회원 추가"
                >
                  <UserPlus className="h-3 w-3" />
                  <span className="hidden sm:inline">회원 추가</span>
                </button>
              )}

              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                riskLevel.level === 'critical' ? 'text-white bg-red-500' :
                riskLevel.level === 'warning' ? 'text-white bg-yellow-500' :
                'text-white bg-green-500'
              }`}>
                {riskLevel.label}
              </div>

              {/* 사용자 정보 드롭다운 */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">
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
              isConnecting={connectionStatus === 'connecting'}
            />
            <KpiCard
              title="유속"
              value={`${kpis.velocityMs.toFixed(1)}`}
              unit="m/s"
              subtitle="광학 유속계"
              icon={<Wind className="h-5 w-5" />}
              color="green"
              isConnecting={connectionStatus === 'connecting'}
            />
            <KpiCard
              title="유량"
              value={`${kpis.dischargeM3s.toFixed(1)}`}
              unit="m³/s"
              subtitle="Q = A × v"
              icon={<Droplets className="h-5 w-5" />}
              color="cyan"
              isConnecting={connectionStatus === 'connecting'}
            />
            <KpiCard
              title="기온"
              value={
                currentTemperature.loading ? "..." : 
                (currentTemperature.temperature !== null ? currentTemperature.temperature.toFixed(1) : "-")
              }
              unit={currentTemperature.temperature !== null ? "°C" : ""}
              subtitle={
                currentTemperature.loading ? "로딩 중..." : 
                (currentTemperature.temperature !== null ? "현재 온도" : "데이터 없음")
              }
              icon={<Thermometer className="h-5 w-5" />}
              color="orange"
            />
          </div>

          {/* CCTV 및 알림/지도 영역 */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* CCTV 실시간 분석 */}
            <div className="xl:col-span-2">
              <Panel title="CCTV 실시간 분석" subtitle={`${currentLocation?.name || '중앙'} - ${flowInfo?.flow_region || '모니터링'} 위치`}>
                <VideoPlayer 
                  videoPath={currentLocation?.videoPath || "/videos/영오지하도.mp4"}
                  waterLevel={kpis.levelCm}
                  realtimeData={realtimeData}
                  videoKey={videoKey}
                />
              </Panel>
            </div>

            {/* 알림 및 지도 */}
            <div className="space-y-6">
              <Panel title="실시간 알림">
                <div className="space-y-2 h-64 overflow-y-auto">
                  {alerts.length > 0 ? alerts.map((alert, index) => (
                    <div
                      key={`${alert.id}-${index}`}
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
                  <KakaoMap flowInfo={flowInfo} />
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• {flowInfo?.flow_name || '영오지하차도'}</div>
                    <div>• {flowInfo?.flow_address}</div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* 차트 영역 */}
          <ChartsSection 
            waterLevel={waterLevel}
            flowVelocity={flowVelocity}
            discharge={discharge}
          />
        </main>

        {/* 푸터 */}
        <footer className="p-4 border-t bg-white/50">
          <div className="text-xs text-gray-500 text-center">
            © 2025 AI CCTV 수위 모니터링 시스템 · 실시간 분석 대시보드
          </div>
        </footer>
      </div>

      {/* 세션 타임아웃 모달 */}
      <SessionTimeoutModal
        isOpen={showTimeoutModal}
        remainingSeconds={sessionRemainingTime}
        onExtend={handleSessionExtend}
        onLogout={handleSessionLogout}
      />

      {/* 설정 모달들 */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        userInfo={userInfo}
      />
      
      <SystemSettings
        isOpen={showSystemSettings}
        onClose={() => setShowSystemSettings(false)}
      />

      {/* 회원 관리 모달 (관리자만) */}
      {isAdmin && (
        <UserManagementModal
          isOpen={showUserManagement}
          onClose={() => setShowUserManagement(false)}
          onAddUser={handleAddUser}
        />
      )}
    </div>
  )
}

