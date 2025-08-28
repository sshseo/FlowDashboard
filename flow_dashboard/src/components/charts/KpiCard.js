import React from 'react'
import { TrendingUp } from 'lucide-react'
import { colorClasses } from '../../styles/commonStyles'
import { formatNumber } from '../../utils/formatters'

export default function KpiCard({ 
  title, 
  value, 
  unit, 
  subtitle, 
  icon, 
  trend, 
  color = "blue" 
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
      <div className="flex items-baseline gap-1">
        <div className="text-2xl font-bold">{formatNumber(value)}</div>
        <div className="text-sm text-gray-500">{unit}</div>
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}