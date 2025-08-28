import React from 'react'
import { AlertCircle, MapPin } from 'lucide-react'

export const ErrorMessage = ({ message, className = "" }) => (
  <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
    <span className="text-sm text-red-700">{message}</span>
  </div>
)

export const MapError = ({ error }) => (
  <div className="h-48 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 flex items-center justify-center">
    <div className="text-center text-sm text-red-600">
      <MapPin className="h-8 w-8 mx-auto mb-2 text-red-400" />
      <div className="font-medium">지도 로드 실패</div>
      <div className="text-xs mt-1">{error}</div>
    </div>
  </div>
)

export const ConnectionError = () => (
  <div className="text-center text-sm text-gray-500 py-8">
    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
    <div className="font-medium">연결 오류</div>
    <div className="text-xs mt-1">서버에 연결할 수 없습니다</div>
  </div>
)