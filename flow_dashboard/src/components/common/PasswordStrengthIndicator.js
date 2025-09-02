import React from 'react'
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react'

export default function PasswordStrengthIndicator({ password, errors, strength, score }) {
  const getStrengthColor = () => {
    if (score >= 75) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStrengthIcon = () => {
    if (score >= 75) return <ShieldCheck className="h-4 w-4 text-green-600" />
    if (score >= 50) return <ShieldAlert className="h-4 w-4 text-yellow-600" />
    return <ShieldX className="h-4 w-4 text-red-600" />
  }

  const getProgressWidth = () => {
    return `${Math.min(score, 100)}%`
  }

  const getProgressColor = () => {
    if (score >= 75) return 'bg-green-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      {/* 강도 표시 */}
      <div className="flex items-center gap-2">
        {getStrengthIcon()}
        <span className={`text-xs font-medium ${getStrengthColor()}`}>
          패스워드 강도: {strength || '약함'}
        </span>
      </div>

      {/* 진행 바 */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: getProgressWidth() }}
        ></div>
      </div>

      {/* 에러 메시지 */}
      {errors && errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-1 text-xs text-red-600">
              <ShieldX className="h-3 w-3" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* 요구사항 체크리스트 */}
      <div className="space-y-1 text-xs">
        <div className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
          <span className="text-xs">✓</span>
          <span>8자 이상</span>
        </div>
        <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
          <span className="text-xs">✓</span>
          <span>소문자 포함</span>
        </div>
        <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
          <span className="text-xs">✓</span>
          <span>대문자 포함</span>
        </div>
        <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
          <span className="text-xs">✓</span>
          <span>숫자 포함</span>
        </div>
        <div className={`flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
          <span className="text-xs">✓</span>
          <span>특수문자 포함</span>
        </div>
      </div>
    </div>
  )
}