import React, { useState, useEffect } from 'react';
import AICCTVFloodDashboard from './components/floodDashboard';
import LoginPage from './components/login';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 페이지 로드 시 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = () => {
      // 로그인 상태 초기화 - 항상 로그인 페이지부터 시작
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('loginTimestamp');
      setIsLoggedIn(false);
      setIsLoading(false);
    };

    checkLoginStatus();
  }, []);

  // 로그인 처리 함수
  const handleLogin = (rememberMe = false) => {
    setIsLoggedIn(true);

    if (rememberMe) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('loginTimestamp', new Date().getTime().toString());
    }
  };

  // 로그아웃 처리 함수
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loginTimestamp');
  };

  // 로딩 중일 때 표시할 화면
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-700">시스템 초기화 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {isLoggedIn ? (
        <AICCTVFloodDashboard onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;