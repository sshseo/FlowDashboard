# app/utils/logger.py
import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

def setup_logging():
    """로그 설정"""
    
    # 로그 디렉토리 생성
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    # 로그 파일 경로
    log_file = os.path.join(log_dir, "app.log")
    error_log_file = os.path.join(log_dir, "error.log")
    
    # 기본 로거 설정
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # 기존 핸들러 제거
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # 파일 핸들러 (일반 로그) - 10MB, 5개 파일 로테이션
    file_handler = RotatingFileHandler(
        log_file, 
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(file_formatter)
    file_handler.setLevel(logging.INFO)
    
    # 에러 파일 핸들러 (에러만)
    error_handler = RotatingFileHandler(
        error_log_file,
        maxBytes=10*1024*1024,
        backupCount=3,
        encoding='utf-8'
    )
    error_handler.setFormatter(file_formatter)
    error_handler.setLevel(logging.ERROR)
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler()
    console_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_formatter)
    console_handler.setLevel(logging.INFO)
    
    # 핸들러 추가
    logger.addHandler(file_handler)
    logger.addHandler(error_handler) 
    logger.addHandler(console_handler)
    
    # uvicorn 로거 설정
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.handlers = []
    uvicorn_logger.addHandler(file_handler)
    uvicorn_logger.addHandler(console_handler)
    
    # FastAPI 로거 설정  
    fastapi_logger = logging.getLogger("fastapi")
    fastapi_logger.handlers = []
    fastapi_logger.addHandler(file_handler)
    fastapi_logger.addHandler(console_handler)
    
    return logger

def get_logger(name: str = __name__):
    """로거 인스턴스 반환"""
    return logging.getLogger(name)