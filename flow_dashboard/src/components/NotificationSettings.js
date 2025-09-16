import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle } from 'lucide-react';
import { apiService } from '../services/apiService';

const NotificationSettings = ({ isOpen, onClose, userInfo }) => {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    warningLevel: 10,      // 주의 수위 (노란색)
    dangerLevel: 15        // 위험 수위 (빨간색)
  });
  const [loading, setLoading] = useState(false);

  // 관리자 권한 확인 (user_level이 0인 경우만 관리자)
  const isAdmin = userInfo && userInfo.user_level === 0;

  // 알림 설정 로드
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotificationSettings();
      if (response) {
        setSettings({
          notificationsEnabled: response.setting_alert,
          warningLevel: response.warning_level,
          dangerLevel: response.danger_level
        });
      }
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
      // 오류 시 로컬스토리지 폴백
      const savedSettings = localStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // 모달이 열려있을 때 body 스크롤 비활성화
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const saveSettings = async () => {
    // 유효성 검사
    if (settings.dangerLevel <= settings.warningLevel) {
      alert('위험 수위는 주의 수위보다 높게 설정해야 합니다.');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.updateNotificationSettings(settings);
      if (response) {
        // 성공 시 로컬스토리지도 업데이트 (백업용)
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
        console.log('알림 설정 저장 성공:', settings);
        alert('알림 설정이 저장되었습니다.');
        onClose();
      }
    } catch (error) {
      console.error('알림 설정 저장 실패:', error);
      alert(error.message || '알림 설정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
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
            <Bell className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">알림 설정</h2>
            {!isAdmin && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                읽기 전용
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 권한 안내 메시지 */}
        {!isAdmin && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">관리자 권한 필요</p>
                <p>알림 설정 변경은 관리자 계정에서만 가능합니다. 현재 설정을 확인만 할 수 있습니다.</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* 알림 ON/OFF */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              알림 활성화
            </label>
            <button
              onClick={() => isAdmin && handleChange('notificationsEnabled', !settings.notificationsEnabled)}
              disabled={!isAdmin}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationsEnabled ? 'bg-blue-500' : 'bg-gray-200'
              } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 수위 임계값 설정 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">수위 임계값 설정</h3>
            
            {/* 주의 수위 */}
            <div>
              <label className="block text-sm font-medium text-yellow-600 mb-2">
                주의 수위 (노란색 경고)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={settings.warningLevel}
                  onChange={(e) => isAdmin && handleChange('warningLevel', parseInt(e.target.value))}
                  disabled={!isAdmin}
                  className={`flex-1 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <div className="flex items-center gap-1 min-w-[60px]">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{settings.warningLevel}cm</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">5-20cm 범위에서 설정</p>
            </div>

            {/* 위험 수위 */}
            <div>
              <label className="block text-sm font-medium text-red-600 mb-2">
                위험 수위 (빨간색 위험)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={settings.dangerLevel}
                  onChange={(e) => isAdmin && handleChange('dangerLevel', parseInt(e.target.value))}
                  disabled={!isAdmin}
                  className={`flex-1 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <div className="flex items-center gap-1 min-w-[60px]">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">{settings.dangerLevel}cm</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">10-50cm 범위에서 설정</p>
            </div>

            {/* 임계값 유효성 검사 */}
            {settings.dangerLevel <= settings.warningLevel && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                ⚠️ 위험 수위는 주의 수위보다 높게 설정해야 합니다.
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
            disabled={!isAdmin || loading}
            className={`flex-1 px-4 py-2 rounded-lg ${
              isAdmin && !loading
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? '저장 중...' : (isAdmin ? '저장' : '관리자 권한 필요')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;