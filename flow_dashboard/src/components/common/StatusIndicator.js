import React from 'react'
import { Wifi, WifiOff, Monitor, MonitorOff, RefreshCw } from 'lucide-react'

export const OnlineStatus = ({ isOnline, isChecking = false }) => (
  <div className="flex items-center gap-2 text-sm">
    {isChecking ? (
      <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
    ) : isOnline ? (
      <Wifi className="h-4 w-4 text-green-500" />
    ) : (
      <WifiOff className="h-4 w-4 text-red-500" />
    )}
    <span className={isOnline ? 'text-green-700' : 'text-red-700'}>
      {isChecking ? '확인 중...' : isOnline ? '시스템 온라인' : '시스템 오프라인'}
    </span>
  </div>
)

export const MonitoringStatus = ({ isActive, connectedSites = 0 }) => (
  <div className="flex items-center gap-2 text-sm">
    {isActive ? (
      <Monitor className="h-4 w-4 text-blue-500" />
    ) : (
      <MonitorOff className="h-4 w-4 text-gray-400" />
    )}
    <div className="flex-1">
      <div className={isActive ? 'text-blue-700' : 'text-gray-700'}>
        {isActive ? '모니터링 활성' : '모니터링 비활성'}
      </div>
      <div className="text-xs text-gray-500">
        {isActive ? `${connectedSites}개 지점 연결됨` : '연결된 지점 없음'}
      </div>
    </div>
  </div>
)

export const LocationStatus = ({ status }) => {
  const statusColors = {
    online: 'bg-green-500',
    maintenance: 'bg-yellow-500',
    offline: 'bg-red-500'
  }
  
  return (
    <div className={`w-2 h-2 rounded-full ${statusColors[status] || statusColors.offline}`} />
  )
}