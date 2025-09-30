from fastapi import APIRouter, HTTPException, Depends, Request
from app.models.auth import LoginRequest, LoginResponse, CreateUserRequest, CreateUserResponse, UserResponse, UserListResponse, UpdateUserRequest
from pydantic import BaseModel
from app.services.auth_service import AuthService
from app.dependencies import get_current_user
from app.database import get_db_pool

router = APIRouter()
auth_service = AuthService()


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, request: Request):
    """사용자 로그인 (로그인 시도 제한 포함)"""
    # 클라이언트 IP 추출
    client_ip = request.client.host
    
    # X-Forwarded-For 헤더 확인 (프록시 환경)
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    
    return await auth_service.authenticate_user(login_data, client_ip)


@router.get("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """토큰 검증"""
    return {"valid": True, "user": current_user}


@router.post("/create-user", response_model=CreateUserResponse)
async def create_user(user_data: CreateUserRequest, current_user: dict = Depends(get_current_user)):
    """새 사용자 생성 (관리자만 가능)"""
    return await auth_service.create_user(user_data, current_user["user_level"], current_user["user_id"])


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """비밀번호 변경"""
    try:
        result = await auth_service.change_password(
            current_user["user_uid"],
            password_data.current_password,
            password_data.new_password
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/monitoring-points")
async def get_available_monitoring_points(current_user: dict = Depends(get_current_user)):
    """flow_info 테이블에서 모니터링 지점 목록 조회"""
    try:
        db_pool = get_db_pool()

        async with db_pool.acquire() as conn:
            # flow_info 테이블에서 모든 모니터링 지점 조회
            points = await conn.fetch(
                """SELECT flow_uid, flow_name, flow_region, flow_address
                   FROM flow_info
                   ORDER BY flow_region, flow_name"""
            )

            point_list = [
                {
                    "value": str(point["flow_uid"]),
                    "label": f"{point['flow_name']} ({point['flow_region']})",
                    "flow_uid": point["flow_uid"],
                    "flow_name": point["flow_name"],
                    "flow_region": point["flow_region"],
                    "flow_address": point["flow_address"]
                }
                for point in points
            ]

            return {
                "status": "success",
                "monitoring_points": point_list
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"모니터링 지점 목록 조회 실패: {str(e)}")


# 사용자 관리 API 추가 (관리자 전용)

@router.get("/users", response_model=UserListResponse)
async def get_users(current_user: dict = Depends(get_current_user)):
    """사용자 목록 조회 (관리자만 가능)"""
    # 관리자 권한 확인
    if current_user.get("user_level", 1) != 0:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    try:
        db_pool = get_db_pool()
        async with db_pool.acquire() as conn:
            users = await conn.fetch("""
                SELECT user_uid, user_id, user_name, user_level, user_createtime, user_phone, user_flow_uid
                FROM users
                WHERE user_id != 'admin'
                ORDER BY user_createtime DESC
            """)

            user_list = []
            for user in users:
                user_list.append({
                    "user_uid": user["user_uid"],
                    "user_id": user["user_id"],
                    "user_name": user["user_name"],
                    "user_level": user["user_level"],
                    "user_phone": user["user_phone"] if user["user_phone"] else None,
                    "user_flow_uid": user["user_flow_uid"],
                    "created_at": user["user_createtime"].isoformat() if user["user_createtime"] else None
                })

            return {
                "status": "success",
                "users": user_list
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"사용자 목록 조회 실패: {str(e)}")

@router.put("/users/{user_uid}")
async def update_user(
    user_uid: int,
    user_data: UpdateUserRequest,
    current_user: dict = Depends(get_current_user)
):
    """사용자 정보 수정 (관리자만 가능)"""
    # 관리자 권한 확인
    if current_user.get("user_level", 1) != 0:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    try:
        db_pool = get_db_pool()
        async with db_pool.acquire() as conn:
            # 사용자 존재 확인
            existing_user = await conn.fetchrow(
                "SELECT user_uid, user_id FROM users WHERE user_uid = $1", user_uid
            )

            if not existing_user:
                raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

            # admin 계정 수정 방지 (시스템 관리자 보호)
            if existing_user["user_id"] == "admin" and current_user["user_uid"] != user_uid:
                raise HTTPException(status_code=400, detail="시스템 관리자(admin) 계정은 수정할 수 없습니다")

            # 자기 자신의 권한 레벨은 변경할 수 없음
            if user_uid == current_user["user_uid"] and user_data.user_level != current_user["user_level"]:
                raise HTTPException(status_code=400, detail="자신의 권한 레벨은 변경할 수 없습니다")

            # 기존 사용자 정보 조회 (전화번호와 담당지점 유지를 위해)
            current_user_info = await conn.fetchrow(
                "SELECT user_phone, user_flow_uid FROM users WHERE user_uid = $1", user_uid
            )

            # 전화번호가 제공되지 않았으면 기존 값 유지
            phone_to_update = user_data.user_phone if user_data.user_phone else current_user_info['user_phone']

            # 담당지점 처리 - 관리자가 아니고 담당지점이 제공되지 않았으면 기존 값 유지
            if user_data.user_level != 0:
                flow_uid_to_update = user_data.user_flow_uid if user_data.user_flow_uid is not None else current_user_info['user_flow_uid']
            else:
                flow_uid_to_update = None  # 관리자는 담당지점 None


            # 비밀번호가 제공된 경우 해시 처리
            if user_data.password:
                from app.utils.auth_utils import hash_password as hash_pwd
                hashed_password = hash_pwd(user_data.password)
                await conn.execute("""
                    UPDATE users
                    SET user_name = $1, user_level = $2, user_phone = $3, user_flow_uid = $4, user_pwd = $5
                    WHERE user_uid = $6
                """, user_data.user_name, user_data.user_level, phone_to_update,
                    flow_uid_to_update, hashed_password, user_uid)
            else:
                # 비밀번호는 변경하지 않음
                await conn.execute("""
                    UPDATE users
                    SET user_name = $1, user_level = $2, user_phone = $3, user_flow_uid = $4
                    WHERE user_uid = $5
                """, user_data.user_name, user_data.user_level, phone_to_update,
                    flow_uid_to_update, user_uid)

            return {
                "status": "success",
                "message": "사용자 정보가 성공적으로 수정되었습니다"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"사용자 정보 수정 실패: {str(e)}")

@router.delete("/users/{user_uid}")
async def delete_user(
    user_uid: int,
    current_user: dict = Depends(get_current_user)
):
    """사용자 삭제 (관리자만 가능)"""
    # 관리자 권한 확인
    if current_user.get("user_level", 1) != 0:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    try:
        db_pool = get_db_pool()
        async with db_pool.acquire() as conn:
            # 사용자 존재 확인
            existing_user = await conn.fetchrow(
                "SELECT user_uid, user_id, user_level FROM users WHERE user_uid = $1", user_uid
            )

            if not existing_user:
                raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

            # 자기 자신은 삭제할 수 없음
            if user_uid == current_user["user_uid"]:
                raise HTTPException(status_code=400, detail="자신의 계정은 삭제할 수 없습니다")

            # admin 계정 삭제 방지 (시스템 관리자 보호)
            if existing_user["user_id"] == "admin":
                raise HTTPException(status_code=400, detail="시스템 관리자(admin) 계정은 삭제할 수 없습니다")

            # 마지막 관리자 삭제 방지
            if existing_user["user_level"] == 0:
                admin_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM users WHERE user_level = 0"
                )
                if admin_count <= 1:
                    raise HTTPException(status_code=400, detail="마지막 관리자 계정은 삭제할 수 없습니다")

            # 사용자 삭제
            await conn.execute("DELETE FROM users WHERE user_uid = $1", user_uid)

            return {
                "status": "success",
                "message": "사용자가 성공적으로 삭제되었습니다"
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"사용자 삭제 실패: {str(e)}")