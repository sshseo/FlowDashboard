// src/utils/sessionManager.js
class SessionManager {
  constructor() {
    this.timeoutId = null
    this.warningTimeoutId = null
    this.lastActivity = Date.now()
    this.sessionTimeout = 30 * 60 * 1000  // 30분 (밀리초)
    this.warningTime = 5 * 60 * 1000      // 5분 전 경고 (밀리초)
    this.onTimeoutCallback = null
    this.onWarningCallback = null
    this.isActive = false
    this.warningShown = false
    
    // 활동 감지 이벤트들
    this.activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'focus'
    ]
    
    this.handleActivity = this.handleActivity.bind(this)
  }

  /**
   * 세션 타임아웃 시작
   * @param {Function} onTimeout - 타임아웃 시 호출될 콜백
   * @param {Function} onWarning - 경고 시 호출될 콜백
   */
  start(onTimeout, onWarning) {
    this.onTimeoutCallback = onTimeout
    this.onWarningCallback = onWarning
    this.isActive = true
    this.warningShown = false
    
    // 활동 감지 이벤트 등록
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity, true)
    })
    
    // 페이지 가시성 변경 감지
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    
    // 브라우저 포커스 감지
    window.addEventListener('focus', this.handleActivity)
    window.addEventListener('blur', this.handleActivity)
    
    this.resetTimer()

    console.log('세션 타임아웃 관리 시작')
  }

  /**
   * 세션 타임아웃 중지
   */
  stop() {
    this.isActive = false
    
    // 타이머 정리
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId)
      this.warningTimeoutId = null
    }
    
    // 이벤트 리스너 제거
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleActivity, true)
    })
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    window.removeEventListener('focus', this.handleActivity)
    window.removeEventListener('blur', this.handleActivity)
    
    console.log('세션 타임아웃 관리 중지')
  }

  /**
   * 사용자 활동 감지 처리
   */
  handleActivity() {
    if (!this.isActive) return

    // 경고가 이미 표시된 상태에서는 활동 감지 무시 (모달 카운트다운 방해 방지)
    if (this.warningShown) {
      return
    }

    const now = Date.now()

    // 활동이 너무 빈번하게 감지되는 것을 방지 (1초 간격)
    if (now - this.lastActivity < 1000) return

    this.lastActivity = now
    this.resetTimer()
  }

  /**
   * 페이지 가시성 변경 처리
   */
  handleVisibilityChange() {
    if (!document.hidden) {
      // 페이지가 다시 보이게 되었을 때 활동으로 간주
      this.handleActivity()
    }
  }

  /**
   * 타이머 재설정
   */
  resetTimer() {
    if (!this.isActive) return
    
    // 기존 타이머 정리
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId)
    }
    
    // 경고 타이머 설정 - 경고가 이미 표시되지 않은 경우에만
    if (!this.warningShown) {
      this.warningTimeoutId = setTimeout(() => {
        if (this.isActive && this.onWarningCallback && !this.warningShown) {
          console.log('세션 타임아웃 경고 (5분 남음)')
          this.warningShown = true
          this.onWarningCallback()
        }
      }, this.sessionTimeout - this.warningTime)
    }

    // 타임아웃 타이머 설정
    this.timeoutId = setTimeout(() => {
      if (this.isActive && this.onTimeoutCallback) {
        console.log('세션 타임아웃 - 자동 로그아웃')
        this.onTimeoutCallback()
      }
    }, this.sessionTimeout)
  }

  /**
   * 세션 타임아웃 설정
   * @param {number} sessionTimeout - 세션 타임아웃 (밀리초)
   * @param {number} warningTime - 경고 시간 (밀리초)
   */
  setSessionTimeout(sessionTimeout, warningTime) {
    this.sessionTimeout = sessionTimeout
    this.warningTime = warningTime
    console.log(`세션 타임아웃 설정: ${sessionTimeout/1000/60}분, 경고: ${warningTime/1000/60}분 전`)
  }

  /**
   * 세션 연장
   */
  extend() {
    if (!this.isActive) return
    
    console.log('세션 연장됨')
    this.lastActivity = Date.now()
    this.warningShown = false // 세션 연장 시 경고 상태 초기화
    this.resetTimer()
  }

  /**
   * 남은 시간 계산 (초 단위)
   */
  getRemainingTime() {
    if (!this.isActive) return 0
    
    const elapsed = Date.now() - this.lastActivity
    const remaining = Math.max(0, this.sessionTimeout - elapsed)
    return Math.floor(remaining / 1000)
  }

  /**
   * 세션이 곧 만료되는지 확인
   */
  isNearExpiry() {
    const remaining = this.getRemainingTime()
    return remaining <= (this.warningTime / 1000) && remaining > 0
  }

  /**
   * 세션 상태 정보
   */
  getStatus() {
    return {
      isActive: this.isActive,
      lastActivity: new Date(this.lastActivity),
      remainingSeconds: this.getRemainingTime(),
      isNearExpiry: this.isNearExpiry()
    }
  }
}

// 싱글톤 인스턴스
const sessionManager = new SessionManager()
export default sessionManager