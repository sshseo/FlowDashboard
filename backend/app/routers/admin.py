# app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from app.utils.audit_logger import AuditLogger
from app.dependencies import get_current_user
from app.database import get_db_pool

router = APIRouter()

# 모니터링 지점 관련 Pydantic 모델
class MonitoringPoint(BaseModel):
    flow_uid: Optional[int] = None
    flow_name: str
    flow_latitude: float
    flow_longitude: float
    flow_region: Optional[str] = None
    flow_address: Optional[str] = None

class MonitoringPointResponse(BaseModel):
    flow_uid: int
    flow_name: str
    flow_latitude: float
    flow_longitude: float
    flow_region: Optional[str] = None
    flow_address: Optional[str] = None

# 카메라 관련 Pydantic 모델
class Camera(BaseModel):
    camera_uid: Optional[int] = None
    flow_uid: int
    camera_ip: str
    camera_name: str

class CameraResponse(BaseModel):
    camera_uid: int
    flow_uid: int
    camera_ip: str
    camera_name: str
    flow_name: Optional[str] = None

# 모니터링 지점 관리 API
@router.get("/monitoring-points", response_model=List[MonitoringPointResponse])
async def get_monitoring_points(current_user: str = Depends(get_current_user)):
    """모니터링 지점 목록 조회 (관리자 권한 필요)"""
    try:
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT flow_uid, flow_name, flow_latitude, flow_longitude,
                       flow_region, flow_address
                FROM flow_info
                ORDER BY flow_uid
            """)

            points = [dict(row) for row in rows]

            # 데이터 접근 로그
            await AuditLogger.log_data_access(
                current_user, "system", "/admin/monitoring-points", "조회"
            )

            return points

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"지점 목록 조회 실패: {str(e)}")

@router.post("/monitoring-points", response_model=dict)
async def create_monitoring_point(
    point: MonitoringPoint,
    current_user: str = Depends(get_current_user)
):
    """새 모니터링 지점 추가 (관리자 권한 필요)"""
    try:
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # 새 지점 추가
            flow_uid = await conn.fetchval("""
                INSERT INTO flow_info (flow_name, flow_latitude, flow_longitude,
                                     flow_region, flow_address)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING flow_uid
            """,
            point.flow_name, point.flow_latitude, point.flow_longitude,
            point.flow_region, point.flow_address
            )

            # 감사 로그
            await AuditLogger.log_event(
                "MONITORING_POINT_CREATED",
                user_id=current_user,
                details={
                    "flow_uid": flow_uid,
                    "flow_name": point.flow_name,
                    "location": f"{point.flow_latitude}, {point.flow_longitude}"
                },
                level=AuditLogger.INFO
            )

            return {
                "status": "success",
                "message": "모니터링 지점이 성공적으로 추가되었습니다.",
                "flow_uid": flow_uid
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"지점 추가 실패: {str(e)}")

@router.put("/monitoring-points/{flow_uid}", response_model=dict)
async def update_monitoring_point(
    flow_uid: int,
    point: MonitoringPoint,
    current_user: str = Depends(get_current_user)
):
    """모니터링 지점 정보 수정 (관리자 권한 필요)"""
    try:
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # 기존 지점 확인
            existing = await conn.fetchrow(
                "SELECT * FROM flow_info WHERE flow_uid = $1", flow_uid
            )

            if not existing:
                raise HTTPException(status_code=404, detail="지점을 찾을 수 없습니다.")

            # 지점 정보 수정
            await conn.execute("""
                UPDATE flow_info
                SET flow_name = $2, flow_latitude = $3, flow_longitude = $4,
                    flow_region = $5, flow_address = $6
                WHERE flow_uid = $1
            """,
            flow_uid, point.flow_name, point.flow_latitude,
            point.flow_longitude, point.flow_region, point.flow_address
            )

            # 감사 로그
            await AuditLogger.log_event(
                "MONITORING_POINT_UPDATED",
                user_id=current_user,
                details={
                    "flow_uid": flow_uid,
                    "old_name": existing['flow_name'],
                    "new_name": point.flow_name,
                    "changes": "지점 정보 수정"
                },
                level=AuditLogger.INFO
            )

            return {
                "status": "success",
                "message": "모니터링 지점이 성공적으로 수정되었습니다."
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"지점 수정 실패: {str(e)}")

@router.delete("/monitoring-points/{flow_uid}", response_model=dict)
async def delete_monitoring_point(
    flow_uid: int,
    current_user: str = Depends(get_current_user)
):
    """모니터링 지점 삭제 (관리자 권한 필요)"""
    try:
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # 기존 지점 확인
            existing = await conn.fetchrow(
                "SELECT * FROM flow_info WHERE flow_uid = $1", flow_uid
            )

            if not existing:
                raise HTTPException(status_code=404, detail="지점을 찾을 수 없습니다.")

            # 관련 데이터 확인
            data_count = await conn.fetchval(
                "SELECT COUNT(*) FROM flow_detail_info WHERE flow_uid = $1", flow_uid
            )

            if data_count > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"이 지점에는 {data_count}개의 측정 데이터가 있어 삭제할 수 없습니다."
                )

            # 지점 삭제 (CASCADE로 카메라 정보도 함께 삭제됨)
            await conn.execute("DELETE FROM flow_info WHERE flow_uid = $1", flow_uid)

            # 감사 로그
            await AuditLogger.log_event(
                "MONITORING_POINT_DELETED",
                user_id=current_user,
                details={
                    "flow_uid": flow_uid,
                    "flow_name": existing['flow_name'],
                    "location": f"{existing['flow_latitude']}, {existing['flow_longitude']}"
                },
                level=AuditLogger.WARNING
            )

            return {
                "status": "success",
                "message": "모니터링 지점이 성공적으로 삭제되었습니다."
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"지점 삭제 실패: {str(e)}")

# 카메라 관리 API
@router.get("/cameras", response_model=List[CameraResponse])
async def get_cameras(current_user: str = Depends(get_current_user)):
    """카메라 목록 조회 (관리자 권한 필요)"""
    try:
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT c.camera_uid, c.flow_uid, c.camera_ip, c.camera_name,
                       f.flow_name
                FROM camera_info c
                LEFT JOIN flow_info f ON c.flow_uid = f.flow_uid
                ORDER BY c.camera_uid
            """)

            cameras = []
            for row in rows:
                camera_dict = dict(row)
                # INET 타입을 문자열로 변환
                if camera_dict['camera_ip']:
                    camera_dict['camera_ip'] = str(camera_dict['camera_ip'])
                cameras.append(camera_dict)

            # 데이터 접근 로그
            await AuditLogger.log_data_access(
                current_user, "system", "/admin/cameras", "조회"
            )

            return cameras

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카메라 목록 조회 실패: {str(e)}")

@router.post("/cameras", response_model=dict)
async def create_camera(
    camera: Camera,
    current_user: str = Depends(get_current_user)
):
    """새 카메라 추가 (관리자 권한 필요)"""
    try:
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # 지점 존재 확인
            flow_exists = await conn.fetchval(
                "SELECT COUNT(*) FROM flow_info WHERE flow_uid = $1", camera.flow_uid
            )

            if not flow_exists:
                raise HTTPException(status_code=400, detail="존재하지 않는 모니터링 지점입니다.")

            # 카메라 IP 중복 확인
            ip_exists = await conn.fetchval(
                "SELECT COUNT(*) FROM camera_info WHERE camera_ip = $1", camera.camera_ip
            )

            if ip_exists:
                raise HTTPException(status_code=400, detail="이미 등록된 카메라 IP입니다.")

            # 새 카메라 추가
            camera_uid = await conn.fetchval("""
                INSERT INTO camera_info (flow_uid, camera_ip, camera_name)
                VALUES ($1, $2, $3)
                RETURNING camera_uid
            """,
            camera.flow_uid, camera.camera_ip, camera.camera_name
            )

            # 감사 로그
            await AuditLogger.log_event(
                "CAMERA_CREATED",
                user_id=current_user,
                details={
                    "camera_uid": camera_uid,
                    "camera_name": camera.camera_name,
                    "camera_ip": camera.camera_ip,
                    "flow_uid": camera.flow_uid
                },
                level=AuditLogger.INFO
            )

            return {
                "status": "success",
                "message": "카메라가 성공적으로 추가되었습니다.",
                "camera_uid": camera_uid
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카메라 추가 실패: {str(e)}")

@router.put("/cameras/{camera_uid}", response_model=dict)
async def update_camera(
    camera_uid: int,
    camera: Camera,
    current_user: str = Depends(get_current_user)
):
    """카메라 정보 수정 (관리자 권한 필요)"""
    try:
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # 기존 카메라 확인
            existing = await conn.fetchrow(
                "SELECT * FROM camera_info WHERE camera_uid = $1", camera_uid
            )

            if not existing:
                raise HTTPException(status_code=404, detail="카메라를 찾을 수 없습니다.")

            # 지점 존재 확인
            flow_exists = await conn.fetchval(
                "SELECT COUNT(*) FROM flow_info WHERE flow_uid = $1", camera.flow_uid
            )

            if not flow_exists:
                raise HTTPException(status_code=400, detail="존재하지 않는 모니터링 지점입니다.")

            # 카메라 IP 중복 확인 (자기 자신 제외)
            ip_exists = await conn.fetchval(
                "SELECT COUNT(*) FROM camera_info WHERE camera_ip = $1 AND camera_uid != $2",
                camera.camera_ip, camera_uid
            )

            if ip_exists:
                raise HTTPException(status_code=400, detail="이미 등록된 카메라 IP입니다.")

            # 카메라 정보 수정
            await conn.execute("""
                UPDATE camera_info
                SET flow_uid = $2, camera_ip = $3, camera_name = $4
                WHERE camera_uid = $1
            """,
            camera_uid, camera.flow_uid, camera.camera_ip, camera.camera_name
            )

            # 감사 로그
            await AuditLogger.log_event(
                "CAMERA_UPDATED",
                user_id=current_user,
                details={
                    "camera_uid": camera_uid,
                    "old_name": existing['camera_name'],
                    "new_name": camera.camera_name,
                    "old_ip": str(existing['camera_ip']),
                    "new_ip": camera.camera_ip
                },
                level=AuditLogger.INFO
            )

            return {
                "status": "success",
                "message": "카메라가 성공적으로 수정되었습니다."
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카메라 수정 실패: {str(e)}")

@router.delete("/cameras/{camera_uid}", response_model=dict)
async def delete_camera(
    camera_uid: int,
    current_user: str = Depends(get_current_user)
):
    """카메라 삭제 (관리자 권한 필요)"""
    try:
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # 기존 카메라 확인
            existing = await conn.fetchrow(
                "SELECT * FROM camera_info WHERE camera_uid = $1", camera_uid
            )

            if not existing:
                raise HTTPException(status_code=404, detail="카메라를 찾을 수 없습니다.")

            # 카메라 삭제
            await conn.execute("DELETE FROM camera_info WHERE camera_uid = $1", camera_uid)

            # 감사 로그
            await AuditLogger.log_event(
                "CAMERA_DELETED",
                user_id=current_user,
                details={
                    "camera_uid": camera_uid,
                    "camera_name": existing['camera_name'],
                    "camera_ip": str(existing['camera_ip'])
                },
                level=AuditLogger.WARNING
            )

            return {
                "status": "success",
                "message": "카메라가 성공적으로 삭제되었습니다."
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카메라 삭제 실패: {str(e)}")

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

# 알림 설정 관련 Pydantic 모델
class NotificationSettings(BaseModel):
    notifications_enabled: bool = True
    warning_level: int = 10
    danger_level: int = 15

class NotificationSettingsResponse(BaseModel):
    setting_uid: int
    user_uid: int
    setting_alert: bool
    warning_level: int
    danger_level: int

@router.get("/notification-settings", response_model=NotificationSettingsResponse)
async def get_notification_settings(current_user: dict = Depends(get_current_user)):
    """
    알림 설정 조회 (관리자 설정을 모든 사용자가 공유)
    """
    try:
        db_pool = get_db_pool()
        async with db_pool.acquire() as conn:
            # 관리자(user_level=0)의 설정을 조회
            admin_user = await conn.fetchrow("""
                SELECT user_uid FROM users WHERE user_level = 0 LIMIT 1
            """)

            if not admin_user:
                # 관리자가 없으면 기본값 반환
                return {
                    "setting_uid": 0,
                    "user_uid": current_user["user_uid"],
                    "setting_alert": True,
                    "warning_level": 10,
                    "danger_level": 15
                }

            admin_uid = admin_user["user_uid"]

            # 관리자의 설정 조회
            result = await conn.fetchrow("""
                SELECT setting_uid, user_uid, setting_alert, warning_level, danger_level
                FROM settings
                WHERE user_uid = $1
            """, admin_uid)

            if result:
                return {
                    "setting_uid": result["setting_uid"],
                    "user_uid": result["user_uid"],
                    "setting_alert": result["setting_alert"] or True,
                    "warning_level": result["warning_level"] or 10,
                    "danger_level": result["danger_level"] or 15
                }
            else:
                # 관리자 설정이 없으면 기본값으로 생성
                setting_uid = await conn.fetchval("""
                    INSERT INTO settings (user_uid, setting_alert, warning_level, danger_level)
                    VALUES ($1, $2, $3, $4)
                    RETURNING setting_uid
                """, admin_uid, True, 10, 15)

                # 감사 로그 기록
                await AuditLogger.log_event(
                    event_type=AuditLogger.CONFIG_CHANGE,
                    user_id=str(admin_uid),
                    details={"action": "CREATE_NOTIFICATION_SETTINGS", "warning_level": 10, "danger_level": 15}
                )

                return {
                    "setting_uid": setting_uid,
                    "user_uid": admin_uid,
                    "setting_alert": True,
                    "warning_level": 10,
                    "danger_level": 15
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"알림 설정 조회 실패: {str(e)}")

@router.put("/notification-settings")
async def update_notification_settings(
    settings: NotificationSettings,
    current_user: dict = Depends(get_current_user)
):
    """
    알림 설정 업데이트 (관리자만 가능)
    """
    try:
        # 관리자 권한 확인
        if current_user.get("user_level", 1) != 0:
            raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

        # 유효성 검사
        if settings.danger_level <= settings.warning_level:
            raise HTTPException(status_code=400, detail="위험 수위는 주의 수위보다 높아야 합니다")

        db_pool = get_db_pool()
        async with db_pool.acquire() as conn:
            # 관리자(user_level=0) 찾기
            admin_user = await conn.fetchrow("""
                SELECT user_uid FROM users WHERE user_level = 0 LIMIT 1
            """)

            if not admin_user:
                raise HTTPException(status_code=500, detail="관리자 계정을 찾을 수 없습니다")

            admin_uid = admin_user["user_uid"]

            # 관리자의 기존 설정 확인
            existing = await conn.fetchrow("""
                SELECT setting_uid FROM settings WHERE user_uid = $1
            """, admin_uid)

            if existing:
                # 업데이트
                await conn.execute("""
                    UPDATE settings
                    SET setting_alert = $1, warning_level = $2, danger_level = $3
                    WHERE user_uid = $4
                """, settings.notifications_enabled, settings.warning_level, settings.danger_level, admin_uid)
            else:
                # 새로 생성
                await conn.execute("""
                    INSERT INTO settings (user_uid, setting_alert, warning_level, danger_level)
                    VALUES ($1, $2, $3, $4)
                """, admin_uid, settings.notifications_enabled, settings.warning_level, settings.danger_level)

            # 감사 로그 기록
            await AuditLogger.log_event(
                event_type=AuditLogger.CONFIG_CHANGE,
                user_id=str(current_user["user_uid"]),
                details={
                    "action": "UPDATE_NOTIFICATION_SETTINGS",
                    "notifications_enabled": settings.notifications_enabled,
                    "warning_level": settings.warning_level,
                    "danger_level": settings.danger_level
                }
            )

            return {
                "status": "success",
                "message": "알림 설정이 성공적으로 업데이트되었습니다"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"알림 설정 업데이트 실패: {str(e)}")