import React, { useState, useEffect } from 'react';
import { Settings, X, Monitor, Clock, Key } from 'lucide-react';
import { useSystemSettings } from '../hooks/useSettings';

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

  useEffect(() => {
    // 글로벌 설정을 로컬 설정에 동기화
    setSettings(globalSettings);
  }, [globalSettings]);

  const saveSettings = () => {
    if (showPasswordChange) {
      if (!currentPassword) {
        alert('기존 비밀번호를 입력해주세요.');
        return;
      }
      
      // 기존 비밀번호 확인 (저장된 비밀번호와 비교)
      const savedPassword = globalSettings.password || 'admin'; // 기본값
      if (currentPassword !== savedPassword) {
        alert('기존 비밀번호가 일치하지 않습니다.');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        alert('새 비밀번호가 일치하지 않습니다.');
        return;
      }
      if (newPassword.length < 4) {
        alert('새 비밀번호는 4자리 이상이어야 합니다.');
        return;
      }
    }

    const updatedSettings = { ...settings };
    if (showPasswordChange && newPassword) {
      updatedSettings.password = newPassword;
    }

    // 글로벌 설정 업데이트 (자동으로 localStorage에 저장됨)
    updateGlobalSettings(updatedSettings);
    setSettings(updatedSettings);
    setShowPasswordChange(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
                <input
                  type="password"
                  placeholder="기존 비밀번호"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="password"
                  placeholder="새 비밀번호"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="password"
                  placeholder="새 비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
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
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;