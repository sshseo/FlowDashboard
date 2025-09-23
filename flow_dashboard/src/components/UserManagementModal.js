import React, { useState, useEffect } from 'react'
import { X, UserPlus, Eye, EyeOff } from 'lucide-react'
import { apiService } from '../services/apiService'

const UserManagementModal = ({ isOpen, onClose, onAddUser }) => {
  const [formData, setFormData] = useState({
    user_id: '',
    password: '',
    confirmPassword: '',
    user_name: '',
    user_level: '1',
    user_flow_uid: '',
    phone: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [monitoringPoints, setMonitoringPoints] = useState([])
  const [loadingMonitoringPoints, setLoadingMonitoringPoints] = useState(false)

  const userLevels = [
    { value: '0', label: '관리자' },
    { value: '1', label: '운영자' },
    { value: '2', label: '모니터링' }
  ]

  // 모니터링 지점 목록 로드
  const loadMonitoringPoints = async () => {
    try {
      setLoadingMonitoringPoints(true)
      const response = await apiService.getMonitoringPointsForUsers()
      if (response && response.monitoring_points) {
        setMonitoringPoints([
          { value: '', label: '모니터링 지점 선택' },
          ...response.monitoring_points
        ])
      }
    } catch (error) {
      console.error('모니터링 지점 목록 로드 실패:', error)
      // 오류 시 기본값 사용
      setMonitoringPoints([
        { value: '', label: '모니터링 지점 선택' }
      ])
    } finally {
      setLoadingMonitoringPoints(false)
    }
  }

  // 모달이 열려있을 때 body 스크롤 비활성화 및 모니터링 지점 목록 로드
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      loadMonitoringPoints(); // 모달 열릴 때 모니터링 지점 목록 로드
    } else {
      document.body.style.overflow = 'unset';
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target

    // 권한이 관리자(0)로 변경되면 모니터링 지점을 초기화
    if (name === 'user_level' && value === '0') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        user_flow_uid: ''
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.user_id.trim()) {
      newErrors.user_id = '아이디를 입력하세요'
    } else if (formData.user_id.length < 3) {
      newErrors.user_id = '아이디는 3자 이상 입력하세요'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력하세요'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상 입력하세요'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호를 확인해주세요'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
    }

    if (!formData.user_name.trim()) {
      newErrors.user_name = '사용자 이름을 입력하세요'
    }

    // 운영자/모니터링 레벨은 모니터링 지점 선택 필수
    if ((formData.user_level === '1' || formData.user_level === '2') && !formData.user_flow_uid) {
      newErrors.user_flow_uid = '모니터링 지점을 선택하세요'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '전화번호를 입력하세요'
    } else if (!/^010-?\d{4}-?\d{4}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = '올바른 전화번호 형식으로 입력하세요 (예: 010-1234-5678)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const userData = {
        user_id: formData.user_id.trim(),
        password: formData.password,
        user_name: formData.user_name.trim(),
        user_level: parseInt(formData.user_level),
        user_flow_uid: formData.user_flow_uid ? parseInt(formData.user_flow_uid) : null,
        phone: formData.phone.replace(/\s/g, '')
      }
      
      await onAddUser(userData)

      setFormData({
        user_id: '',
        password: '',
        confirmPassword: '',
        user_name: '',
        user_level: '1',
        user_flow_uid: '',
        phone: ''
      })
      setErrors({})
      onClose()
    } catch (error) {
      setErrors({ submit: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        user_id: '',
        password: '',
        confirmPassword: '',
        user_name: '',
        user_level: '1',
        user_flow_uid: '',
        phone: ''
      })
      setErrors({})
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">회원 추가</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              아이디 *
            </label>
            <input
              type="text"
              name="user_id"
              value={formData.user_id}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                errors.user_id ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="사용자 아이디를 입력하세요"
            />
            {errors.user_id && <p className="text-red-500 text-xs mt-1">{errors.user_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 disabled:opacity-50 ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="8자 이상 입력하세요"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인 *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 disabled:opacity-50 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="비밀번호를 다시 입력하세요"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사용자 이름 *
            </label>
            <input
              type="text"
              name="user_name"
              value={formData.user_name}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                errors.user_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="실제 이름을 입력하세요"
            />
            {errors.user_name && <p className="text-red-500 text-xs mt-1">{errors.user_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사용자 등급 *
            </label>
            <select
              name="user_level"
              value={formData.user_level}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {userLevels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* 모니터링 지점 선택 (관리자가 아닌 경우만) */}
          {formData.user_level !== '0' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                담당 모니터링 지점 *
              </label>
              <select
                name="user_flow_uid"
                value={formData.user_flow_uid}
                onChange={handleInputChange}
                disabled={isSubmitting || loadingMonitoringPoints}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                  errors.user_flow_uid ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {loadingMonitoringPoints ? (
                  <option value="">모니터링 지점 목록 로딩 중...</option>
                ) : (
                  monitoringPoints.map(point => (
                    <option key={point.value} value={point.value}>
                      {point.label}
                    </option>
                  ))
                )}
              </select>
              {errors.user_flow_uid && <p className="text-red-500 text-xs mt-1">{errors.user_flow_uid}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {formData.user_level === '1' ? '운영자는 선택한 지점의 알림만 받습니다' : '모니터링 담당 지점을 선택하세요'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              전화번호 *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="010-1234-5678"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '등록 중...' : '회원 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserManagementModal