from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json
import asyncio
from datetime import datetime

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        """모든 연결된 클라이언트에게 메시지 브로드캐스트"""
        if self.active_connections:
            message_str = json.dumps(message, ensure_ascii=False, default=str)
            disconnected = []
            
            for connection in self.active_connections:
                try:
                    await connection.send_text(message_str)
                except Exception:
                    disconnected.append(connection)
            
            # 연결이 끊어진 웹소켓 제거
            for connection in disconnected:
                if connection in self.active_connections:
                    self.active_connections.remove(connection)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # 클라이언트로부터 메시지 수신 (keep-alive 등)
            data = await websocket.receive_text()
            
            # ping 메시지에 대한 pong 응답
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def broadcast_alert_update(alert_type: str, data: dict):
    """알람 업데이트를 모든 클라이언트에 브로드캐스트"""
    message = {
        "type": "alert_update",
        "alert_type": alert_type,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast(message)

async def broadcast_system_status(status_data: dict):
    """시스템 상태 업데이트를 모든 클라이언트에 브로드캐스트"""
    message = {
        "type": "system_status",
        "data": status_data,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast(message)