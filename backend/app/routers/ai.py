# app/routers/ai.py
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from datetime import datetime
from app.services.ai_data_service import ai_data_service
from app.services.ai_data_buffer import ai_data_buffer
from app.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/ai/start")
async def start_ai_service():
    """AI 데이터 서비스 시작"""
    try:
        await ai_data_service.start_ai_data_service()
        return {
            "message": "AI 데이터 서비스 시작됨",
            "status": "success",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"AI 서비스 시작 실패: {e}")
        raise HTTPException(status_code=500, detail=f"AI 서비스 시작 실패: {str(e)}")

@router.post("/ai/stop")
async def stop_ai_service():
    """AI 데이터 서비스 중지"""
    try:
        await ai_data_service.stop_ai_data_service()
        return {
            "message": "AI 데이터 서비스 중지됨",
            "status": "success",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"AI 서비스 중지 실패: {e}")
        raise HTTPException(status_code=500, detail=f"AI 서비스 중지 실패: {str(e)}")

@router.get("/ai/status")
async def get_ai_service_status():
    """AI 서비스 상태 조회"""
    try:
        status = ai_data_service.get_service_status()
        return {
            "service_status": status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"AI 서비스 상태 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"상태 조회 실패: {str(e)}")

@router.post("/ai/data/manual")
async def add_manual_data(
    water_level: float,
    velocity: float,
    flow_rate: float,
    current_user: dict = Depends(get_current_user)
):
    """수동 AI 데이터 추가 (테스트용)"""
    try:
        await ai_data_service.manual_add_data(water_level, velocity, flow_rate)
        return {
            "message": "수동 데이터 추가 완료",
            "data": {
                "water_level": water_level,
                "velocity": velocity,
                "flow_rate": flow_rate
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"수동 데이터 추가 실패: {e}")
        raise HTTPException(status_code=500, detail=f"데이터 추가 실패: {str(e)}")

@router.get("/ai/buffer/status")
async def get_buffer_status():
    """AI 데이터 버퍼 상태 조회"""
    try:
        buffer_status = ai_data_buffer.get_buffer_status()
        return {
            "buffer_status": buffer_status,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"버퍼 상태 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"버퍼 상태 조회 실패: {str(e)}")

@router.post("/ai/data/receive")
async def receive_ai_data(ai_data: Dict):
    """외부 AI 서버로부터 데이터 수신 (실제 연동용)"""
    try:
        # 데이터 검증
        required_fields = ['water_level_m', 'velocity_mps', 'flow_rate_m3ps']
        for field in required_fields:
            if field not in ai_data:
                raise HTTPException(status_code=400, detail=f"필수 필드 누락: {field}")
        
        # AI 데이터 처리
        await ai_data_service.receive_ai_data_from_server(ai_data)
        
        return {
            "message": "AI 데이터 수신 완료",
            "received_data": ai_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI 데이터 수신 실패: {e}")
        raise HTTPException(status_code=500, detail=f"데이터 수신 실패: {str(e)}")

@router.get("/ai/data/latest")
async def get_latest_ai_data():
    """최신 AI 데이터 조회"""
    try:
        latest_data = ai_data_buffer.get_latest_data_for_kpi()
        
        if not latest_data:
            return {
                "message": "사용 가능한 AI 데이터가 없습니다",
                "data": None,
                "timestamp": datetime.now().isoformat()
            }
        
        return {
            "message": "최신 AI 데이터 조회 완료",
            "data": latest_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"최신 AI 데이터 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"데이터 조회 실패: {str(e)}")