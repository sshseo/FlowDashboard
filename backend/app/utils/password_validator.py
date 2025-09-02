# app/utils/password_validator.py
import re
from typing import List, Dict

class PasswordValidator:
    """전자정부 프레임워크 패스워드 정책 검증"""
    
    @staticmethod
    def validate_password(password: str, username: str = None) -> Dict[str, any]:
        """
        패스워드 정책 검증
        Args:
            password: 검증할 패스워드
            username: 사용자명 (패스워드에 포함 여부 확인용)
        Returns:
            Dict: {"valid": bool, "errors": List[str], "strength": str}
        """
        errors = []
        
        # 1. 길이 검사 (최소 8자)
        if len(password) < 8:
            errors.append("패스워드는 최소 8자 이상이어야 합니다.")
        
        # 2. 최대 길이 검사 (보안상 128자 제한)
        if len(password) > 128:
            errors.append("패스워드는 최대 128자까지 가능합니다.")
        
        # 3. 복잡도 검사 (대문자, 소문자, 숫자, 특수문자 중 3종류 이상)
        char_types = 0
        if re.search(r'[a-z]', password):
            char_types += 1
        if re.search(r'[A-Z]', password):
            char_types += 1
        if re.search(r'[0-9]', password):
            char_types += 1
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            char_types += 1
        
        if char_types < 3:
            errors.append("대문자, 소문자, 숫자, 특수문자 중 3종류 이상을 포함해야 합니다.")
        
        # 4. 연속 문자 검사 (3자 이상 연속 금지)
        if PasswordValidator._has_sequential_chars(password, 3):
            errors.append("3자 이상 연속된 문자는 사용할 수 없습니다.")
        
        # 5. 반복 문자 검사 (3자 이상 반복 금지)
        if PasswordValidator._has_repeated_chars(password, 3):
            errors.append("3자 이상 반복된 문자는 사용할 수 없습니다.")
        
        # 6. 사용자명 포함 검사
        if username and len(username) >= 3:
            if username.lower() in password.lower():
                errors.append("패스워드에 사용자명을 포함할 수 없습니다.")
        
        # 7. 일반적인 취약 패스워드 검사
        weak_passwords = [
            "password", "123456", "qwerty", "admin", "root",
            "password123", "123456789", "qwerty123"
        ]
        if password.lower() in weak_passwords:
            errors.append("너무 간단한 패스워드입니다. 다른 패스워드를 선택해주세요.")
        
        # 강도 계산
        strength = PasswordValidator._calculate_strength(password, char_types)
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "strength": strength,
            "score": char_types * 25  # 0-100 점수
        }
    
    @staticmethod
    def _has_sequential_chars(password: str, limit: int) -> bool:
        """연속 문자 검사"""
        for i in range(len(password) - limit + 1):
            chars = password[i:i+limit]
            # ASCII 코드 연속 확인
            if all(ord(chars[j+1]) == ord(chars[j]) + 1 for j in range(len(chars)-1)):
                return True
            # 역순 연속 확인
            if all(ord(chars[j+1]) == ord(chars[j]) - 1 for j in range(len(chars)-1)):
                return True
        return False
    
    @staticmethod
    def _has_repeated_chars(password: str, limit: int) -> bool:
        """반복 문자 검사"""
        for i in range(len(password) - limit + 1):
            chars = password[i:i+limit]
            if len(set(chars)) == 1:  # 모든 문자가 같음
                return True
        return False
    
    @staticmethod
    def _calculate_strength(password: str, char_types: int) -> str:
        """패스워드 강도 계산"""
        score = 0
        
        # 길이 점수
        if len(password) >= 8:
            score += 25
        if len(password) >= 12:
            score += 25
        
        # 복잡도 점수
        score += char_types * 12.5
        
        if score >= 75:
            return "강함"
        elif score >= 50:
            return "보통"
        else:
            return "약함"