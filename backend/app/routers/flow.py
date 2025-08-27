# app/routers/flow.py
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from app.services.flow_service import FlowService
from app.dependencies import get_current_user

router = APIRouter()
flow_service = FlowService()

@router.get("/realtime/{location_id}")
async def get_realtime_data(
        location_id: str,
        current_user: str = Depends(get_current_user)
):
    """실시간 하천 데이터 조회"""
    return await flow_service.get_latest_flow_data(location_id)

@router.get("/timeseries/{location_id}")
async def get_timeseries_data(
        location_id: str,
        time_range: str = Query("1h", description="시간 범위: 1h, 6h, 12h, 24h, 7d"),
        current_user: str = Depends(get_current_user)
):
    """시계열 데이터 조회"""
    return await flow_service.get_timeseries_data(location_id, time_range)

@router.get("/alerts")
async def get_alerts(
        limit: int = Query(10, ge=1, le=50, description="조회할 알람 개수"),
        current_user: str = Depends(get_current_user)
):
    """최근 알람 조회"""
    return await flow_service.get_recent_alerts(limit)

@router.get("/info")
async def get_flow_info(
        current_user: str = Depends(get_current_user)
):
    """하천 정보 조회"""
    return await flow_service.get_flow_info()

@router.get("/status")
async def get_system_status(
        current_user: str = Depends(get_current_user)
):
    """시스템 상태 조회"""
    try:
        # 최신 데이터로 시스템 상태 확인
        latest_data = await flow_service.get_latest_flow_data()
        flow_info = await flow_service.get_flow_info()

        return {
            "status": "online",
            "last_data_time": latest_data.get("flow_time"),
            "monitoring_active": latest_data.get("status") == "success",
            "connected_sites": 3,  # 입구, 중앙, 출구
            "flow_name": flow_info.get("flow_name"),
            "current_level": latest_data.get("flow_waterlevel", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시스템 상태 조회 실패: {str(e)}")

# 공개 엔드포인트 (인증 불필요)
@router.get("/health")
async def health_check():
    """서버 상태 확인 (인증 불필요)"""
    try:
        latest_data = await flow_service.get_latest_flow_data()
        return {
            "status": "healthy",
            "monitoring_active": latest_data.get("status") == "success",
            "connected_sites": 3,
            "version": "1.0.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "monitoring_active": False,
            "connected_sites": 0,
            "error": str(e)
        }