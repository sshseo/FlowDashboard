import { API_BASE_URL } from '../utils/constants'

// 인증 관련 서비스
export const authService = {
  // 로그인
  login: async (username, password, rememberMe = false) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        rememberMe
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || '로그인에 실패했습니다.')
    }

    return data
  },

  // 토큰 저장
  saveToken: (token, userInfo, rememberMe) => {
    if (rememberMe) {
      localStorage.setItem('access_token', token)
      localStorage.setItem('user_info', JSON.stringify(userInfo))
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('loginTimestamp', new Date().getTime().toString())
    } else {
      sessionStorage.setItem('access_token', token)
      sessionStorage.setItem('user_info', JSON.stringify(userInfo))
    }
  },

  // 로그아웃
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_info')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('loginTimestamp')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('user_info')
  },

  // 현재 사용자 정보 가져오기
  getCurrentUser: () => {
    const userInfo = localStorage.getItem('user_info') || sessionStorage.getItem('user_info')
    return userInfo ? JSON.parse(userInfo) : null
  },

  // 로그인 상태 확인
  isLoggedIn: () => {
    return !!(localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
  },

  // 토큰 가져오기
  getToken: () => {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
  }
}