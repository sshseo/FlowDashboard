# app/services/ai_data_service.py
import asyncio
import logging
import json
from typing import Dict, Optional
from datetime import datetime
from app.services.ai_data_buffer import ai_data_buffer
from app.routers.websocket import manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIDataService:
    """AI 실시간 데이터 수신 및 처리 서비스"""
    
    def __init__(self):
        self.is_running = False
        self.simulation_task: Optional[asyncio.Task] = None
        
    async def start_ai_data_service(self):
        """AI 데이터 서비스 시작"""
        if self.is_running:
            logger.warning("AI 데이터 서비스가 이미 실행 중입니다")
            return
        
        self.is_running = True
        
        # 실제 AI 서버 연결 시도
        try:
            from app.services.ai_client import ai_client
            self.simulation_task = asyncio.create_task(ai_client.start_connection())
            logger.info("✅ 실제 AI 서버 연결 시작")
        except Exception as e:
            logger.error(f"❌ AI 서버 연결 실패: {e}")
            # 연결 실패 시 시뮬레이션 모드로 전환하지 않고 대기
    
    async def stop_ai_data_service(self):
        """AI 데이터 서비스 중지"""
        self.is_running = False
        
        # AI 서버 연결 종료
        try:
            from app.services.ai_client import ai_client
            await ai_client.stop_connection()
            logger.info("🛑 AI 서버 연결 중지")
        except Exception as e:
            logger.error(f"AI 서버 연결 중지 오류: {e}")
        
        # 태스크 종료
        if self.simulation_task and not self.simulation_task.done():
            self.simulation_task.cancel()
            try:
                await self.simulation_task
            except asyncio.CancelledError:
                pass
        
        logger.info("AI 데이터 서비스 중지")
    
    
    async def process_ai_data(self, ai_data: Dict):
        """AI 데이터 처리 (실제 AI 서버에서 받은 데이터 처리)"""
        try:
            # 1. 데이터 버퍼에 추가
            success = ai_data_buffer.add_data(ai_data)
            
            if not success:
                logger.error("AI 데이터 버퍼 추가 실패")
                return
            
            # 2. 실시간 KPI 데이터 생성
            kpi_data = ai_data_buffer.get_latest_data_for_kpi()
            
            if kpi_data:
                # 3. WebSocket으로 실시간 브로드캐스트
                await self._broadcast_realtime_data(kpi_data)
            
            # 4. 로깅 (매 10초마다)
            if datetime.now().second % 10 == 0:
                buffer_status = ai_data_buffer.get_buffer_status()
                logger.debug(f"AI 데이터 처리 - 버퍼: {buffer_status['buffer_count']}개, "
                           f"진행률: {buffer_status['interval_progress']:.1f}%")
                
        except Exception as e:
            logger.error(f"AI 데이터 처리 실패: {e}")
    
    async def _broadcast_realtime_data(self, kpi_data: Dict):
        """실시간 KPI 데이터 WebSocket 브로드캐스트 및 알림 체크"""
        try:
            water_level_cm = kpi_data['flow_waterlevel']  # cm
            
            # 수위 임계값 체크 및 알림 생성
            await self._check_water_level_alerts(water_level_cm)
            
            # WebSocket 메시지 형식
            message = {
                'type': 'realtime_kpi_update',
                'data': {
                    'water_level': water_level_cm,
                    'flow_velocity': kpi_data['flow_rate'] / 10,  # m/s
                    'discharge': kpi_data['flow_flux'],  # m³/s
                    'timestamp': kpi_data['flow_time'],
                    'status': kpi_data['status']
                },
                'timestamp': datetime.now().isoformat()
            }
            
            # 모든 연결된 클라이언트에 브로드캐스트
            await manager.broadcast(message)
            
        except Exception as e:
            logger.error(f"실시간 데이터 브로드캐스트 실패: {e}")
    
    async def _check_water_level_alerts(self, water_level_cm: float):
        """스마트 수위 알림 시스템 - 연속 감지 + 쿨다운 + 급변 감지"""
        try:
            from app.services.flow_service import FlowService
            from datetime import datetime, timedelta

            # 데이터베이스에서 실시간 임계값 조회
            try:
                from app.database import get_db_pool
                db_pool = get_db_pool()
                async with db_pool.acquire() as conn:
                    # 관리자 설정 조회
                    admin_user = await conn.fetchrow("""
                        SELECT user_uid FROM users WHERE user_level = 0 LIMIT 1
                    """)

                    if admin_user:
                        settings = await conn.fetchrow("""
                            SELECT warning_level, danger_level
                            FROM settings
                            WHERE user_uid = $1
                        """, admin_user["user_uid"])

                        if settings:
                            WARNING_LEVEL = settings["warning_level"] or 10  # cm - 주의 수위
                            DANGER_LEVEL = settings["danger_level"] or 15    # cm - 위험 수위
                        else:
                            WARNING_LEVEL = 10  # 기본값
                            DANGER_LEVEL = 15   # 기본값
                    else:
                        WARNING_LEVEL = 10  # 기본값
                        DANGER_LEVEL = 15   # 기본값
            except Exception as e:
                logger.error(f"알림 설정 조회 실패, 기본값 사용: {e}")
                WARNING_LEVEL = 10  # 기본값
                DANGER_LEVEL = 15   # 기본값

            RAPID_CHANGE_THRESHOLD = 5.0  # cm - 급변 감지 임계값
            
            # 알림 시스템 상태 초기화
            if not hasattr(self, '_alert_system_state'):
                self._alert_system_state = {
                    'last_alert_level': 'safe',
                    'last_alert_time': {},  # 레벨별 마지막 알림 시간
                    'water_level_history': [],  # 급변 감지용 이력
                    # 연속 감지용 카운터 (임시 서버용으로 주석 처리)
                    # 'warning_consecutive_count': 0,  # 주의 수위 연속 카운트
                    # 'danger_consecutive_count': 0,   # 위험 수위 연속 카운트
                }
            
            state = self._alert_system_state
            now = datetime.now()
            
            # 1. 수위 이력 업데이트 (급변 감지용 - 1분간 보관)
            state['water_level_history'].append({
                'level': water_level_cm,
                'timestamp': now
            })
            # 1분 이상 된 데이터 제거
            state['water_level_history'] = [
                h for h in state['water_level_history'] 
                if now - h['timestamp'] <= timedelta(minutes=1)
            ]
            
            # 2. 현재 수위 레벨 판단
            current_level = 'safe'
            if water_level_cm > DANGER_LEVEL:
                current_level = 'danger'
            elif water_level_cm > WARNING_LEVEL:
                current_level = 'warning'
            
            # 3. 급변 감지 체크 (1분내 5cm 이상 상승)
            rapid_change_detected = False
            if len(state['water_level_history']) >= 2:
                oldest_level = min(h['level'] for h in state['water_level_history'])
                level_increase = water_level_cm - oldest_level
                if level_increase >= RAPID_CHANGE_THRESHOLD:
                    rapid_change_detected = True
                    logger.warning(f"급변 감지! 1분내 {level_increase:.1f}cm 상승: {oldest_level:.1f}cm → {water_level_cm:.1f}cm")
            
            # 4. 쿨다운 체크 (위험 수위는 더 짧은 간격, 나머지는 5분 간격)
            if current_level == 'danger':
                cooldown_time = timedelta(minutes=2)  # 위험 수위는 2분마다
            else:
                cooldown_time = timedelta(minutes=5)  # 주의/정상은 5분마다

            can_send_alert = True
            if current_level in state['last_alert_time']:
                time_since_last = now - state['last_alert_time'][current_level]
                if time_since_last < cooldown_time:
                    can_send_alert = False
                    logger.debug(f"쿨다운 중: {current_level} 알림 {time_since_last.total_seconds():.0f}초 전 발송됨")
            
            # 5. 연속 감지 체크 (임시 서버용으로 주석 처리)
            # TODO: 실제 AI 서버 연결 시 활성화
            """
            연속 감지 로직 (주석 처리됨):
            - 주의 수위: 10초 연속 초과 시 알림
            - 위험 수위: 5초 연속 초과 시 알림
            
            if current_level == 'warning':
                state['warning_consecutive_count'] += 1
                state['danger_consecutive_count'] = 0
                consecutive_threshold_met = state['warning_consecutive_count'] >= 10  # 10초
            elif current_level == 'danger':
                state['danger_consecutive_count'] += 1
                state['warning_consecutive_count'] = 0
                consecutive_threshold_met = state['danger_consecutive_count'] >= 5   # 5초
            else:
                state['warning_consecutive_count'] = 0
                state['danger_consecutive_count'] = 0
                consecutive_threshold_met = False
            """
            
            # 6. 알림 발송 조건 판단
            should_send_alert = False
            alert_message = None
            alert_type = None
            """
            # 급변 감지 시 즉시 알림 (쿨다운 무시)
            if rapid_change_detected:
                should_send_alert = True
                alert_message = f"🚨 급격한 수위 상승! 1분내 {level_increase:.1f}cm 증가: {water_level_cm:.1f}cm"
                alert_type = "긴급"
                logger.info(f"급변 감지 알림 발송: {alert_message}")
            """
            
            # 레벨 변경 시 또는 위험 수위 지속 시 알림
            level_changed = state['last_alert_level'] != current_level
            danger_sustained = current_level == 'danger' and can_send_alert

            if (level_changed and can_send_alert) or danger_sustained:
                # 연속 감지 조건 (임시 서버에서는 항상 True)
                consecutive_threshold_met = True  # 실제 서버에서는 위 주석된 로직 사용
                
                if consecutive_threshold_met:
                    should_send_alert = True
                    
                    if current_level == 'danger':
                        alert_message = f"위험 수위 달성! 현재 수위: {water_level_cm:.1f}cm (기준: {DANGER_LEVEL}cm)"
                        alert_type = "긴급"
                    elif current_level == 'warning':
                        alert_message = f"주의 수위 달성! 현재 수위: {water_level_cm:.1f}cm (기준: {WARNING_LEVEL}cm)"
                        alert_type = "주의"
                    elif current_level == 'safe':
                        alert_message = f"수위 정상화됨! 현재 수위: {water_level_cm:.1f}cm"
                        alert_type = "정상"
            
            # 7. 알림 발송
            if should_send_alert and alert_message:
                flow_service = FlowService(flow_uid=1)
                await flow_service.add_alert(alert_message, alert_type)


                # 상태 업데이트
                state['last_alert_level'] = current_level
                state['last_alert_time'][current_level] = now

                logger.info(f"스마트 알림 발송: {alert_type} - {alert_message}")
            
            # 8. 디버그 로그 (10초마다)
            if int(now.timestamp()) % 10 == 0:
                logger.debug(f"수위 알림 상태: 현재={water_level_cm:.1f}cm, 레벨={current_level}, "
                           f"이력={len(state['water_level_history'])}개, 쿨다운={not can_send_alert}")
                
        except Exception as e:
            logger.error(f"스마트 수위 알림 체크 실패: {e}")
    
    async def receive_ai_data_from_server(self, ai_data: Dict):
        """실제 AI 서버로부터 데이터 수신 시 호출되는 함수"""
        await self.process_ai_data(ai_data)
    
    def get_service_status(self) -> Dict:
        """서비스 상태 정보 반환"""
        buffer_status = ai_data_buffer.get_buffer_status()
        
        return {
            'is_running': self.is_running,
            'buffer_status': buffer_status,
            'connected_websockets': len(manager.active_connections) if manager else 0,
            'last_update': datetime.now().isoformat()
        }
    
    async def manual_add_data(self, water_level: float, velocity: float, flow_rate: float):
        """수동 데이터 추가 (테스트용)"""
        ai_data = {
            'water_level_m': water_level,
            'velocity_mps': velocity,
            'flow_rate_m3ps': flow_rate
        }
        await self.process_ai_data(ai_data)
        logger.info(f"수동 데이터 추가: 수위={water_level}m, 유속={velocity}m/s, 유량={flow_rate}m³/s")

# 싱글톤 인스턴스
ai_data_service = AIDataService()