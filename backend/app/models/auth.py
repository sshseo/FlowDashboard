from pydantic import BaseModel
from typing import Optional, List


class LoginRequest(BaseModel):
    username: str
    password: str
    rememberMe: bool = False


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_info: dict


class UserInfo(BaseModel):
    user_uid: int
    user_id: str
    user_name: str
    user_level: int


class CreateUserRequest(BaseModel):
    user_id: str
    password: str
    user_name: str
    user_level: int
    user_flow_uid: Optional[int] = None
    phone: Optional[str] = None


class CreateUserResponse(BaseModel):
    success: bool
    message: str
    user_uid: Optional[int] = None


class UserResponse(BaseModel):
    user_uid: int
    user_id: str
    user_name: str
    user_level: int
    user_phone: Optional[str] = None
    user_flow_uid: Optional[int] = None
    created_at: Optional[str] = None


class UserListResponse(BaseModel):
    status: str
    users: List[UserResponse]


class UpdateUserRequest(BaseModel):
    user_name: str
    user_level: int
    user_phone: Optional[str] = None
    user_flow_uid: Optional[int] = None
    password: Optional[str] = None