from pydantic import BaseModel
from typing import Optional


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
    phone: str


class CreateUserResponse(BaseModel):
    success: bool
    message: str
    user_uid: Optional[int] = None