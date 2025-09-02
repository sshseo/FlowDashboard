# app/middleware/security.py
from fastapi import Request, Response
from fastapi.responses import RedirectResponse
import os

class SecurityMiddleware:
    """보안 헤더 및 HTTPS 강제 미들웨어"""
    
    def __init__(self, app):
        self.app = app
        self.force_https = os.getenv("FORCE_HTTPS", "false").lower() == "true"
        self.hsts_max_age = int(os.getenv("HSTS_MAX_AGE", "31536000"))  # 1년
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # HTTPS 강제 리다이렉트 (프로덕션 환경에서만)
        if self.force_https and not self._is_https(request):
            if request.method == "GET":
                # HTTP를 HTTPS로 리다이렉트
                https_url = str(request.url).replace("http://", "https://", 1)
                response = RedirectResponse(https_url, status_code=301)
                await response(scope, receive, send)
                return
        
        # 응답 처리
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = dict(message.get("headers", []))
                
                # 보안 헤더 추가
                security_headers = self._get_security_headers(request)
                for key, value in security_headers.items():
                    headers[key.lower().encode()] = value.encode()
                
                message["headers"] = list(headers.items())
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
    
    def _is_https(self, request: Request) -> bool:
        """HTTPS 여부 확인"""
        # X-Forwarded-Proto 헤더 확인 (프록시 환경)
        if "x-forwarded-proto" in request.headers:
            return request.headers["x-forwarded-proto"].lower() == "https"
        
        # 직접 연결 확인
        return request.url.scheme == "https"
    
    def _get_security_headers(self, request: Request) -> dict:
        """보안 헤더 생성"""
        headers = {
            # XSS 보호
            "X-XSS-Protection": "1; mode=block",
            
            # 콘텐츠 타입 추론 방지
            "X-Content-Type-Options": "nosniff",
            
            # 클릭재킹 방지
            "X-Frame-Options": "DENY",
            
            # 레퍼러 정책
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # 콘텐츠 보안 정책 (CSP)
            "Content-Security-Policy": self._get_csp_header(),
            
            # 권한 정책
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }
        
        # HTTPS 환경에서만 HSTS 헤더 추가
        if self._is_https(request):
            headers["Strict-Transport-Security"] = f"max-age={self.hsts_max_age}; includeSubDomains; preload"
        
        return headers
    
    def _get_csp_header(self) -> str:
        """Content Security Policy 헤더 생성"""
        # 개발/프로덕션 환경에 따라 조정 필요
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # React 개발모드용
            "style-src 'self' 'unsafe-inline'",  # Tailwind CSS용
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'"
        ]
        
        return "; ".join(csp_directives)

def add_security_headers(app):
    """FastAPI 앱에 보안 미들웨어 추가"""
    app.add_middleware(SecurityMiddleware)