import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, ArrowLeft, Search, User, Users } from 'lucide-react';
import { apiService } from '../services/apiService';

export default function UserManagementPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [monitoringPoints, setMonitoringPoints] = useState([]);
  const [passwordErrors, setPasswordErrors] = useState([]);

  // 폼 데이터
  const [formData, setFormData] = useState({
    user_id: '',
    user_name: '',
    user_level: 1,
    password: '',
    phone: '',
    user_flow_uid: ''
  });

  // 회원 목록 로드
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers();
      if (response && response.users) {
        setUsers(response.users);
      }
    } catch (error) {
      setError('회원 목록을 불러오는데 실패했습니다.');
      console.error('회원 목록 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 모니터링 지점 로드
  const loadMonitoringPoints = async () => {
    try {
      console.log('모니터링 지점 로딩 시작...');
      const response = await apiService.getMonitoringPointsForUsers();
      console.log('모니터링 지점 응답:', response);
      if (response && response.monitoring_points) {
        console.log('모니터링 지점 설정:', response.monitoring_points);
        setMonitoringPoints(response.monitoring_points);
      } else {
        console.warn('모니터링 지점 응답에 monitoring_points가 없음:', response);
      }
    } catch (error) {
      console.error('모니터링 지점 로딩 실패:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadMonitoringPoints();
  }, []);

  // 검색 필터링
  const filteredUsers = users.filter(user =>
    user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 폼 데이터 변경
  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // 권한 레벨이 관리자(0)로 변경되면 user_flow_uid 리셋
      if (field === 'user_level' && value == 0) {
        newData.user_flow_uid = '';
      }

      return newData;
    });

    // 비밀번호 필드 변경 시 검증
    if (field === 'password' && value) {
      setPasswordErrors(validatePassword(value));
    } else if (field === 'password' && !value) {
      setPasswordErrors([]);
    }
  };

  // 회원 추가
  const handleAddUser = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.user_id.trim()) {
      alert('사용자 ID를 입력해주세요.');
      return;
    }
    if (!formData.user_name.trim()) {
      alert('사용자명을 입력해주세요.');
      return;
    }
    if (!formData.password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    // 비밀번호 검증
    const passwordValidationErrors = validatePassword(formData.password);
    if (passwordValidationErrors.length > 0) {
      alert(`비밀번호는 다음 조건을 만족해야 합니다:\n• ${passwordValidationErrors.join('\n• ')}`);
      return;
    }
    if (formData.phone && formData.phone.trim()) {
      // 전화번호 형식 검증 (입력된 경우에만)
      const phonePattern = /^010-\d{4}-\d{4}$/;
      if (!phonePattern.test(formData.phone)) {
        alert('전화번호는 010-1234-5678 형식으로 입력해주세요.');
        return;
      }
    }
    if (formData.user_level !== 0 && !formData.user_flow_uid) {
      alert('일반 사용자는 담당 모니터링 지점을 선택해야 합니다.');
      return;
    }

    try {
      const submitData = { ...formData };
      if (formData.user_level === 0) {
        delete submitData.user_flow_uid; // 관리자는 지점 정보 제거
      } else {
        submitData.user_flow_uid = parseInt(submitData.user_flow_uid);
      }

      await apiService.createUser(submitData);
      await loadUsers();
      setShowAddForm(false);
      setFormData({ user_id: '', user_name: '', user_level: 1, password: '', phone: '', user_flow_uid: '' });
      alert('회원이 성공적으로 추가되었습니다.');
    } catch (error) {
      alert('회원 추가에 실패했습니다: ' + error.message);
    }
  };

  // 회원 수정
  const handleEditUser = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.user_name.trim()) {
      alert('사용자명을 입력해주세요.');
      return;
    }
    if (formData.phone && formData.phone.trim()) {
      // 전화번호 형식 검증 (입력된 경우에만)
      const phonePattern = /^010-\d{4}-\d{4}$/;
      if (!phonePattern.test(formData.phone)) {
        alert('전화번호는 010-1234-5678 형식으로 입력해주세요.');
        return;
      }
    }
    if (formData.user_level !== 0 && !formData.user_flow_uid) {
      alert('일반 사용자는 담당 모니터링 지점을 선택해야 합니다.');
      return;
    }

    try {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password; // 비밀번호가 비어있으면 업데이트하지 않음
      } else {
        // 비밀번호가 입력된 경우 검증
        const passwordValidationErrors = validatePassword(updateData.password);
        if (passwordValidationErrors.length > 0) {
          alert(`비밀번호는 다음 조건을 만족해야 합니다:\n• ${passwordValidationErrors.join('\n• ')}`);
          return;
        }
      }

      if (updateData.user_level === 0) {
        updateData.user_flow_uid = null; // 관리자는 지점 정보 null로 설정
      } else {
        updateData.user_flow_uid = parseInt(updateData.user_flow_uid);
      }

      await apiService.updateUser(editingUser.user_uid, updateData);
      await loadUsers();
      setEditingUser(null);
      setFormData({ user_id: '', user_name: '', user_level: 1, password: '', phone: '', user_flow_uid: '' });
      alert('회원 정보가 성공적으로 수정되었습니다.');
    } catch (error) {
      alert('회원 정보 수정에 실패했습니다: ' + error.message);
    }
  };

  // 회원 삭제
  const handleDeleteUser = async (user) => {
    if (window.confirm(`'${user.user_name}'님을 정말 삭제하시겠습니까?`)) {
      try {
        await apiService.deleteUser(user.user_uid);
        await loadUsers();
        alert('회원이 성공적으로 삭제되었습니다.');
      } catch (error) {
        alert('회원 삭제에 실패했습니다: ' + error.message);
      }
    }
  };

  // 수정 시작
  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      user_id: user.user_id,
      user_name: user.user_name,
      user_level: user.user_level,
      password: '',
      phone: user.user_phone || '',
      user_flow_uid: user.user_flow_uid || ''
    });
  };

  // 권한 레벨 텍스트
  const getUserLevelText = (level) => {
    switch (level) {
      case 0: return '관리자';
      case 1: return '일반 사용자';
      default: return '알 수 없음';
    }
  };

  // 권한 레벨 스타일
  const getUserLevelStyle = (level) => {
    switch (level) {
      case 0: return 'bg-red-100 text-red-800';
      case 1: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 지점 이름 가져오기
  const getPointName = (flowUid) => {
    if (!flowUid) return '-';
    const point = monitoringPoints.find(p => p.flow_uid == flowUid);
    return point ? point.label : `지점 ${flowUid}`;
  };

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

  return (
    <div className="h-full bg-white">
      {/* 헤더 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>대시보드로 돌아가기</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">회원 관리</h1>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 상단 컨트롤 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* 검색 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="회원명 또는 ID로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 회원 추가 버튼 */}
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingUser(null); // 편집 상태 초기화
              setFormData({ user_id: '', user_name: '', user_level: 1, password: '', phone: '', user_flow_uid: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            사용자 추가
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* 회원 추가/수정 폼 */}
        {(showAddForm || editingUser) && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-medium mb-4">
              {editingUser ? '회원 정보 수정' : '사용자 추가'}
            </h3>
            <form onSubmit={editingUser ? handleEditUser : handleAddUser}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사용자 ID
                  </label>
                  <input
                    type="text"
                    value={formData.user_id}
                    onChange={(e) => handleFormChange('user_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={editingUser} // 수정 시 ID 변경 불가
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사용자명
                  </label>
                  <input
                    type="text"
                    value={formData.user_name}
                    onChange={(e) => handleFormChange('user_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    권한 레벨
                  </label>
                  <select
                    value={formData.user_level}
                    onChange={(e) => handleFormChange('user_level', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>일반 사용자</option>
                    <option value={0}>관리자</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingUser ? '새 비밀번호 (선택)' : '비밀번호'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={!editingUser}
                  />
                  {/* 비밀번호 검증 결과 표시 */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-600 mb-1">비밀번호 조건:</div>
                      <div className="space-y-1">
                        <div className={`text-xs flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                          <span className="w-2 h-2 rounded-full bg-current"></span>
                          최소 8자 이상
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                          <span className="w-2 h-2 rounded-full bg-current"></span>
                          소문자 1개 이상
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${/\d/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                          <span className="w-2 h-2 rounded-full bg-current"></span>
                          숫자 1개 이상
                        </div>
                        <div className={`text-xs flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                          <span className="w-2 h-2 rounded-full bg-current"></span>
                          특수문자 1개 이상
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전화번호 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="010-1234-5678"
                  />
                </div>
                {formData.user_level !== 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      담당 모니터링 지점
                    </label>
                    <select
                      value={formData.user_flow_uid}
                      onChange={(e) => handleFormChange('user_flow_uid', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">지점을 선택하세요</option>
                      {monitoringPoints.length > 0 ? (
                        monitoringPoints.map((point) => (
                          <option key={point.flow_uid} value={point.flow_uid}>
                            {point.label}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>로딩 중...</option>
                      )}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingUser ? '수정' : '추가'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingUser(null);
                    setFormData({ user_id: '', user_name: '', user_level: 1, password: '', phone: '', user_flow_uid: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 회원 목록 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    회원 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    권한
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전화번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    담당 지점
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.user_uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-500" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.user_name}
                            </div>
                            <div className="text-sm text-gray-500">{user.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUserLevelStyle(user.user_level)}`}>
                          {getUserLevelText(user.user_level)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.user_phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.user_level === 0 ? '-' : getPointName(user.user_flow_uid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="수정"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900"
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 통계 정보 */}
        {!loading && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              총 {users.length}명의 회원이 등록되어 있습니다.
              {searchTerm && ` (검색 결과: ${filteredUsers.length}명)`}
            </span>
            <span>
              관리자: {users.filter(u => u.user_level === 0).length}명 |
              일반 사용자: {users.filter(u => u.user_level === 1).length}명
            </span>
          </div>
        )}
      </div>
    </div>
  );
}