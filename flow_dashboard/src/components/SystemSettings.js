import React, { useState, useEffect } from 'react';
import { Settings, X, Key, MapPin, Plus, Edit, Trash2, Camera, Map } from 'lucide-react';
import { useSystemSettings } from '../hooks/useSettings';
import { apiService } from '../services/apiService';
import LocationPicker from './LocationPicker';

const SystemSettings = ({ isOpen, onClose, userInfo }) => {
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useSystemSettings();
  const [settings, setSettings] = useState({
    password: ''
  });

  // 관리자 권한 확인 (user_level이 0인 경우만 관리자)
  const isAdmin = userInfo && userInfo.user_level === 0;

  // 모니터링 지점 관리 상태
  const [monitoringPoints, setMonitoringPoints] = useState([]);
  const [showPointManagement, setShowPointManagement] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [showPointForm, setShowPointForm] = useState(false);
  const [pointForm, setPointForm] = useState({
    flow_name: '',
    flow_latitude: '',
    flow_longitude: '',
    flow_region: '',
    flow_address: ''
  });
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [pointError, setPointError] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // 카메라 관리 상태
  const [cameras, setCameras] = useState([]);
  const [showCameraManagement, setShowCameraManagement] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [showCameraForm, setShowCameraForm] = useState(false);
  const [cameraForm, setCameraForm] = useState({
    camera_name: '',
    camera_ip: '',
    flow_uid: ''
  });
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [cameraError, setCameraError] = useState('');

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

  // 모니터링 지점 데이터 로드
  const loadMonitoringPoints = async () => {
    if (!isAdmin) return;

    setLoadingPoints(true);
    setPointError('');

    try {
      const points = await apiService.getMonitoringPoints();
      setMonitoringPoints(points || []);
    } catch (error) {
      setPointError(error.message || '지점 목록을 불러오는데 실패했습니다.');
      console.error('지점 목록 로딩 실패:', error);
    } finally {
      setLoadingPoints(false);
    }
  };

  // 모니터링 지점 관리 패널 열 때 데이터 로드
  useEffect(() => {
    if (showPointManagement && isAdmin) {
      loadMonitoringPoints();
    }
  }, [showPointManagement, isAdmin]);

  // 카메라 데이터 로드
  const loadCameras = async () => {
    if (!isAdmin) return;

    setLoadingCameras(true);
    setCameraError('');

    try {
      const cameraList = await apiService.getAdminCameras();
      setCameras(cameraList || []);
    } catch (error) {
      setCameraError(error.message || '카메라 목록을 불러오는데 실패했습니다.');
      console.error('카메라 목록 로딩 실패:', error);
    } finally {
      setLoadingCameras(false);
    }
  };

  // 카메라 관리 패널 열 때 데이터 로드
  useEffect(() => {
    if (showCameraManagement && isAdmin) {
      loadCameras();
      // 카메라 폼에서 지점 선택을 위해 지점 목록도 로드
      if (monitoringPoints.length === 0) {
        loadMonitoringPoints();
      }
    }
  }, [showCameraManagement, isAdmin]);

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

  // 지점 저장 (추가/수정)
  const savePoint = async () => {
    if (!pointForm.flow_name || !pointForm.flow_latitude || !pointForm.flow_longitude) {
      setPointError('지점명, 위도, 경도는 필수 입력 항목입니다.');
      return;
    }

    try {
      setPointError('');

      const pointData = {
        flow_name: pointForm.flow_name,
        flow_latitude: parseFloat(pointForm.flow_latitude),
        flow_longitude: parseFloat(pointForm.flow_longitude),
        flow_region: pointForm.flow_region || null,
        flow_address: pointForm.flow_address || null
      };

      if (editingPoint) {
        // 수정
        await apiService.updateMonitoringPoint(editingPoint.flow_uid, pointData);
        alert('지점이 성공적으로 수정되었습니다.');
      } else {
        // 추가
        await apiService.createMonitoringPoint(pointData);
        alert('지점이 성공적으로 추가되었습니다.');
      }

      // 폼 초기화
      setPointForm({
        flow_name: '',
        flow_latitude: '',
        flow_longitude: '',
        flow_region: '',
        flow_address: ''
      });
      setEditingPoint(null);
      setShowPointForm(false);

      // 목록 새로고침
      await loadMonitoringPoints();

    } catch (error) {
      setPointError(error.message || '지점 저장에 실패했습니다.');
    }
  };

  // 지점 수정 시작
  const startEditPoint = (point) => {
    setEditingPoint(point);
    setShowPointForm(true);
    setPointForm({
      flow_name: point.flow_name || '',
      flow_latitude: point.flow_latitude?.toString() || '',
      flow_longitude: point.flow_longitude?.toString() || '',
      flow_region: point.flow_region || '',
      flow_address: point.flow_address || ''
    });
    setPointError('');
  };

  // 지점 삭제
  const deletePoint = async (point) => {
    if (!window.confirm(`'${point.flow_name}' 지점을 정말 삭제하시겠습니까?\n\n관련된 모든 측정 데이터도 함께 삭제됩니다.`)) {
      return;
    }

    try {
      setPointError('');
      await apiService.deleteMonitoringPoint(point.flow_uid);
      alert('지점이 성공적으로 삭제되었습니다.');

      // 목록 새로고침
      await loadMonitoringPoints();

    } catch (error) {
      setPointError(error.message || '지점 삭제에 실패했습니다.');
    }
  };

  // 폼 취소
  const cancelForm = () => {
    setPointForm({
      flow_name: '',
      flow_latitude: '',
      flow_longitude: '',
      flow_region: '',
      flow_address: ''
    });
    setEditingPoint(null);
    setShowPointForm(false);
    setPointError('');
  };

  // 카메라 저장 (추가/수정)
  const saveCamera = async () => {
    if (!cameraForm.camera_name || !cameraForm.camera_ip || !cameraForm.flow_uid) {
      setCameraError('카메라명, IP, 모니터링 지점은 필수 입력 항목입니다.');
      return;
    }

    try {
      setCameraError('');

      const cameraData = {
        camera_name: cameraForm.camera_name,
        camera_ip: cameraForm.camera_ip,
        flow_uid: parseInt(cameraForm.flow_uid)
      };

      if (editingCamera) {
        // 수정
        await apiService.updateCamera(editingCamera.camera_uid, cameraData);
        alert('카메라가 성공적으로 수정되었습니다.');
      } else {
        // 추가
        await apiService.createCamera(cameraData);
        alert('카메라가 성공적으로 추가되었습니다.');
      }

      // 폼 초기화
      setCameraForm({
        camera_name: '',
        camera_ip: '',
        flow_uid: ''
      });
      setEditingCamera(null);
      setShowCameraForm(false);

      // 목록 새로고침
      await loadCameras();

    } catch (error) {
      setCameraError(error.message || '카메라 저장에 실패했습니다.');
    }
  };

  // 카메라 수정 시작
  const startEditCamera = (camera) => {
    setEditingCamera(camera);
    setShowCameraForm(true);
    setCameraForm({
      camera_name: camera.camera_name || '',
      camera_ip: camera.camera_ip || '',
      flow_uid: camera.flow_uid?.toString() || ''
    });
    setCameraError('');
  };

  // 카메라 삭제
  const deleteCamera = async (camera) => {
    if (!window.confirm(`'${camera.camera_name}' 카메라를 정말 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setCameraError('');
      await apiService.deleteCamera(camera.camera_uid);
      alert('카메라가 성공적으로 삭제되었습니다.');

      // 목록 새로고침
      await loadCameras();

    } catch (error) {
      setCameraError(error.message || '카메라 삭제에 실패했습니다.');
    }
  };

  // 카메라 폼 취소
  const cancelCameraForm = () => {
    setCameraForm({
      camera_name: '',
      camera_ip: '',
      flow_uid: ''
    });
    setEditingCamera(null);
    setShowCameraForm(false);
    setCameraError('');
  };

  // 위치 선택 완료
  const handleLocationSelect = (location) => {
    setPointForm(prev => ({
      ...prev,
      flow_latitude: location.latitude.toString(),
      flow_longitude: location.longitude.toString(),
      flow_address: location.address || prev.flow_address
    }));
    setShowLocationPicker(false);
  };

  // 지도에서 위치 선택 버튼
  const openLocationPicker = () => {
    const initialLocation = pointForm.flow_latitude && pointForm.flow_longitude
      ? {
          lat: parseFloat(pointForm.flow_latitude),
          lng: parseFloat(pointForm.flow_longitude)
        }
      : null;

    setShowLocationPicker(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
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
          {/* 모니터링 지점 관리 */}
          <div>
            <button
              onClick={() => setShowPointManagement(!showPointManagement)}
              disabled={!isAdmin}
              className={`flex items-center gap-2 text-sm font-medium ${
                isAdmin ? 'text-gray-700 hover:text-blue-500' : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <MapPin className="h-4 w-4" />
              모니터링 지점 관리
              {!isAdmin && <span className="text-xs">(관리자 권한 필요)</span>}
            </button>

            {showPointManagement && isAdmin && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="space-y-3">
                  {/* 에러 메시지 */}
                  {pointError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                      {pointError}
                    </div>
                  )}

                  {/* 지점 추가 버튼 */}
                  <button
                    onClick={() => {
                      setEditingPoint(null);
                      setShowPointForm(true);
                      setPointForm({
                        flow_name: '',
                        flow_latitude: '',
                        flow_longitude: '',
                        flow_region: '',
                        flow_address: ''
                      });
                      setPointError('');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    <Plus className="h-4 w-4" />
                    새 지점 추가
                  </button>

                  {/* 지점 목록 */}
                  <div className="space-y-2">
                    {loadingPoints ? (
                      <div className="text-center py-4 text-sm text-gray-500">
                        로딩 중...
                      </div>
                    ) : monitoringPoints.length === 0 ? (
                      <div className="text-center py-4 text-sm text-gray-500">
                        등록된 모니터링 지점이 없습니다.
                      </div>
                    ) : (
                      monitoringPoints.map(point => (
                        <div key={point.flow_uid} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="text-sm">
                            <div className="font-medium">{point.flow_name}</div>
                            <div className="text-gray-500 text-xs">
                              {point.flow_address || `${point.flow_latitude}, ${point.flow_longitude}`}
                              {point.flow_region && ` (${point.flow_region})`}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditPoint(point)}
                              className="p-1 text-gray-500 hover:text-blue-500"
                              title="수정"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deletePoint(point)}
                              className="p-1 text-gray-500 hover:text-red-500"
                              title="삭제"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 지점 추가/수정 폼 */}
                  {showPointForm && (
                    <div className="p-3 bg-white rounded border space-y-3">
                      <h4 className="font-medium text-sm">
                        {editingPoint ? '지점 수정' : '새 지점 추가'}
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="지점명"
                          value={pointForm.flow_name}
                          onChange={(e) => setPointForm(prev => ({...prev, flow_name: e.target.value}))}
                          className="p-2 border rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="지역"
                          value={pointForm.flow_region}
                          onChange={(e) => setPointForm(prev => ({...prev, flow_region: e.target.value}))}
                          className="p-2 border rounded text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            step="0.000001"
                            placeholder="위도"
                            value={pointForm.flow_latitude}
                            onChange={(e) => setPointForm(prev => ({...prev, flow_latitude: e.target.value}))}
                            className="p-2 border rounded text-sm"
                          />
                          <input
                            type="number"
                            step="0.000001"
                            placeholder="경도"
                            value={pointForm.flow_longitude}
                            onChange={(e) => setPointForm(prev => ({...prev, flow_longitude: e.target.value}))}
                            className="p-2 border rounded text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={openLocationPicker}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                        >
                          <Map className="h-4 w-4" />
                          지도에서 위치 선택
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="주소"
                        value={pointForm.flow_address}
                        onChange={(e) => setPointForm(prev => ({...prev, flow_address: e.target.value}))}
                        className="w-full p-2 border rounded text-sm"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={savePoint}
                          disabled={loadingPoints}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                        >
                          {loadingPoints ? '저장 중...' : '저장'}
                        </button>
                        <button
                          onClick={cancelForm}
                          disabled={loadingPoints}
                          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 카메라 관리 */}
          <div>
            <button
              onClick={() => setShowCameraManagement(!showCameraManagement)}
              disabled={!isAdmin}
              className={`flex items-center gap-2 text-sm font-medium ${
                isAdmin ? 'text-gray-700 hover:text-blue-500' : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <Camera className="h-4 w-4" />
              카메라 관리
              {!isAdmin && <span className="text-xs">(관리자 권한 필요)</span>}
            </button>

            {showCameraManagement && isAdmin && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="space-y-3">
                  {/* 에러 메시지 */}
                  {cameraError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                      {cameraError}
                    </div>
                  )}

                  {/* 카메라 추가 버튼 */}
                  <button
                    onClick={() => {
                      setEditingCamera(null);
                      setShowCameraForm(true);
                      setCameraForm({
                        camera_name: '',
                        camera_ip: '',
                        flow_uid: ''
                      });
                      setCameraError('');
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    <Plus className="h-4 w-4" />
                    새 카메라 추가
                  </button>

                  {/* 카메라 목록 */}
                  <div className="space-y-2">
                    {loadingCameras ? (
                      <div className="text-center py-4 text-sm text-gray-500">
                        로딩 중...
                      </div>
                    ) : cameras.length === 0 ? (
                      <div className="text-center py-4 text-sm text-gray-500">
                        등록된 카메라가 없습니다.
                      </div>
                    ) : (
                      cameras.map(camera => (
                        <div key={camera.camera_uid} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="text-sm">
                            <div className="font-medium">{camera.camera_name}</div>
                            <div className="text-gray-500 text-xs">
                              IP: {camera.camera_ip}
                              {camera.flow_name && ` • 지점: ${camera.flow_name}`}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditCamera(camera)}
                              className="p-1 text-gray-500 hover:text-blue-500"
                              title="수정"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteCamera(camera)}
                              className="p-1 text-gray-500 hover:text-red-500"
                              title="삭제"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 카메라 추가/수정 폼 */}
                  {showCameraForm && (
                    <div className="p-3 bg-white rounded border space-y-3">
                      <h4 className="font-medium text-sm">
                        {editingCamera ? '카메라 수정' : '새 카메라 추가'}
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="카메라명 (예: CAM-001)"
                          value={cameraForm.camera_name}
                          onChange={(e) => setCameraForm(prev => ({...prev, camera_name: e.target.value}))}
                          className="p-2 border rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="카메라 IP (예: 192.168.1.101)"
                          value={cameraForm.camera_ip}
                          onChange={(e) => setCameraForm(prev => ({...prev, camera_ip: e.target.value}))}
                          className="p-2 border rounded text-sm"
                        />
                      </div>

                      <select
                        value={cameraForm.flow_uid}
                        onChange={(e) => setCameraForm(prev => ({...prev, flow_uid: e.target.value}))}
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="">모니터링 지점 선택</option>
                        {monitoringPoints.map(point => (
                          <option key={point.flow_uid} value={point.flow_uid}>
                            {point.flow_name} ({point.flow_region})
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <button
                          onClick={saveCamera}
                          disabled={loadingCameras}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                        >
                          {loadingCameras ? '저장 중...' : '저장'}
                        </button>
                        <button
                          onClick={cancelCameraForm}
                          disabled={loadingCameras}
                          className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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

      {/* 위치 선택 모달 */}
      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLocation={
          pointForm.flow_latitude && pointForm.flow_longitude
            ? {
                lat: parseFloat(pointForm.flow_latitude),
                lng: parseFloat(pointForm.flow_longitude)
              }
            : null
        }
      />
    </div>
  );
};

export default SystemSettings;