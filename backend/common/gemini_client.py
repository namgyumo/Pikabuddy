import google.generativeai as genai
from config import get_settings

_configured = False

# 503 과부하 시 순서대로 시도할 모델 목록
FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]


def get_gemini_model(model_name: str = "gemini-2.5-flash", json_mode: bool = False):
    global _configured
    if not _configured:
        settings = get_settings()
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True
    config = {}
    if json_mode:
        config["response_mime_type"] = "application/json"
    return genai.GenerativeModel(model_name, generation_config=config if config else None)


def get_gemini_model_with_fallback(json_mode: bool = False):
    """503 과부하 시 폴백 모델로 자동 전환. (model, name) 튜플의 제너레이터 반환."""
    for name in FALLBACK_MODELS:
        yield get_gemini_model(name, json_mode=json_mode), name
