import time
import threading
from collections import defaultdict
import google.generativeai as genai
from config import get_settings

_configured = False

# ── Model tiers ──
MODEL_HEAVY = "gemini-3-flash-preview"  # 분석, 튜터, 문제 생성 등 복잡한 작업
MODEL_LIGHT = "gemini-2.5-flash-lite"   # 요약, 분류, 테스트케이스 등 경량 작업

# 과부하/에러 시 순서대로 시도할 모델 목록
FALLBACK_MODELS = [MODEL_HEAVY, "gemini-2.5-flash", MODEL_LIGHT]

# ── Pricing (USD per 1M tokens) ──
PRICING = {
    "gemini-3-flash-preview": {"input": 0.50, "output": 3.00},
    "gemini-3.0-flash":       {"input": 0.50, "output": 3.00},
    "gemini-2.5-flash":       {"input": 0.30, "output": 2.50},
    "gemini-2.5-flash-lite":  {"input": 0.10, "output": 0.40},
}
_DEFAULT_PRICE = {"input": 0.50, "output": 3.00}

# ── Token tracker ──
_lock = threading.Lock()
_token_stats: dict = {
    "by_model": defaultdict(lambda: {"calls": 0, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "cost_usd": 0.0}),
    "by_endpoint": defaultdict(lambda: {"calls": 0, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "cost_usd": 0.0}),
    "history": [],  # 최근 100건
    "totals": {"calls": 0, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "cost_usd": 0.0},
    "started_at": time.time(),
}


def record_usage(model_name: str, usage_metadata, endpoint: str = "unknown"):
    """응답의 usage_metadata를 기록한다."""
    if not usage_metadata:
        return
    inp = getattr(usage_metadata, "prompt_token_count", 0) or 0
    out = getattr(usage_metadata, "candidates_token_count", 0) or 0
    total = inp + out
    prices = PRICING.get(model_name, _DEFAULT_PRICE)
    cost = (inp / 1_000_000) * prices["input"] + (out / 1_000_000) * prices["output"]

    entry = {
        "model": model_name,
        "endpoint": endpoint,
        "input_tokens": inp,
        "output_tokens": out,
        "total_tokens": total,
        "cost_usd": round(cost, 8),
        "timestamp": time.time(),
    }

    with _lock:
        # by_model
        m = _token_stats["by_model"][model_name]
        m["calls"] += 1; m["input_tokens"] += inp; m["output_tokens"] += out
        m["total_tokens"] += total; m["cost_usd"] += cost
        # by_endpoint
        e = _token_stats["by_endpoint"][endpoint]
        e["calls"] += 1; e["input_tokens"] += inp; e["output_tokens"] += out
        e["total_tokens"] += total; e["cost_usd"] += cost
        # totals
        t = _token_stats["totals"]
        t["calls"] += 1; t["input_tokens"] += inp; t["output_tokens"] += out
        t["total_tokens"] += total; t["cost_usd"] += cost
        # history (keep last 100)
        _token_stats["history"].append(entry)
        if len(_token_stats["history"]) > 100:
            _token_stats["history"] = _token_stats["history"][-100:]


def get_token_stats() -> dict:
    """현재 토큰 사용 통계를 반환한다."""
    with _lock:
        elapsed = time.time() - _token_stats["started_at"]
        return {
            "uptime_seconds": round(elapsed),
            "totals": {**_token_stats["totals"], "cost_usd": round(_token_stats["totals"]["cost_usd"], 6)},
            "by_model": {k: {**v, "cost_usd": round(v["cost_usd"], 6)} for k, v in _token_stats["by_model"].items()},
            "by_endpoint": {k: {**v, "cost_usd": round(v["cost_usd"], 6)} for k, v in _token_stats["by_endpoint"].items()},
            "recent_calls": list(_token_stats["history"][-20:]),
        }


def reset_token_stats():
    """통계를 초기화한다."""
    with _lock:
        _token_stats["by_model"].clear()
        _token_stats["by_endpoint"].clear()
        _token_stats["history"].clear()
        _token_stats["totals"] = {"calls": 0, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "cost_usd": 0.0}
        _token_stats["started_at"] = time.time()


# ── Gemini model factory ──

def get_gemini_model(model_name: str = MODEL_HEAVY, json_mode: bool = False):
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


# ── Embedding ──

MODEL_EMBEDDING = "models/gemini-embedding-001"


def get_embeddings(texts: list[str]) -> list[list[float]]:
    """텍스트 리스트의 임베딩 벡터를 반환한다. 빈 텍스트는 빈 벡터로."""
    global _configured
    if not _configured:
        settings = get_settings()
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True

    if not texts:
        return []

    # 빈 문자열 필터링
    valid_indices = [i for i, t in enumerate(texts) if t.strip()]
    valid_texts = [texts[i] for i in valid_indices]

    if not valid_texts:
        return [[] for _ in texts]

    # 배치 임베딩 (Gemini는 한 번에 최대 100개, 768차원으로 축소)
    all_embeddings: list[list[float]] = []
    for start in range(0, len(valid_texts), 100):
        batch = valid_texts[start:start + 100]
        result = genai.embed_content(
            model=MODEL_EMBEDDING, content=batch,
            output_dimensionality=768,
        )
        all_embeddings.extend(result["embedding"])

    # 원래 인덱스에 맞춰 재배치
    output = [[] for _ in texts]
    for idx, emb in zip(valid_indices, all_embeddings):
        output[idx] = emb

    return output


def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def _norm(a: list[float]) -> float:
    import math
    return math.sqrt(sum(x * x for x in a))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """두 벡터의 코사인 유사도."""
    if not a or not b:
        return 0.0
    na, nb = _norm(a), _norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return _dot(a, b) / (na * nb)


def pairwise_similarities(embeddings: list[list[float]], threshold: float = 0.65) -> list[tuple[int, int, float]]:
    """임베딩 리스트에서 threshold 이상인 (i, j, similarity) 쌍을 반환."""
    valid = [(i, e) for i, e in enumerate(embeddings) if e]
    if len(valid) < 2:
        return []

    # L2 정규화
    normed = []
    indices = []
    for i, emb in valid:
        n = _norm(emb)
        if n == 0:
            normed.append(emb)
        else:
            normed.append([x / n for x in emb])
        indices.append(i)

    results = []
    for a in range(len(indices)):
        for b in range(a + 1, len(indices)):
            s = _dot(normed[a], normed[b])
            if s >= threshold:
                results.append((indices[a], indices[b], round(s, 3)))
    return results
