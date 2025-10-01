import React, { useState } from 'react'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { ErrorMessage } from '../common/ErrorMessage'
import { LoadingSpinner } from '../common/Loading'
import { authService } from '../../services/authService'

export default function LoginForm({ onLogin, serverStatus }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
  }

  const handleSubmit = async () => {
    // 공백 제거 후 검증
    const trimmedUsername = formData.username.trim()
    const trimmedPassword = formData.password.trim()

    if (!trimmedUsername || !trimmedPassword) {
      setError('사용자명과 비밀번호를 모두 입력해주세요.')
      return
    }

    if (!serverStatus.isOnline) {
      setError('서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const data = await authService.login(trimmedUsername, trimmedPassword, rememberMe)
      
      authService.saveToken(data.access_token, data.user_info, rememberMe)
      onLogin(rememberMe, data.user_info)

    } catch (err) {
      console.error('로그인 오류:', err)

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
      } else if (err.status === 429) {
        setError('로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.')
      } else {
        setError(err.message || '로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {error && <ErrorMessage message={error} />}

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
            onClick={() => setShowContactInfo(!showContactInfo)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            disabled={isLoading}
          >
            비밀번호 찾기
          </button>
        </div>

        {/* 관리자 연락처 정보 */}
        {showContactInfo && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">비밀번호 찾기</div>
              <div className="text-blue-700">
                아래 관리자 번호로 문의하세요
              </div>
              <div className="mt-2 font-mono text-blue-900">
                📞 010-1234-5678
              </div>
              <div className="text-xs text-blue-600 mt-2">
                평일 09:00 ~ 18:00 (주말 및 공휴일 제외)
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || !formData.username.trim() || !formData.password.trim() || !serverStatus.isOnline}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <LoadingSpinner size="small" />
              <span>로그인 중...</span>
            </div>
          ) : (
            '로그인'
          )}
        </button>
      </div>
    </div>
  )
}