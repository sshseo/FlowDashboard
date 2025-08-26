import React, { useState, useEffect } from 'react'
import {
  Waves, Eye, EyeOff, Lock, User, Shield,
  AlertCircle, Wifi, WifiOff, Monitor, MonitorOff,
  RefreshCw
} from 'lucide-react'

// API 기본 URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001'

export default function LoginPage({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // 서버 상태 관리
  const [serverStatus, setServerStatus] = useState({
    isOnline: false,
    isChecking: true,
    lastCheck: null,
    version: null,
    monitoringStatus: {
      isActive: false,
      connectedSites: 0
    }
  })

  // 서버 상태 확인 함수
  const checkServerStatus = async () => {
    setServerStatus(prev => ({ ...prev, isChecking: true }))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5초 타임아웃

      const response = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        setServerStatus(prev => ({
          ...prev,
          isOnline: true,
          isChecking: false,
          lastCheck: new Date(),
          version: data.version,
          monitoringStatus: {
            isActive: true,
            connectedSites: 3 // 실제로는 API에서 가져와야 함
          }
        }))
      } else {
        throw new Error('Server responded with error')
      }
    } catch (err) {
      console.log('서버 상태 확인 실패:', err.message)
      setServerStatus(prev => ({
        ...prev,
        isOnline: false,
        isChecking: false,
        lastCheck: new Date(),
        version: null,
        monitoringStatus: {
          isActive: false,
          connectedSites: 0
        }
      }))
    }
  }

  // 컴포넌트 마운트 시 서버 상태 확인
  useEffect(() => {
    checkServerStatus()

    // 30초마다 서버 상태 확인
    const interval = setInterval(checkServerStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 입력 시 에러 메시지 초기화
    if (error) setError('')
  }

  const handleSubmit = async () => {
    // 기본 검증
    if (!formData.username || !formData.password) {
      setError('사용자명과 비밀번호를 모두 입력해주세요.')
      return
    }

    // 서버가 오프라인인 경우 경고
    if (!serverStatus.isOnline) {
      setError('서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // 백엔드 API 호출
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          rememberMe: rememberMe
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // HTTP 에러 처리
        setError(data.detail || '로그인에 실패했습니다.')
        return
      }

      // 로그인 성공 처리
      console.log('로그인 성공!', data)

      // JWT 토큰을 로컬 스토리지에 저장
      if (rememberMe) {
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('user_info', JSON.stringify(data.user_info))
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('loginTimestamp', new Date().getTime().toString())
      } else {
        // 세션 스토리지에만 저장 (브라우저 닫으면 삭제됨)
        sessionStorage.setItem('access_token', data.access_token)
        sessionStorage.setItem('user_info', JSON.stringify(data.user_info))
      }

      // 부모 컴포넌트에 로그인 성공 알림
      onLogin(rememberMe, data.user_info)

    } catch (err) {
      console.error('로그인 오류:', err)

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
        // 서버 상태 다시 확인
        checkServerStatus()
      } else {
        setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-100/30 rounded-full blur-3xl"></div>
      </div>

      {/* 로그인 카드 */}
      <div className="relative w-full max-w-md">
        {/* 메인 로그인 폼 */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Waves className="h-8 w-8" />
              <h1 className="text-2xl font-bold">AI CCTV</h1>
            </div>
            <p className="text-blue-100 text-sm">수위 모니터링 시스템</p>
          </div>

          {/* 폼 영역 */}
          <div className="p-6">
            <div className="space-y-4">
              {/* 에러 메시지 */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* 사용자명 입력 */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  사용자명
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="사용자명을 입력하세요"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* 비밀번호 입력 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="비밀번호를 입력하세요"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* 기억하기 체크박스 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600">로그인 상태 유지</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  비밀번호 찾기
                </button>
              </div>

              {/* 로그인 버튼 */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !formData.username || !formData.password || !serverStatus.isOnline}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>로그인 중...</span>
                  </div>
                ) : (
                  '로그인'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 실시간 시스템 상태 정보 */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {/* 서버 연결 상태 */}
          <div className={`bg-white/80 backdrop-blur-sm rounded-lg p-3 border ${
            serverStatus.isOnline ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm">
                {serverStatus.isChecking ? (
                  <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
                ) : serverStatus.isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className={`${
                  serverStatus.isOnline ? 'text-green-700' : 'text-red-700'
                }`}>
                  {serverStatus.isChecking ? '확인 중...' :
                   serverStatus.isOnline ? '시스템 온라인' : '시스템 오프라인'}
                </span>
              </div>
              <button
                onClick={checkServerStatus}
                disabled={serverStatus.isChecking}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                title="상태 새로고침"
              >
                <RefreshCw className={`h-3 w-3 ${serverStatus.isChecking ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {serverStatus.isOnline ? (
                <>
                  서버 정상 작동 중
                  {serverStatus.version && (
                    <div>v{serverStatus.version}</div>
                  )}
                </>
              ) : (
                '서버 연결 실패'
              )}
            </div>
            {serverStatus.lastCheck && (
              <div className="text-xs text-gray-400 mt-1">
                마지막 확인: {serverStatus.lastCheck.toLocaleTimeString('ko-KR')}
              </div>
            )}
          </div>

          {/* 모니터링 시스템 상태 */}
          <div className={`bg-white/80 backdrop-blur-sm rounded-lg p-3 border ${
            serverStatus.monitoringStatus.isActive ? 'border-blue-200' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              {serverStatus.monitoringStatus.isActive ? (
                <Monitor className="h-4 w-4 text-blue-500" />
              ) : (
                <MonitorOff className="h-4 w-4 text-gray-400" />
              )}
              <span className={`${
                serverStatus.monitoringStatus.isActive ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {serverStatus.monitoringStatus.isActive ? '모니터링 활성' : '모니터링 비활성'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {serverStatus.monitoringStatus.isActive ?
                `${serverStatus.monitoringStatus.connectedSites}개 지점 연결됨` :
                '연결된 지점 없음'
              }
            </div>
          </div>
        </div>

        {/* 계정 문의 안내 */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-gray-800">계정 관련 문의</div>
              <div className="text-gray-600 text-xs mt-1">
                아이디 · 비밀번호 분실 시 관리자에게 문의하세요
              </div>
              <div className="text-gray-500 text-xs mt-1">
                📞 문의전화: <span className="font-mono">010-1234-5678</span>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-6">
          <div className="text-xs text-gray-500">
            © 2025 AI CCTV 수위 모니터링 시스템
          </div>
          <div className="text-xs text-gray-400 mt-1">
            실시간 분석 대시보드 · 보안 로그인
          </div>
        </div>
      </div>
    </div>
  )
}