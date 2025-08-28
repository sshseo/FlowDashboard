import React, { useState, useEffect } from 'react'
import {
  Waves, Shield
} from 'lucide-react'

// 모듈화된 임포트
import { UPDATE_INTERVALS } from '../utils/constants'
import { formatTime } from '../utils/formatters'
import { apiService } from '../services/apiService'
import { OnlineStatus, MonitoringStatus } from './common/StatusIndicator'
import LoginForm from './forms/LoginForm'

export default function LoginPage({ onLogin }) {
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
      const data = await apiService.checkServerHealth()
      setServerStatus(prev => ({
        ...prev,
        isOnline: data.status === 'healthy',
        isChecking: false,
        lastCheck: new Date(),
        version: data.version,
        monitoringStatus: {
          isActive: data.monitoring_active || false,
          connectedSites: data.connected_sites || 0
        }
      }))
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

    const interval = setInterval(checkServerStatus, UPDATE_INTERVALS.SERVER_STATUS)

    return () => clearInterval(interval)
  }, [])


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

          <LoginForm onLogin={onLogin} serverStatus={serverStatus} />
        </div>

        {/* 실시간 시스템 상태 정보 */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {/* 서버 연결 상태 */}
          <div className={`bg-white/80 backdrop-blur-sm rounded-lg p-3 border ${
            serverStatus.isOnline ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <OnlineStatus 
                isOnline={serverStatus.isOnline} 
                isChecking={serverStatus.isChecking} 
              />
              <button
                onClick={checkServerStatus}
                disabled={serverStatus.isChecking}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                title="상태 새로고침"
              >
                새로고침
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
                마지막 확인: {formatTime(serverStatus.lastCheck)}
              </div>
            )}
          </div>

          {/* 모니터링 시스템 상태 */}
          <div className={`bg-white/80 backdrop-blur-sm rounded-lg p-3 border ${
            serverStatus.monitoringStatus.isActive ? 'border-blue-200' : 'border-gray-200'
          }`}>
            <MonitoringStatus 
              isActive={serverStatus.monitoringStatus.isActive}
              connectedSites={serverStatus.monitoringStatus.connectedSites}
            />
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