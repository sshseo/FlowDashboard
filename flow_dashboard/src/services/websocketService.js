// WebSocket 연결 관리 서비스
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = parseInt(process.env.REACT_APP_WS_MAX_RECONNECT_ATTEMPTS) || 5;
    this.reconnectInterval = parseInt(process.env.REACT_APP_WS_RECONNECT_INTERVAL) || 3000;
    this.callbacks = {
      alert_update: [],
      system_status: [],
      connection: []
    };
  }

  connect() {
    const wsUrl = process.env.REACT_APP_API_URL 
      ? process.env.REACT_APP_API_URL.replace('http', 'ws') + '/api/ws'
      : 'ws://localhost:8001/api/ws';

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
      this.scheduleReconnect();
    }
  }

  setupEventListeners() {
    this.ws.onopen = () => {
      console.log('WebSocket 연결됨');
      this.reconnectAttempts = 0;
      this.notifyCallbacks('connection', { status: 'connected' });
      
      // Keep-alive ping 시작
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      // ping/pong 메시지는 JSON이 아니므로 별도 처리
      if (event.data === 'pong') {
        return;
      }
      
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket 메시지 수신:', message);
        this.handleMessage(message);
      } catch (error) {
        console.error('메시지 파싱 오류:', error);
        console.log('원본 데이터:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket 연결 종료:', event.code, event.reason);
      this.notifyCallbacks('connection', { status: 'disconnected' });
      this.stopPing();
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
      this.notifyCallbacks('connection', { status: 'error', error });
    };
  }

  handleMessage(message) {
    const { type } = message;
    
    switch (type) {
      case 'alert_update':
        // 전체 메시지를 전달 (alert_type, data 포함)
        this.notifyCallbacks('alert_update', message);
        break;
      case 'system_status':
        this.notifyCallbacks('system_status', message.data);
        break;
      default:
        console.log('알 수 없는 메시지 타입:', type);
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('WebSocket 재연결 시도 횟수 초과');
      this.notifyCallbacks('connection', { status: 'failed' });
    }
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, parseInt(process.env.REACT_APP_WS_PING_INTERVAL) || 30000); // 환경변수에서 ping 간격 설정
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // 콜백 등록
  onAlertUpdate(callback) {
    this.callbacks.alert_update.push(callback);
  }

  onSystemStatus(callback) {
    this.callbacks.system_status.push(callback);
  }

  onConnection(callback) {
    this.callbacks.connection.push(callback);
  }

  // 콜백 제거
  removeCallback(type, callback) {
    const index = this.callbacks[type].indexOf(callback);
    if (index > -1) {
      this.callbacks[type].splice(index, 1);
    }
  }

  // 콜백 실행
  notifyCallbacks(type, data) {
    this.callbacks[type].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`콜백 실행 오류 (${type}):`, error);
      }
    });
  }

  // 연결 상태 확인
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // 연결 종료
  disconnect() {
    if (this.ws) {
      this.stopPing();
      this.ws.close();
      this.ws = null;
    }
  }
}

// 싱글톤 인스턴스
const websocketService = new WebSocketService();

export default websocketService;