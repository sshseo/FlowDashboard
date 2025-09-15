# app/routers/flow.py
from fastapi import APIRouter, HTTPException, Depends, Query, Form
from typing import Optional
from app.services.flow_service import FlowService
from app.dependencies import get_current_user

router = APIRouter()
flow_service = FlowService()

@router.get("/realtime/{location_id}")
async def get_realtime_data(
        location_id: str,
        flow_uid: int = Query(1, description="하천 UID"),
        current_user: str = Depends(get_current_user)
):
    """실시간 하천 데이터 조회"""
    service = FlowService(flow_uid)
    return await service.get_latest_flow_data(location_id)

@router.get("/timeseries/{location_id}")
async def get_timeseries_data(
        location_id: str,
        time_range: str = Query("7d", description="시간 범위: 1h, 6h, 12h, 24h, 7d"),
        flow_uid: int = Query(1, description="하천 UID"),
        current_user: str = Depends(get_current_user)
):
    """시계열 데이터 조회"""
    service = FlowService(flow_uid)
    return await service.get_timeseries_data(location_id, time_range)

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

@router.get("/cameras/{flow_uid}")
async def get_cameras(
        flow_uid: int,
        current_user: str = Depends(get_current_user)
):
    """특정 하천의 카메라 목록 조회"""
    return await flow_service.get_cameras_by_flow_uid(flow_uid)

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

        # 카메라 개수 조회
        cameras_data = await flow_service.get_cameras_by_flow_uid(1)
        connected_cameras = len(cameras_data.get("cameras", [])) if cameras_data.get("status") == "success" else 0

        # AI 서버 연결 상태 확인
        from app.services.ai_client import ai_client
        ai_connected = ai_client.is_connected()

        return {
            "status": "healthy",
            "monitoring_active": ai_connected,  # AI 서버 연결 상태로 판단
            "connected_sites": connected_cameras,
            "version": "1.0.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "monitoring_active": False,
            "connected_sites": 0,
            "error": str(e)
        }

@router.post("/alerts")
async def add_alert(
        alert_message: str = Form(...),
        alert_type: str = Form("주의"),
        current_user: str = Depends(get_current_user)
):
    """새로운 알람 추가"""
    return await flow_service.add_alert(alert_message, alert_type)

@router.delete("/alerts/{alert_uid}")
async def delete_alert(
        alert_uid: int,
        current_user: str = Depends(get_current_user)
):
    """알람 삭제"""
    return await flow_service.delete_alert(alert_uid)