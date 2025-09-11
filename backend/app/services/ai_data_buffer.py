# app/services/ai_data_buffer.py
import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from app.database import get_db_pool

logger = logging.getLogger(__name__)

class AIDataBuffer:
    """AI 데이터 5분 구간 버퍼 시스템"""
    
    def __init__(self, flow_uid: int = 1, interval_minutes: int = 5):
        self.flow_uid = flow_uid
        self.interval_minutes = interval_minutes
        self.interval_seconds = interval_minutes * 60
        
        # 데이터 버퍼
        self.data_buffer: List[Dict] = []
        self.interval_start_time = datetime.now()
        
        # 실시간 데이터 (최신 1개)
        self.latest_data: Optional[Dict] = None
        
        logger.info(f"AIDataBuffer 초기화 - Flow UID: {flow_uid}, 구간: {interval_minutes}분")
    
    def add_data(self, ai_data: Dict) -> bool:
        """AI 데이터 추가 및 구간 처리"""
        try:
            current_time = datetime.now()
            
            # 데이터 포맷 변환
            formatted_data = self._format_ai_data(ai_data, current_time)
            
            # 실시간 데이터 업데이트 (KPI 카드용)
            self.latest_data = formatted_data
            
            # 버퍼에 추가 (히스토리용)
            self.data_buffer.append(formatted_data)
            
            # 5분 구간 완료 확인
            elapsed = (current_time - self.interval_start_time).total_seconds()
            if elapsed >= self.interval_seconds:
                # 비동기 처리로 평균 계산 및 저장
                asyncio.create_task(self._process_interval())
            
            return True
            
        except Exception as e:
            logger.error(f"AI 데이터 추가 실패: {e}")
            return False
    
    def _format_ai_data(self, ai_data: Dict, timestamp: datetime) -> Dict:
        """AI 데이터를 내부 형식으로 변환"""
        return {
            'water_level_m': float(ai_data.get('water_level_m', 0)),
            'velocity_mps': float(ai_data.get('velocity_mps', 0)),
            'flow_rate_m3ps': float(ai_data.get('flow_rate_m3ps', 0)),
            'timestamp': timestamp
        }
    
    async def _process_interval(self):
        """5분 구간 처리: 평균 계산 및 DB 저장"""
        if not self.data_buffer:
            logger.warning("저장할 데이터가 없습니다")
            return
        
        try:
            data_count = len(self.data_buffer)
            
            # 평균값 계산
            avg_data = self._calculate_average()
            
            # DB 저장
            await self._save_to_database(avg_data)
            
            # 버퍼 초기화
            self.data_buffer.clear()
            self.interval_start_time = datetime.now()
            
            
        except Exception as e:
            logger.error(f"구간 처리 실패: {e}")
    
    def _calculate_average(self) -> Dict:
        """버퍼 데이터의 평균값 계산"""
        if not self.data_buffer:
            return {}
        
        count = len(self.data_buffer)
        
        avg_water_level = sum(d['water_level_m'] for d in self.data_buffer) / count
        avg_velocity = sum(d['velocity_mps'] for d in self.data_buffer) / count
        avg_flow_rate = sum(d['flow_rate_m3ps'] for d in self.data_buffer) / count
        
        return {
            'avg_water_level_m': avg_water_level,
            'avg_velocity_mps': avg_velocity,
            'avg_flow_rate_m3ps': avg_flow_rate,
            'data_count': count,
            'interval_start': self.interval_start_time,
            'interval_end': datetime.now()
        }
    
    async def _save_to_database(self, avg_data: Dict):
        """평균 데이터를 DB에 저장"""
        db_pool = get_db_pool()
        
        async with db_pool.acquire() as conn:
            try:
                # AI 데이터를 기존 DB 형식으로 변환
                flow_waterlevel = avg_data['avg_water_level_m'] * 100  # m → cm
                flow_rate = avg_data['avg_velocity_mps'] * 10  # m/s → DB 형식
                flow_flux = avg_data['avg_flow_rate_m3ps']  # m³/s 그대로
                flow_time = avg_data['interval_end']
                
                # flow_detail_info 테이블에 저장
                query = """
                INSERT INTO flow_detail_info (
                    flow_uid, flow_rate, flow_flux, flow_waterlevel, flow_time
                ) VALUES ($1, $2, $3, $4, $5)
                """
                
                await conn.execute(
                    query, 
                    self.flow_uid, 
                    flow_rate, 
                    flow_flux, 
                    flow_waterlevel, 
                    flow_time
                )
                
                logger.info(f"DB 저장 완료 - 수위: {flow_waterlevel}cm, 유속: {flow_rate/10}m/s, 유량: {flow_flux}m³/s")
                
            except Exception as e:
                logger.error(f"DB 저장 실패: {e}")
                raise
    
    def get_latest_data_for_kpi(self) -> Optional[Dict]:
        """KPI 카드용 최신 데이터 반환"""
        if not self.latest_data:
            return None
        
        return {
            'flow_waterlevel': self.latest_data['water_level_m'] * 100,  # cm
            'flow_rate': self.latest_data['velocity_mps'] * 10,  # DB 형식
            'flow_flux': self.latest_data['flow_rate_m3ps'],  # m³/s
            'flow_time': self.latest_data['timestamp'].isoformat(),
            'status': 'success'
        }
    
    def get_buffer_status(self) -> Dict:
        """버퍼 상태 정보 반환"""
        elapsed = (datetime.now() - self.interval_start_time).total_seconds()
        progress = (elapsed / self.interval_seconds) * 100
        
        return {
            'buffer_count': len(self.data_buffer),
            'interval_progress': min(progress, 100),
            'next_save_in': max(0, self.interval_seconds - elapsed),
            'interval_start': self.interval_start_time.isoformat(),
            'has_latest_data': self.latest_data is not None
        }

# 싱글톤 인스턴스
ai_data_buffer = AIDataBuffer()