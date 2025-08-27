# app/services/flow_service.py
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from app.database import get_db_pool
from fastapi import HTTPException

class FlowService:
    def __init__(self):
        self.flow_uid = 1  # 고정값으로 설정 (나중에 변경 가능)

    async def get_latest_flow_data(self, location_id: str = None) -> Dict:
        """최신 하천 데이터 조회"""
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
                        "status": "no_data"
                    }

                return {
                    "flow_rate": float(row['flow_rate']) / 10,  # DB값을 10으로 나누어 m/s로 변환
                    "flow_flux": float(row['flow_flux']),  # 유량 (m³/s)
                    "flow_waterlevel": float(row['flow_waterlevel']),  # 수위 (cm)
                    "flow_time": row['flow_time'].isoformat(),
                    "status": "success"
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
            "7d": timedelta(days=7)
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
                FROM flow_detail_info 
                WHERE flow_uid = $1 
                    AND flow_time >= $2
                ORDER BY flow_time ASC
                """

                rows = await conn.fetch(query, self.flow_uid, start_time)

                # 데이터 포맷팅
                water_level_data = []
                flow_velocity_data = []
                discharge_data = []

                for row in rows:
                    time_str = row['flow_time'].strftime('%H:%M')
                    timestamp = row['flow_time'].isoformat()

                    water_level_data.append({
                        "t": time_str,
                        "h": float(row['flow_waterlevel']),
                        "timestamp": timestamp
                    })

                    flow_velocity_data.append({
                        "t": time_str,
                        "v": float(row['flow_rate']) / 10  # DB값을 10으로 나누어 m/s로 변환
                    })

                    discharge_data.append({
                        "t": time_str,
                        "q": float(row['flow_flux'])
                    })

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
                    flow_region
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
                        "status": "default"
                    }

                return {
                    "flow_name": row['flow_name'] or "영오지하차도",
                    "flow_latitude": float(row['flow_latitude']),
                    "flow_longitude": float(row['flow_longitude']),
                    "flow_region": row['flow_region'] or "칠곡",
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