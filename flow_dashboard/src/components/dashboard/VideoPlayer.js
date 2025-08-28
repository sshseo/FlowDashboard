import React from 'react'
import { formatTime } from '../../utils/formatters'

export default function VideoPlayer({ 
  videoPath, 
  waterLevel, 
  realtimeData, 
  videoKey 
}) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-900">
      <video
        key={videoKey}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={videoPath} type="video/mp4" />
        <source src={videoPath?.replace('.mp4', '.webm')} type="video/webm" />
      </video>

      {/* 수위 라인 표시 */}
      <div
        className="absolute left-0 right-0 border-t-2 border-blue-400 z-10"
        style={{ top: `${60 - (waterLevel / 20) * 30}%` }}
      />

      {/* 수위 감지 박스 */}
      <div
        className="absolute border-2 border-red-400 bg-red-400/20 z-10"
        style={{
          top: '20%',
          left: '65%',
          width: '8%',
          height: '40%'
        }}
      />

      {/* 오버레이 정보 */}
      <div className="absolute top-4 left-4 space-y-1 z-10">
        <div className="px-2 py-1 bg-black/60 text-white text-xs rounded">
          🔴 LIVE
        </div>
        <div className="px-2 py-1 bg-black/60 text-white text-xs rounded">
          수위: {waterLevel.toFixed(1)}cm
        </div>
        {realtimeData?.flow_time && (
          <div className="px-2 py-1 bg-black/60 text-white text-xs rounded">
            {formatTime(realtimeData.flow_time)}
          </div>
        )}
      </div>
    </div>
  )
}