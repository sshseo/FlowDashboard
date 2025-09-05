import { useState, useEffect } from 'react';

export const useSystemSettings = () => {
  const [settings, setSettings] = useState({
    updateInterval: 30,
    videoQuality: 'standard',
    password: ''
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('systemSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to parse system settings:', error);
      }
    }
  }, []);

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('systemSettings', JSON.stringify(newSettings));
  };

  return {
    settings,
    updateSettings
  };
};

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    warningLevel: 70,
    notificationMethod: 'browser'
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to parse notification settings:', error);
      }
    }
  }, []);

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  return {
    settings,
    updateSettings
  };
};