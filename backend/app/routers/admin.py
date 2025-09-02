# app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional
from app.utils.audit_logger import AuditLogger
from app.dependencies import get_current_user

router = APIRouter()

@router.get("/audit-logs")
async def get_audit_logs(
    current_user: str = Depends(get_current_user),
    user_id: Optional[str] = Query(None, description="필터링할 사용자 ID"),
    event_type: Optional[str] = Query(None, description="필터링할 이벤트 타입"),
    start_date: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    limit: int = Query(100, le=1000, description="조회할 로그 수 (최대 1000)")
):
    """
    감사 로그 조회 (관리자 권한 필요)
    """
    try:
        # 날짜 파싱
        start_dt = None
        end_dt = None
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date + "T00:00:00")
            except ValueError:
                raise HTTPException(status_code=400, detail="올바른 시작 날짜 형식이 아닙니다 (YYYY-MM-DD)")
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date + "T23:59:59")
            except ValueError:
                raise HTTPException(status_code=400, detail="올바른 종료 날짜 형식이 아닙니다 (YYYY-MM-DD)")
        
        # 감사 로그 조회
        logs = await AuditLogger.get_audit_logs(
            user_id=user_id,
            event_type=event_type,
            start_date=start_dt,
            end_date=end_dt,
            limit=limit
        )
        
        # 데이터 접근 로그 기록
        await AuditLogger.log_data_access(
            current_user, 
            "system",  # API 요청이므로 시스템으로 표시
            "/admin/audit-logs",
            "조회"
        )
        
        return {
            "status": "success",
            "count": len(logs),
            "logs": logs,
            "filters": {
                "user_id": user_id,
                "event_type": event_type,
                "start_date": start_date,
                "end_date": end_date,
                "limit": limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"감사 로그 조회 실패: {str(e)}")

@router.get("/audit-stats")
async def get_audit_statistics(
    current_user: str = Depends(get_current_user),
    days: int = Query(7, le=365, description="통계 기간 (일)")
):
    """
    감사 로그 통계 조회
    """
    try:
        start_date = datetime.now() - timedelta(days=days)
        
        logs = await AuditLogger.get_audit_logs(
            start_date=start_date,
            limit=10000  # 통계용이므로 많이 조회
        )
        
        # 통계 계산
        stats = {
            "total_events": len(logs),
            "login_success": len([l for l in logs if l.get("event_type") == AuditLogger.LOGIN_SUCCESS]),
            "login_failure": len([l for l in logs if l.get("event_type") == AuditLogger.LOGIN_FAILURE]),
            "security_events": len([l for l in logs if l.get("level") == AuditLogger.SECURITY]),
            "unique_users": len(set(l.get("user_id") for l in logs if l.get("user_id"))),
            "unique_ips": len(set(l.get("ip_address") for l in logs if l.get("ip_address"))),
            "period_days": days
        }
        
        # 일별 통계
        daily_stats = {}
        for log in logs:
            if log.get("created_at"):
                date_key = log["created_at"].date().isoformat()
                if date_key not in daily_stats:
                    daily_stats[date_key] = 0
                daily_stats[date_key] += 1
        
        return {
            "status": "success",
            "statistics": stats,
            "daily_events": daily_stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 실패: {str(e)}")