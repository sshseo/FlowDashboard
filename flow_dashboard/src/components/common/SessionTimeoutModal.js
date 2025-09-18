import React, { useState, useEffect, useRef } from 'react'
import { Clock, Shield, LogOut, RefreshCw } from 'lucide-react'

export default function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout
}) {
  const [countdown, setCountdown] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const onLogoutRef = useRef(onLogout)

  // onLogout 참조 업데이트
  useEffect(() => {
    onLogoutRef.current = onLogout
  }, [onLogout])

  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false)
      return
    }

    // 모달이 처음 열릴 때만 초기값 설정
    if (!isInitialized) {
      setCountdown(remainingSeconds)
      setIsInitialized(true)
    }
  }, [isOpen, remainingSeconds, isInitialized])

  useEffect(() => {
    if (!isOpen || !isInitialized) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onLogoutRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, isInitialized])
  

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              세션 만료 경고
            </h3>
            <p className="text-sm text-gray-500">
              보안을 위해 곧 자동 로그아웃됩니다
            </p>
          </div>
        </div>

        {/* 카운트다운 */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-red-600 mb-2">
            {formatTime(countdown)}
          </div>
          <p className="text-sm text-gray-600">
            위 시간 후 자동으로 로그아웃됩니다
          </p>
        </div>

        {/* 진행 바 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-red-500 h-2 rounded-full transition-all duration-1000"
            style={{ 
              width: `${Math.max(0, (countdown / remainingSeconds) * 100)}%` 
            }}
          ></div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">보안 정책</p>
              <p>
                사용자 보호를 위해 일정 시간 활동이 없으면 자동으로 로그아웃됩니다.
                계속 사용하시려면 "세션 연장" 버튼을 클릭하세요.
              </p>
            </div>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="flex gap-3">
          <button
            onClick={onExtend}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            세션 연장
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>

        {/* 추가 안내 */}
        <p className="text-xs text-gray-500 text-center mt-4">
          마우스나 키보드 활동으로 세션이 자동으로 연장됩니다
        </p>
      </div>
    </div>
  )
}