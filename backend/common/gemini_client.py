import google.generativeai as genai
from config import get_settings

_configured = False


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
