import React from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'
import { formatNumber } from '../../utils/formatters'

const colorClasses = {
  blue: "from-blue-50 to-blue-100 border-blue-200",
  green: "from-green-50 to-green-100 border-green-200", 
  cyan: "from-cyan-50 to-cyan-100 border-cyan-200",
  orange: "from-orange-50 to-orange-100 border-orange-200"
}

export default function KpiCard({ 
  title, 
  value, 
  unit, 
  subtitle, 
  icon, 
  trend, 
  color = "blue",
  isConnecting = false 
}) {
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
            {formatNumber(Math.abs(trend))}
          </div>
        )}
      </div>
      {isConnecting ? (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          <div className="text-sm text-gray-500">실시간 데이터 연결중</div>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-bold">{formatNumber(value)}</div>
            <div className="text-sm text-gray-500">{unit}</div>
          </div>
          {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
        </>
      )}
    </div>
  )
}