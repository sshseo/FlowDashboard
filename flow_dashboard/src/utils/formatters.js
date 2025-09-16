// 날짜/시간 포맷팅 유틸리티
export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('ko-KR')
}

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('ko-KR')
}

// 숫자 포맷팅
export const formatNumber = (value, decimals = 1) => {
  return Number(value).toFixed(decimals)
}

// 위험도 계산 (알림 설정값 사용)
export const calculateRiskLevel = (waterLevel, notificationSettings = null) => {
  let warningLevel = 10; // 기본값
  let dangerLevel = 15;  // 기본값

  // 전달받은 설정이 있으면 우선 사용
  if (notificationSettings) {
    warningLevel = notificationSettings.warningLevel || 10;
    dangerLevel = notificationSettings.dangerLevel || 15;
  } else {
    // 전달받은 설정이 없으면 로컬스토리지에서 가져오기 (백업용)
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        warningLevel = settings.warningLevel || 10;
        dangerLevel = settings.dangerLevel || 15;
      } catch (error) {
        console.warn('알림 설정 파싱 실패, 기본값 사용');
      }
    }
  }

  if (waterLevel > dangerLevel) return { level: 'critical', label: '위험', color: 'text-red-500' }
  if (waterLevel > warningLevel) return { level: 'warning', label: '주의', color: 'text-yellow-500' }
  return { level: 'safe', label: '안전', color: 'text-green-500' }
}

// KPI 데이터 계산
export const calculateKpis = (realtimeData, waterLevel, flowVelocity, discharge) => {
  if (realtimeData) {
    return {
      levelCm: realtimeData.flow_waterlevel || 0,
      velocityMs: realtimeData.flow_rate || 0,
      dischargeM3s: realtimeData.flow_flux || 0,
      trend: 0
    }
  }

  const latestWater = waterLevel[waterLevel.length - 1]
  const latestVelocity = flowVelocity[flowVelocity.length - 1]
  const latestDischarge = discharge[discharge.length - 1]

  return {
    levelCm: latestWater?.h ?? 0,
    velocityMs: latestVelocity?.v ?? 0,
    dischargeM3s: latestDischarge?.q ?? 0,
    trend: waterLevel.length > 1 ?
      ((latestWater?.h ?? 0) - (waterLevel[waterLevel.length - 2]?.h ?? 0)) : 0
  }
}