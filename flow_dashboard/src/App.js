import React, { useState, useEffect } from 'react';
import AICCTVFloodDashboard from './components/floodDashboard';
import LoginPage from './components/login';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  // 페이지 로드 시 로그인 상태 확인
  useEffect(() => {
    const checkLoginStatus = () => {
      try {
        // localStorage와 sessionStorage 둘 다 확인
        const localToken = localStorage.getItem('access_token');
        const sessionToken = sessionStorage.getItem('access_token');
        const localUserInfo = localStorage.getItem('user_info');
        const sessionUserInfo = sessionStorage.getItem('user_info');
        const loginTimestamp = localStorage.getItem('loginTimestamp');

        let token = null;
        let savedUserInfo = null;

        if (localToken) {
          token = localToken;
          savedUserInfo = localUserInfo;

          // 로그인 유지 기간 체크 (1일)
          if (loginTimestamp) {
            const now = new Date().getTime();
            const loginTime = parseInt(loginTimestamp);
            const thirtyDaysInMs = 24 * 60 * 60 * 1000;

            if (now - loginTime > thirtyDaysInMs) {
              // 1일 지났으면 자동 로그아웃
              handleLogout();
              setIsLoading(false);
              return;
            }
          }
        } else if (sessionToken) {
          token = sessionToken;
          savedUserInfo = sessionUserInfo;
        }

        if (token && savedUserInfo) {
          try {
            const parsedUserInfo = JSON.parse(savedUserInfo);
            setUserInfo(parsedUserInfo);
            setIsLoggedIn(true);
            console.log('로그인 상태 복원됨:', parsedUserInfo.user_name);
          } catch (error) {
            console.error('사용자 정보 파싱 오류:', error);
            handleLogout();
          }
        }
      } catch (error) {
        console.error('로그인 상태 확인 오류:', error);
        handleLogout();
      }

      setIsLoading(false);
    };

    checkLoginStatus();
  }, []);

  // 로그인 처리 함수
  const handleLogin = (rememberMe = false, userData = null) => {
    setIsLoggedIn(true);
    setUserInfo(userData);

    if (rememberMe) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('loginTimestamp', new Date().getTime().toString());
    }
  };

  // 로그아웃 처리 함수
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserInfo(null);

    // 모든 저장된 로그인 정보 삭제
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loginTimestamp');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user_info');

    console.log('로그아웃 완료');
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
        <AICCTVFloodDashboard
          onLogout={handleLogout}
          userInfo={userInfo}
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;