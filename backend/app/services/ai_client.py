import asyncio
import json
import logging
from typing import Optional
from datetime import datetime
from app.services.ai_data_service import ai_data_service

logger = logging.getLogger(__name__)

MSG = {
    'SET_ALARM_REQ': 1001,
    'SET_ALARM_RESP': 2001,
    'INFERENCE_REQ': 1002,
    'INFERENCE_RESP': 2002,
    'ALARM_OCCUR_RESP': 2003,
    'ALARM_RELEASE_RESP': 2004,
}

class AITcpClient:
    def __init__(self, host="172.30.1.62", port=50000):
        self.host = host
        self.port = port
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.running = False
        self.tx_id = 1
        self.reconnect_interval = 5

    def _pack_header(self, message_type: int, tx_id: int, flags: int = 0, status: int = 0) -> bytes:
        # >HIBh = uint16, uint32, uint8, int16 (Big Endian)
        import struct
        return struct.pack('>HIBh', message_type, tx_id, flags, status)

    async def _send_message(self, message_type: int, body: dict, tx_id: Optional[int] = None):
        import struct
        if tx_id is None:
            tx_id = self.tx_id
            self.tx_id += 1

        body_bytes = json.dumps(body, ensure_ascii=False).encode('utf-8')
        header = self._pack_header(message_type, tx_id, 0, 0)
        total_len = len(header) + len(body_bytes)     # header + body
        length_bytes = struct.pack('>I', total_len)   # 4B big-endian

        self.writer.write(length_bytes + header + body_bytes)
        await self.writer.drain()
        logger.debug(f"→ sent type={message_type}, tx={tx_id}, bytes={total_len}")

    async def _read_exact(self, n: int) -> bytes:
        data = await self.reader.readexactly(n)
        return data

    async def _read_one_message(self):
        import struct
        # 1) length(4)
        length_bytes = await self._read_exact(4)
        total_len = struct.unpack('>I', length_bytes)[0]
        # 2) payload(header+body)
        payload = await self._read_exact(total_len)
        header = payload[:9]
        body = payload[9:]

        message_type, tx_id, flags, status = struct.unpack('>HIBh', header)
        try:
            data = json.loads(body.decode('utf-8')) if body else {}
        except Exception:
            data = {}
        return message_type, tx_id, status, data

    def _to_ai_data(self, resp: dict) -> Optional[dict]:
        # 문서/서버 응답(metadata 첫 원소 사용) → 우리 파이프라인 형식으로 매핑
        # water_level_m, velocity_mps, flow_rate_m3ps 로 변환
        if "metadata" in resp and isinstance(resp["metadata"], list) and resp["metadata"]:
            m = resp["metadata"][0]
            return {
                "water_level_m": float(m.get("surface_depth_m", 0.0)),
                "velocity_mps": float(m.get("velocity", 0.0)),
                "flow_rate_m3ps": float(m.get("volume", 0.0)),
            }
        return None

    async def _handle_stream(self):
        while self.running:
            try:
                mtype, tx, status, data = await self._read_one_message()
                logger.debug(f"← recv type={mtype}, tx={tx}, status={status}, keys={list(data.keys())}")

                if mtype in (MSG['INFERENCE_RESP'], MSG['ALARM_OCCUR_RESP'], MSG['ALARM_RELEASE_RESP']):
                    # AI 서버에서 받은 데이터 로그
                    logger.info(f"AI 서버로부터 받은 데이터 수신: {json.dumps(data, ensure_ascii=False, indent=2)}")
                    
                    ai = self._to_ai_data(data)
                    if ai:
                        await ai_data_service.process_ai_data(ai)
                elif mtype == MSG['SET_ALARM_RESP']:
                    logger.info(f"Alarm set resp: {data}")
                else:
                    logger.warning(f"Unknown message type: {mtype} / body={data}")
            except asyncio.IncompleteReadError:
                logger.info("서버가 연결을 종료했습니다")
                break
            except Exception as e:
                logger.error(f"수신 오류: {e}")
                break

    async def _connect_once(self):
        self.reader, self.writer = await asyncio.open_connection(self.host, self.port)
        logger.info(f"TCP 연결됨: {self.host}:{self.port}")

        # 필요 시 최초 알람설정 보내기 (옵션)
        # await self._send_message(MSG['SET_ALARM_REQ'], {
        #     "type": "set-alarm-level",
        #     "client-id": "flow_dashboard",   # 실제에 맞게 UUID/ID 사용
        #     "timestamp": int(datetime.now().timestamp()),
        #     "metadata": [{"channel": 1, "water_level_alarm": 2.00, "water_level_release": 1.90}]
        # })

        # INFERENCE 요청 (채널 전체: channel=0 / 특정 채널: n)
        await self._send_message(MSG['INFERENCE_REQ'], {
            "type": "inference",
            "client-id": "flow_dashboard",
            "channel": 0,
            "timestamp": int(datetime.now().timestamp())
        })

        await self._handle_stream()

    async def start(self):
        if self.running:
            return
        self.running = True
        while self.running:
            try:
                await self._connect_once()
            except Exception as e:
                logger.error(f"연결 실패: {e}. {self.reconnect_interval}s 후 재시도")
                await asyncio.sleep(self.reconnect_interval)

    async def stop(self):
        self.running = False
        try:
            if self.writer:
                self.writer.close()
                await self.writer.wait_closed()
        finally:
            self.reader = None
            self.writer = None
            logger.info("TCP 클라이언트 중지")

# 싱글톤
ai_tcp_client = AITcpClient()

class AIClient:
    """AI 서버 연결 관리 클래스"""
    
    def __init__(self):
        self.tcp_client = ai_tcp_client
    
    async def start_connection(self):
        """AI 서버 연결 시작"""
        await self.tcp_client.start()
    
    async def stop_connection(self):
        """AI 서버 연결 중지"""
        await self.tcp_client.stop()
    
    def is_connected(self):
        """연결 상태 확인"""
        return (self.tcp_client.running and 
                self.tcp_client.writer is not None and 
                not self.tcp_client.writer.is_closing())

# 싱글톤 인스턴스
ai_client = AIClient()
