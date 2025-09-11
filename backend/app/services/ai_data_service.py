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
        """실시간 KPI 데이터 WebSocket 브로드캐스트"""
        try:
            # WebSocket 메시지 형식
            message = {
                'type': 'realtime_kpi_update',
                'data': {
                    'water_level': kpi_data['flow_waterlevel'],  # cm
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