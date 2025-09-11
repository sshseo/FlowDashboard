# app/services/flow_service.py
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from app.database import get_db_pool
from app.services.ai_data_buffer import ai_data_buffer
from app.services.ai_data_service import ai_data_service
from fastapi import HTTPException

class FlowService:
    def __init__(self, flow_uid: int = 1):
        self.flow_uid = flow_uid  # 기본값 1, 나중에 동적으로 변경 가능

    async def get_latest_flow_data(self, location_id: str = None) -> Dict:
        """최신 하천 데이터 조회 (AI 실시간 데이터 우선)"""
        
        # 0. AI 서버 연결 상태 확인
        try:
            from app.services.ai_client import ai_client
            ai_connected = ai_client.is_connected()
        except Exception:
            ai_connected = False
        
        # 1. AI 실시간 데이터 확인
        ai_latest_data = ai_data_buffer.get_latest_data_for_kpi()
        if ai_latest_data:
            return {
                "flow_rate": float(ai_latest_data['flow_rate']) / 10,  # DB값을 10으로 나누어 m/s로 변환
                "flow_flux": float(ai_latest_data['flow_flux']),  # 유량 (m³/s)
                "flow_waterlevel": float(ai_latest_data['flow_waterlevel']),  # 수위 (cm)
                "flow_time": ai_latest_data['flow_time'],
                "status": "success",
                "data_source": "ai_realtime",
                "connection_status": "connected",
                "message": "실시간 데이터 연결됨"
            }
        
        # 1.1. AI 서버가 연결 중이지만 데이터가 아직 없는 경우
        if ai_connected or ai_data_service.is_running:
            return {
                "flow_rate": 0.0,
                "flow_flux": 0.0,
                "flow_waterlevel": 0.0,
                "flow_time": datetime.now().isoformat(),
                "status": "connecting",
                "data_source": "ai_connecting",
                "connection_status": "connecting",
                "message": "실시간 데이터 연결중"
            }
        
        # 2. AI 데이터가 없으면 DB에서 조회 (폴백)
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            try:
                # 최신 데이터 1건 조회
                query = """
                SELECT 
                    flow_rate,
                    flow_flux, 
                    flow_waterlevel,
                    flow_time
                FROM flow_detail_info 
                WHERE flow_uid = $1 
                ORDER BY flow_time DESC 
                LIMIT 1
                """

                row = await conn.fetchrow(query, self.flow_uid)

                if not row:
                    return {
                        "flow_rate": 0.0,
                        "flow_flux": 0.0,
                        "flow_waterlevel": 0.0,
                        "flow_time": datetime.now().isoformat(),
                        "status": "no_data",
                        "data_source": "database_fallback",
                        "connection_status": "disconnected",
                        "message": "연결 대기 중"
                    }

                return {
                    "flow_rate": float(row['flow_rate']) / 10,  # DB값을 10으로 나누어 m/s로 변환
                    "flow_flux": float(row['flow_flux']),  # 유량 (m³/s)
                    "flow_waterlevel": float(row['flow_waterlevel']),  # 수위 (cm)
                    "flow_time": row['flow_time'].isoformat(),
                    "status": "success",
                    "data_source": "database",
                    "connection_status": "disconnected",
                    "message": "과거 데이터 (AI 서버 연결 안됨)"
                }

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"데이터베이스 조회 오류: {str(e)}")

    async def get_timeseries_data(self, location_id: str = None, time_range: str = "1h") -> Dict:
        """시계열 데이터 조회"""
        db_pool = get_db_pool()

        # 시간 범위 계산
        time_delta_map = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6),
            "12h": timedelta(hours=12),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
            "": timedelta(days=7)
        }

        delta = time_delta_map.get(time_range, timedelta(hours=1))
        start_time = datetime.now() - delta

        async with db_pool.acquire() as conn:
            try:
                query = """
                SELECT 
                    flow_rate,
                    flow_flux,
                    flow_waterlevel,
                    flow_time
                FROM (
                    SELECT 
                        flow_rate,
                        flow_flux,
                        flow_waterlevel,
                        flow_time
                    FROM flow_detail_info 
                    WHERE flow_uid = $1 
                        AND flow_time >= $2
                    ORDER BY flow_time DESC
                    LIMIT 10
                ) subquery
                ORDER BY flow_time ASC
                """

                rows = await conn.fetch(query, self.flow_uid, start_time)

                # 데이터 포맷팅
                water_level_data = []
                flow_velocity_data = []
                discharge_data = []
                
                prev_date = None

                for row in rows:
                    current_date = row['flow_time'].date()
                    time_str = row['flow_time'].strftime('%H:%M')
                    timestamp = row['flow_time'].isoformat()
                    
                    # 날짜가 바뀌었는지 확인
                    date_changed = prev_date is None or current_date != prev_date
                    display_text = f"{current_date.strftime('%m/%d')} {time_str}" if date_changed else time_str
                    
                    water_level_data.append({
                        "t": display_text,
                        "time_only": time_str,
                        "date_changed": date_changed,
                        "h": float(row['flow_waterlevel']),
                        "timestamp": timestamp
                    })

                    flow_velocity_data.append({
                        "t": display_text,
                        "time_only": time_str,
                        "date_changed": date_changed,
                        "v": float(row['flow_rate']) / 10  # DB값을 10으로 나누어 m/s로 변환
                    })

                    discharge_data.append({
                        "t": display_text,
                        "time_only": time_str,
                        "date_changed": date_changed,
                        "q": float(row['flow_flux'])
                    })
                    
                    prev_date = current_date

                return {
                    "waterLevel": water_level_data,
                    "flowVelocity": flow_velocity_data,
                    "discharge": discharge_data,
                    "status": "success"
                }

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"시계열 데이터 조회 오류: {str(e)}")

    async def get_flow_info(self) -> Dict:
        """하천 정보 조회"""
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            try:
                query = """
                SELECT 
                    flow_name,
                    flow_latitude,
                    flow_longitude,
                    flow_region,
                    flow_address
                FROM flow_info 
                WHERE flow_uid = $1
                """

                row = await conn.fetchrow(query, self.flow_uid)

                if not row:
                    return {
                        "flow_name": "영오지하차도",
                        "flow_latitude": 35.923508,
                        "flow_longitude": 128.519230,
                        "flow_region": "칠곡",
                        "flow_address": "경북 칠곡군 지천면 영오리 894",
                        "status": "default"
                    }

                return {
                    "flow_name": row['flow_name'] or "영오지하차도",
                    "flow_latitude": float(row['flow_latitude']),
                    "flow_longitude": float(row['flow_longitude']),
                    "flow_region": row['flow_region'] or "칠곡",
                    "flow_address": row['flow_address'] or "경북 칠곡군 지천면 영오리 894",
                    "status": "success"
                }

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"하천 정보 조회 오류: {str(e)}")

    async def get_recent_alerts(self, limit: int = 10) -> Dict:
        """최근 알람 조회"""
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            try:
                query = """
                SELECT 
                    alert_uid,
                    alert_date,
                    alert_message,
                    alert_type
                FROM alert_info 
                WHERE flow_uid = $1
                ORDER BY alert_date DESC 
                LIMIT $2
                """

                rows = await conn.fetch(query, self.flow_uid, limit)

                alerts = []
                for row in rows:
                    # alert_type 매핑
                    level_map = {
                        "긴급": "CRITICAL",
                        "주의": "WARNING",
                        "경계": "WARNING",
                        "대피": "CRITICAL",
                        "정상": "INFO"
                    }

                    alert_level = level_map.get(row['alert_type'], "INFO")

                    alerts.append({
                        "id": f"AL-{row['alert_uid']:03d}",
                        "ts": row['alert_date'].strftime('%H:%M') if row['alert_date'] else "",
                        "level": alert_level,
                        "message": row['alert_message'] or "",
                        "location": "중앙"  # 기본값
                    })

                return {
                    "alerts": alerts,
                    "status": "success"
                }

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"알람 조회 오류: {str(e)}")

    async def add_alert(self, alert_message: str, alert_type: str = "주의") -> Dict:
        """새로운 알람 추가 및 WebSocket 브로드캐스트"""
        from app.routers.websocket import broadcast_alert_update
        
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            try:
                # 알람 추가
                query = """
                INSERT INTO alert_info (flow_uid, alert_date, alert_message, alert_type)
                VALUES ($1, $2, $3, $4)
                RETURNING alert_uid
                """
                
                alert_uid = await conn.fetchval(
                    query, 
                    self.flow_uid, 
                    datetime.now(), 
                    alert_message, 
                    alert_type
                )

                # 새 알람 데이터
                new_alert = {
                    "id": f"AL-{alert_uid:03d}",
                    "ts": datetime.now().strftime('%H:%M'),
                    "level": self._map_alert_level(alert_type),
                    "message": alert_message,
                    "location": "중앙"
                }

                # WebSocket으로 실시간 브로드캐스트
                await broadcast_alert_update("alert_added", new_alert)

                return {
                    "alert": new_alert,
                    "status": "success"
                }

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"알람 추가 오류: {str(e)}")

    async def delete_alert(self, alert_uid: int) -> Dict:
        """알람 삭제 및 WebSocket 브로드캐스트"""
        from app.routers.websocket import broadcast_alert_update
        
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            try:
                # 삭제할 알람 정보 조회
                alert_query = """
                SELECT alert_uid, alert_message, alert_type 
                FROM alert_info 
                WHERE alert_uid = $1 AND flow_uid = $2
                """
                
                alert_row = await conn.fetchrow(alert_query, alert_uid, self.flow_uid)
                
                if not alert_row:
                    raise HTTPException(status_code=404, detail="알람을 찾을 수 없습니다")

                # 알람 삭제
                delete_query = "DELETE FROM alert_info WHERE alert_uid = $1 AND flow_uid = $2"
                await conn.execute(delete_query, alert_uid, self.flow_uid)

                # 삭제된 알람 정보
                deleted_alert = {
                    "id": f"AL-{alert_uid:03d}",
                    "message": alert_row['alert_message'],
                    "level": self._map_alert_level(alert_row['alert_type'])
                }

                # WebSocket으로 실시간 브로드캐스트
                await broadcast_alert_update("alert_deleted", deleted_alert)

                return {
                    "deleted_alert": deleted_alert,
                    "status": "success"
                }

            except Exception as e:
                raise HTTPException(status_code=500, detail=f"알람 삭제 오류: {str(e)}")

    def _map_alert_level(self, alert_type: str) -> str:
        """alert_type을 레벨로 매핑"""
        level_map = {
            "긴급": "CRITICAL",
            "주의": "WARNING", 
            "경계": "WARNING",
            "대피": "CRITICAL",
            "정상": "INFO"
        }
        return level_map.get(alert_type, "INFO")