import React, { useState, useEffect } from 'react';
import { Settings, X, Monitor, Clock, Key } from 'lucide-react';
import { useSystemSettings } from '../hooks/useSettings';
import { apiService } from '../services/apiService';

const SystemSettings = ({ isOpen, onClose }) => {
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useSystemSettings();
  const [settings, setSettings] = useState({
    updateInterval: 30,
    videoQuality: 'standard',
    password: ''
  });

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    // 글로벌 설정을 로컬 설정에 동기화
    setSettings(globalSettings);
  }, [globalSettings]);

  // 비밀번호 검증 함수
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('최소 8자 이상');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('소문자 1개 이상');
    }
    
    if (!/\d/.test(password)) {
      errors.push('숫자 1개 이상');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('특수문자 1개 이상');
    }
    
    return errors;
  };

  // 새 비밀번호 변경 핸들러
  const handleNewPasswordChange = (value) => {
    setNewPassword(value);
    setPasswordErrors(validatePassword(value));
    
    // 비밀번호 확인과 일치성 체크
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError('비밀번호가 일치하지 않습니다.');
    } else {
      setConfirmPasswordError('');
    }
  };

  // 비밀번호 확인 변경 핸들러
  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
    
    if (newPassword && value !== newPassword) {
      setConfirmPasswordError('비밀번호가 일치하지 않습니다.');
    } else {
      setConfirmPasswordError('');
    }
  };

  const saveSettings = async () => {
    if (showPasswordChange) {
      // 에러 상태 초기화
      setCurrentPasswordError('');
      setApiError('');
      
      if (!currentPassword) {
        setCurrentPasswordError('기존 비밀번호를 입력해주세요.');
        return;
      }
      
      if (passwordErrors.length > 0) {
        setApiError(`비밀번호 조건을 만족하지 않습니다: ${passwordErrors.join(', ')}`);
        return;
      }
      
      if (newPassword !== confirmPassword) {
        // 이미 confirmPasswordError에서 처리됨
        return;
      }

      // 실제 비밀번호 변경 API 호출
      try {
        setPasswordChanging(true);
        const result = await apiService.changePassword(currentPassword, newPassword);
        
        if (result && result.success) {
          setApiError('');
          setShowPasswordChange(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordErrors([]);
          setConfirmPasswordError('');
          setCurrentPasswordError('');
          alert('비밀번호가 성공적으로 변경되었습니다.'); // 성공 메시지는 alert 유지
        }
      } catch (error) {
        setApiError(error.message || '비밀번호 변경에 실패했습니다.');
        return;
      } finally {
        setPasswordChanging(false);
      }
    }

    // 다른 설정들은 localStorage에만 저장 (기존 로직 유지)
    const updatedSettings = { ...settings };
    updateGlobalSettings(updatedSettings);
    setSettings(updatedSettings);
    onClose();
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md m-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">시스템 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 데이터 업데이트 주기 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4" />
              데이터 업데이트 주기
            </label>
            <select
              value={settings.updateInterval}
              onChange={(e) => handleChange('updateInterval', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value={10}>10초</option>
              <option value={30}>30초</option>
              <option value={60}>1분</option>
            </select>
          </div>

          {/* CCTV 화질 설정 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Monitor className="h-4 w-4" />
              CCTV 화질
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="videoQuality"
                  value="high"
                  checked={settings.videoQuality === 'high'}
                  onChange={(e) => handleChange('videoQuality', e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">고화질 (더 선명, 더 많은 데이터)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="videoQuality"
                  value="standard"
                  checked={settings.videoQuality === 'standard'}
                  onChange={(e) => handleChange('videoQuality', e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">표준화질 (권장)</span>
              </label>
            </div>
          </div>


          {/* 비밀번호 변경 */}
          <div>
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-500"
            >
              <Key className="h-4 w-4" />
              비밀번호 변경
            </button>
            
            {showPasswordChange && (
              <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <input
                    type="password"
                    placeholder="기존 비밀번호"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setCurrentPasswordError(''); // 입력 시 에러 클리어
                    }}
                    className={`w-full p-2 border rounded text-sm ${
                      currentPasswordError ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {currentPasswordError && (
                    <div className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <span>✗</span>
                      {currentPasswordError}
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="새 비밀번호"
                    value={newPassword}
                    onChange={(e) => handleNewPasswordChange(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${
                      passwordErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {passwordErrors.length > 0 && (
                    <div className="mt-1 text-xs text-red-500">
                      <div className="font-medium mb-1">비밀번호 조건:</div>
                      {passwordErrors.map((error, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <span className="text-red-500">✗</span>
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                  {newPassword && passwordErrors.length === 0 && (
                    <div className="mt-1 text-xs text-green-500 flex items-center gap-1">
                      <span>✓</span>
                      비밀번호가 보안 조건을 만족합니다
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="새 비밀번호 확인"
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${
                      confirmPasswordError ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {confirmPasswordError && (
                    <div className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <span>✗</span>
                      {confirmPasswordError}
                    </div>
                  )}
                  {confirmPassword && !confirmPasswordError && newPassword && (
                    <div className="mt-1 text-xs text-green-500 flex items-center gap-1">
                      <span>✓</span>
                      비밀번호가 일치합니다
                    </div>
                  )}
                </div>
                
                {/* API 에러 메시지 */}
                {apiError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    <div className="flex items-center gap-1">
                      <span>✗</span>
                      {apiError}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={saveSettings}
            disabled={passwordChanging}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordChanging ? '변경 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;