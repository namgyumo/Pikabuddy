import threading
from supabase import create_client, Client
from config import get_settings

_client: Client | None = None
_client_lock = threading.Lock()


def get_supabase() -> Client:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                settings = get_settings()
                _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client
