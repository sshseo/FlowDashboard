import { API_BASE_URL } from '../utils/constants'

// API 호출 서비스
export const apiService = {
  // 인증 헤더 생성
  getAuthHeaders: () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  },

  // 실시간 데이터 가져오기
  getRealtimeData: async (locationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/realtime/${locationId}`, {
        headers: apiService.getAuthHeaders()
      })
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('실시간 데이터 로딩 실패:', error)
      return null
    }
  },

  // 시계열 데이터 가져오기
  getTimeseriesData: async (locationId, timeRange = '1h') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/timeseries/${locationId}?range=${timeRange}`, {
        headers: apiService.getAuthHeaders()
      })
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('시계열 데이터 로딩 실패:', error)
      return null
    }
  },

  // 알림 목록 가져오기
  getAlerts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts`, {
        headers: apiService.getAuthHeaders()
      })
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('알림 데이터 로딩 실패:', error)
      return null
    }
  },

  // 하천 정보 가져오기
  getFlowInfo: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/info`, {
        headers: apiService.getAuthHeaders()
      })
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('하천 정보 로딩 실패:', error)
      return null
    }
  },

  // 서버 상태 확인
  checkServerHealth: async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return await response.json()
      } else {
        throw new Error('Server responded with error')
      }
    } catch (error) {
      console.log('서버 상태 확인 실패:', error.message)
      throw error
    }
  }
}