# app/utils/encryption.py
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import hashlib
import secrets

class DataEncryption:
    """데이터 암호화 유틸리티 - 개인정보보호법 준수"""
    
    def __init__(self, password: str = None):
        """
        Args:
            password: 암호화 키 생성용 패스워드 (환경변수에서 가져옴)
        """
        if not password:
            password = os.getenv("ENCRYPTION_KEY", "default-key-change-in-production")
        
        self.key = self._derive_key(password)
        self.cipher_suite = Fernet(self.key)
    
    def _derive_key(self, password: str) -> bytes:
        """패스워드에서 암호화 키 생성"""
        password_bytes = password.encode()
        salt = os.getenv("ENCRYPTION_SALT", "default-salt").encode()
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password_bytes))
        return key
    
    def encrypt(self, data: str) -> str:
        """데이터 암호화"""
        if not data:
            return ""
        
        try:
            encrypted_data = self.cipher_suite.encrypt(data.encode('utf-8'))
            return base64.urlsafe_b64encode(encrypted_data).decode('utf-8')
        except Exception as e:
            raise Exception(f"암호화 실패: {str(e)}")
    
    def decrypt(self, encrypted_data: str) -> str:
        """데이터 복호화"""
        if not encrypted_data:
            return ""
        
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode('utf-8'))
            decrypted_data = self.cipher_suite.decrypt(encrypted_bytes)
            return decrypted_data.decode('utf-8')
        except Exception as e:
            raise Exception(f"복호화 실패: {str(e)}")
    
    def encrypt_dict(self, data: dict, fields_to_encrypt: list) -> dict:
        """딕셔너리에서 특정 필드만 암호화"""
        encrypted_data = data.copy()
        
        for field in fields_to_encrypt:
            if field in encrypted_data and encrypted_data[field]:
                encrypted_data[field] = self.encrypt(str(encrypted_data[field]))
        
        return encrypted_data
    
    def decrypt_dict(self, data: dict, fields_to_decrypt: list) -> dict:
        """딕셔너리에서 특정 필드만 복호화"""
        decrypted_data = data.copy()
        
        for field in fields_to_decrypt:
            if field in decrypted_data and decrypted_data[field]:
                try:
                    decrypted_data[field] = self.decrypt(decrypted_data[field])
                except:
                    # 복호화 실패시 원본 유지 (이미 평문일 가능성)
                    pass
        
        return decrypted_data

class PasswordSecurity:
    """패스워드 보안 강화"""
    
    @staticmethod
    def generate_salt() -> str:
        """랜덤 솔트 생성"""
        return secrets.token_hex(32)
    
    @staticmethod
    def hash_password(password: str, salt: str = None) -> tuple:
        """
        패스워드 해싱 (SHA-256 + 솔트)
        Returns: (hashed_password, salt)
        """
        if not salt:
            salt = PasswordSecurity.generate_salt()
        
        # 패스워드 + 솔트 해싱
        password_salt = password + salt
        hashed = hashlib.sha256(password_salt.encode()).hexdigest()
        
        return hashed, salt
    
    @staticmethod
    def verify_password(password: str, hashed_password: str, salt: str) -> bool:
        """패스워드 검증"""
        test_hash, _ = PasswordSecurity.hash_password(password, salt)
        return test_hash == hashed_password
    
    @staticmethod
    def mask_personal_info(data: str, mask_char: str = "*") -> str:
        """개인정보 마스킹"""
        if not data or len(data) <= 2:
            return mask_char * len(data) if data else ""
        
        if len(data) <= 4:
            return data[0] + mask_char * (len(data) - 2) + data[-1]
        
        # 앞 2자리, 뒤 2자리 제외하고 마스킹
        return data[:2] + mask_char * (len(data) - 4) + data[-2:]

# 전역 암호화 인스턴스
encryption = DataEncryption()

# 개인정보 필드 정의
PERSONAL_INFO_FIELDS = [
    'user_name', 'user_email', 'user_phone', 
    'real_name', 'address', 'birth_date'
]

# 암호화 헬퍼 함수들
def encrypt_personal_data(data: dict) -> dict:
    """개인정보 암호화"""
    return encryption.encrypt_dict(data, PERSONAL_INFO_FIELDS)

def decrypt_personal_data(data: dict) -> dict:
    """개인정보 복호화"""
    return encryption.decrypt_dict(data, PERSONAL_INFO_FIELDS)

def mask_sensitive_fields(data: dict) -> dict:
    """민감 정보 마스킹 (로그용)"""
    masked_data = data.copy()
    
    for field in PERSONAL_INFO_FIELDS:
        if field in masked_data and masked_data[field]:
            masked_data[field] = PasswordSecurity.mask_personal_info(str(masked_data[field]))
    
    return masked_data