import { API_BASE_URL } from '../utils/constants'
import { weatherService } from './weatherService'

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
  getRealtimeData: async (locationId, flowUid = 1) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/realtime/${locationId}?flow_uid=${flowUid}`, {
        headers: apiService.getAuthHeaders()
      })
      if (response.status === 401) {
        console.warn('토큰 만료됨, 로그아웃 처리')
        localStorage.removeItem('access_token')
        sessionStorage.removeItem('access_token')
        window.location.href = '/login'
        return null
      }
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('실시간 데이터 로딩 실패:', error)
      return null
    }
  },

  // 시계열 데이터 가져오기
  getTimeseriesData: async (locationId, timeRange = '7d', flowUid = 1) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/timeseries/${locationId}?range=${timeRange}&flow_uid=${flowUid}`, {
        headers: apiService.getAuthHeaders()
      })
      if (response.status === 401) {
        console.warn('토큰 만료됨, 로그아웃 처리')
        localStorage.removeItem('access_token')
        sessionStorage.removeItem('access_token')
        window.location.href = '/login'
        return null
      }
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

  // 카메라 목록 가져오기
  getCameras: async (flowUid = 1) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cameras/${flowUid}`, {
        headers: apiService.getAuthHeaders()
      })
      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('카메라 정보 로딩 실패:', error)
      return null
    }
  },

  // 서버 상태 확인
  checkServerHealth: async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), parseInt(process.env.REACT_APP_SERVER_HEALTH_TIMEOUT) || 5000)

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
  },

  // 현재 기온 정보 가져오기
  getCurrentTemperature: async (lat = null, lon = null) => {
    try {
      return await weatherService.getCurrentWeather(lat, lon)
    } catch (error) {
      console.error('온도 데이터 로딩 실패:', error)
      return weatherService.getMockTemperature()
    }
  },

  // 비밀번호 변경
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: apiService.getAuthHeaders(),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      })
      
      if (response.status === 401) {
        console.warn('토큰 만료됨, 로그아웃 처리')
        localStorage.removeItem('access_token')
        sessionStorage.removeItem('access_token')
        window.location.href = '/login'
        return null
      }
      
      if (!response.ok) {
        try {
          const errorData = await response.json()
          throw new Error(errorData.detail || '비밀번호 변경에 실패했습니다.')
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) {
            throw e // 이미 처리된 에러 메시지
          }
          throw new Error('비밀번호 변경에 실패했습니다.')
        }
      }
      
      return await response.json()
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.')
      }
      throw error
    }
  }
}