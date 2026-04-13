"""Cloudflare R2 클라이언트 — S3 호환 API로 presigned URL 발급 및 파일 관리"""
import threading
import boto3
from config import get_settings

_client = None
_client_lock = threading.Lock()


def get_r2_client():
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                settings = get_settings()
                _client = boto3.client(
                    "s3",
                    endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
                    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                    region_name="auto",
                )
    return _client


def generate_upload_url(key: str, content_type: str = "image/jpeg", expires: int = 300) -> str:
    """presigned PUT URL 생성 (클라이언트가 직접 R2에 업로드)"""
    client = get_r2_client()
    settings = get_settings()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.R2_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires,
    )


def generate_download_url(key: str, expires: int = 3600) -> str:
    """presigned GET URL 생성 (스크린샷 조회용)"""
    client = get_r2_client()
    settings = get_settings()
    return client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.R2_BUCKET_NAME,
            "Key": key,
        },
        ExpiresIn=expires,
    )


def delete_object(key: str):
    """R2 오브젝트 삭제"""
    client = get_r2_client()
    settings = get_settings()
    client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
