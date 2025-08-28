import React from 'react'

export const LoadingSpinner = ({ size = 'default' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-6 w-6',
    large: 'h-8 w-8'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-blue-600 border-t-transparent ${sizeClasses[size]}`} />
  )
}

export const LoadingOverlay = ({ message = '로딩 중...' }) => (
  <div className="flex items-center justify-center gap-2">
    <LoadingSpinner />
    <span className="text-sm text-gray-600">{message}</span>
  </div>
)

export const MapLoading = () => (
  <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border flex items-center justify-center">
    <div className="text-center text-sm text-gray-600">
      <LoadingSpinner />
      <div className="font-medium mt-2">지도 로딩 중...</div>
    </div>
  </div>
)