import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle } from 'lucide-react';

const NotificationSettings = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    warningLevel: 5,
    notificationMethod: 'browser'
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
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
            <Bell className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">알림 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 알림 ON/OFF */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              알림 활성화
            </label>
            <button
              onClick={() => handleChange('notificationsEnabled', !settings.notificationsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.notificationsEnabled ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 위험 수위 임계값 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              위험 수위 임계값 (cm)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="15"
                value={settings.warningLevel}
                onChange={(e) => handleChange('warningLevel', parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="flex items-center gap-1 min-w-[60px]">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">{settings.warningLevel}cm</span>
              </div>
            </div>
          </div>

          {/* 알림 방식 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              알림 방식
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="notificationMethod"
                  value="browser"
                  checked={settings.notificationMethod === 'browser'}
                  onChange={(e) => handleChange('notificationMethod', e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">브라우저 알림</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="notificationMethod"
                  value="email"
                  checked={settings.notificationMethod === 'email'}
                  onChange={(e) => handleChange('notificationMethod', e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">이메일 알림</span>
              </label>
            </div>
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
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;