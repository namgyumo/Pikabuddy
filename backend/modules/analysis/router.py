import asyncio
import json
import logging
import re
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from common.supabase_client import get_supabase
from common.gemini_client import get_gemini_model
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["분석"])


@router.get("/submissions/{submission_id}/analysis")
async def get_analysis(submission_id: str, user: dict = Depends(get_current_user)):
    """AI 분석 결과 조회"""
    supabase = get_supabase()
    result = (
        supabase.table("ai_analyses")
        .select("*")
        .eq("submission_id", submission_id)
        .single()
        .execute()
    )
    return result.data


def _build_paste_context(snapshots_data: list, code: str) -> str:
    """복붙 로그에서 AI에게 전달할 상세 컨텍스트를 생성한다."""
    paste_logs = [s for s in snapshots_data if s.get("is_paste") and s.get("paste_source") == "external"]
    if not paste_logs:
        return "외부 복붙: 없음"

    lines = code.split("\n") if code else []
    pasted_contents = []
    pasted_line_nums = []

    for log in paste_logs:
        content = (log.get("code_diff") or {}).get("pasted_content", "")
        if not content:
            continue
        pasted_contents.append(content)

        # Find which lines in the submitted code match this paste
        paste_lines = content.split("\n")
        for i in range(len(lines) - len(paste_lines) + 1):
            match = all(
                lines[i + j].strip() == paste_lines[j].strip()
                for j in range(len(paste_lines))
                if paste_lines[j].strip()
            )
            if match:
                pasted_line_nums.extend(range(i + 1, i + len(paste_lines) + 1))
                break

    # 복붙 비율 계산
    total_chars = len(code.replace(" ", "").replace("\n", "").replace("\t", "")) if code else 0
    paste_chars = sum(len(c.replace(" ", "").replace("\n", "").replace("\t", "")) for c in pasted_contents)
    paste_percent = min(100, round((paste_chars / total_chars) * 100)) if total_chars > 0 else 0

    parts = [f"외부 복붙: {len(paste_logs)}회 / 복붙 비율: {paste_percent}% ({paste_chars}자 / 전체 {total_chars}자)"]
    if pasted_line_nums:
        parts.append(f"복붙된 줄 번호: {sorted(set(pasted_line_nums))}")
    for idx, content in enumerate(pasted_contents, 1):
        preview = content[:200] + ("..." if len(content) > 200 else "")
        parts.append(f"복붙 #{idx} 내용:\n```\n{preview}\n```")

    return "\n".join(parts)


POLICY_DESCRIPTIONS = {
    "free": "자유 모드 - AI 사용 및 복붙을 허용합니다. 복붙 여부는 참고만 하세요.",
    "normal": "보통 모드 - 복붙은 감지되며, 과도한 복붙은 감점 요소입니다.",
    "strict": "엄격 모드 - AI 사용과 복붙이 제한됩니다. 복붙이 있으면 상당한 감점이 필요합니다.",
    "exam": "시험 모드 - 모든 외부 도구와 복붙이 금지됩니다. 복붙이 발견되면 부정행위로 간주하여 큰 감점을 하세요.",
}

STRICTNESS_DESCRIPTIONS = {
    "mild": "순한맛 - 관대하게 채점하세요. 노력과 시도를 높이 평가하고, 작은 실수는 크게 감점하지 마세요. 격려 위주로 피드백하세요.",
    "normal": "보통맛 - 균형 잡힌 채점을 하세요. 잘한 점은 칭찬하되 부족한 점도 명확히 지적하세요.",
    "strict": "매운맛 - 엄격하게 채점하세요. 높은 기준을 적용하고, 사소한 부분도 꼼꼼히 평가하세요. 80점 이상은 정말 잘한 경우에만 부여하세요.",
}


@router.get("/submissions/{submission_id}/feedback-stream")
async def feedback_stream(submission_id: str, user: dict = Depends(get_current_user)):
    """AI 피드백 SSE 스트리밍"""
    supabase = get_supabase()

    # 이미 분석이 존재하면 기존 결과를 스트리밍으로 재전달
    existing = (
        supabase.table("ai_analyses")
        .select("*")
        .eq("submission_id", submission_id)
        .execute()
    )
    if existing.data:
        cached_feedback = existing.data[0].get("feedback", "")

        async def stream_cached():
            yield {"event": "message", "data": json.dumps({"type": "chunk", "text": cached_feedback}, ensure_ascii=False)}
            yield {"event": "message", "data": json.dumps({"type": "done"}, ensure_ascii=False)}

        return EventSourceResponse(stream_cached())

    submission = (
        supabase.table("submissions")
        .select("*, assignments(*)")
        .eq("id", submission_id)
        .single()
        .execute()
    )
    if not submission.data:
        raise HTTPException(status_code=404, detail="제출물을 찾을 수 없습니다.")

    sub = submission.data
    assignment = sub.get("assignments", {})

    # Get starter code from assignment problems
    problems = assignment.get("problems", [])
    problem_idx = sub.get("problem_index", 0)
    starter_code = ""
    if isinstance(problems, list) and len(problems) > problem_idx:
        starter_code = problems[problem_idx].get("starter_code", "") or ""

    snapshots = (
        supabase.table("snapshots")
        .select("*")
        .eq("assignment_id", sub["assignment_id"])
        .eq("student_id", sub["student_id"])
        .order("created_at")
        .execute()
    )

    paste_count = sum(1 for s in snapshots.data if s.get("is_paste") and s.get("paste_source") == "external")
    ai_policy = assignment.get("ai_policy", "normal")
    policy_desc = POLICY_DESCRIPTIONS.get(ai_policy, "")
    grading_strictness = assignment.get("grading_strictness", "normal")
    strictness_desc = STRICTNESS_DESCRIPTIONS.get(grading_strictness, "")
    grading_note = assignment.get("grading_note", "") or ""

    assignment_type = assignment.get("type", "coding")

    if assignment_type == "writing" or (assignment_type == "both" and sub.get("content")):
        writing_content = sub.get("content")
        if isinstance(writing_content, dict):
            def extract_text(node):
                if isinstance(node, dict):
                    if node.get("type") == "text":
                        return node.get("text", "")
                    children = node.get("content", [])
                    return "\n".join(extract_text(c) for c in children if c)
                return ""
            writing_text = extract_text(writing_content)
        else:
            writing_text = sub.get("code", "")

        writing_prompt = assignment.get("writing_prompt", "")
        paste_context = _build_paste_context(snapshots.data, writing_text)

        prompt = f"""당신은 친절한 글쓰기 튜터입니다. 학생의 글을 분석하고 피드백을 작성하세요.

과제: {assignment.get('title', '')} / 주제: {assignment.get('topic', '')}
글쓰기 지시문: {writing_prompt}

=== AI 정책 ===
{policy_desc}

=== 채점 기준 ===
{strictness_desc}
{f'교수 유의사항: {grading_note}' if grading_note else ''}

=== 복붙 분석 ===
{paste_context}

학생 제출 글:
\"\"\"
{writing_text}
\"\"\"

글자 수: {len(writing_text)}자

아래 형식을 Markdown으로 작성하세요. 각 섹션 제목은 ##으로, 소제목은 ###으로, 중요 키워드는 **굵게**, 리스트는 - 기호를 사용하세요.

## 🤖 피카버디의 추천 점수는 **[0~100점]점**이에요!

## 📝 종합 피드백
[2~3문장으로 전반적인 평가]

## 📖 논리 구조
[서론-본론-결론 구성, 문단 연결, 논리 흐름 분석]

## ✍️ 표현력
[어휘 다양성, 문장 구조, 문법 정확성]

## 🎯 주제 적합도
[과제 지시문에 얼마나 부합하는지]

## 📋 복붙 분석
[위 복붙 데이터를 바탕으로 복붙 여부와 그에 따른 감점 사유를 설명. 복붙이 없으면 "외부 복붙 없이 직접 작성했습니다"라고 표시]

## 💡 개선 제안
[구체적인 개선 방법 2~3개를 번호로]

중요: 추천 점수에는 AI 정책에 따른 복붙 감점과 채점 기준(순한맛/보통맛/매운맛)을 반영하세요.
교수 유의사항이 있다면 반드시 점수에 반영하세요.
말투는 친근하고 격려하는 톤으로. 학생이 잘한 점도 반드시 언급하세요.
점수는 교수님이 최종 확정하므로, 추천 점수라고 표현하세요."""
    else:
        paste_context = _build_paste_context(snapshots.data, sub.get("code", ""))

        prompt = f"""당신은 친절한 코딩 튜터입니다. 학생의 코드를 분석하고 피드백을 작성하세요.

과제: {assignment.get('title', '')} / 주제: {assignment.get('topic', '')}
루브릭: {json.dumps(assignment.get('rubric', {}), ensure_ascii=False)}

=== AI 정책 ===
{policy_desc}

=== 채점 기준 ===
{strictness_desc}
{f'교수 유의사항: {grading_note}' if grading_note else ''}

=== 복붙 분석 ===
{paste_context}

{f'기본 제공 코드 (starter code):\n```\n{starter_code}\n```\n' if starter_code else ''}
학생 제출 코드:
```
{sub['code']}
```

코딩 스냅샷: {len(snapshots.data)}개

{f'중요: 기본 제공 코드는 평가하지 마세요. 학생이 직접 작성하거나 수정한 부분만 분석하세요.' if starter_code else ''}

아래 형식을 Markdown으로 작성하세요. 각 섹션 제목은 ##으로, 소제목은 ###으로, 중요 키워드는 **굵게**, 리스트는 - 기호를 사용하세요.

## 🤖 피카버디의 추천 점수는 **[0~100점]점**이에요!

## 📝 종합 피드백
[2~3문장으로 전반적인 평가]

## 🔍 로직 분석
[학생이 작성한 로직의 장단점]

## ✨ 코드 품질
[변수명, 구조, 가독성 등]

## 📋 복붙 분석
[위 복붙 데이터를 바탕으로 어떤 부분이 복붙인지, 몇 줄인지 구체적으로 설명. 복붙이 없으면 "외부 복붙 없이 직접 작성했습니다"라고 표시]

## 💡 개선 제안
[구체적인 개선 방법 2~3개를 번호로]

중요: 추천 점수에는 AI 정책에 따른 복붙 감점과 채점 기준(순한맛/보통맛/매운맛)을 반영하세요.
교수 유의사항이 있다면 반드시 점수에 반영하세요.
말투는 친근하고 격려하는 톤으로. 학생이 잘한 점도 반드시 언급하세요.
점수는 교수님이 최종 확정하므로, 추천 점수라고 표현하세요."""

    async def generate():
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def run_stream():
            try:
                model = get_gemini_model()
                response = model.generate_content(prompt, stream=True)
                for chunk in response:
                    if chunk.text:
                        loop.call_soon_threadsafe(queue.put_nowait, ("chunk", chunk.text))
                loop.call_soon_threadsafe(queue.put_nowait, ("done", None))
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, ("error", str(e)))

        loop.run_in_executor(None, run_stream)

        accumulated = ""
        while True:
            event_type, data = await queue.get()

            if event_type == "chunk":
                accumulated += data
                yield {"event": "message", "data": json.dumps({"type": "chunk", "text": data}, ensure_ascii=False)}

            elif event_type == "done":
                # Extract score from accumulated text
                score = None
                score_match = (
                    re.search(r"추천 점수는\s*\*{0,2}(\d+)\*{0,2}", accumulated)
                    or re.search(r"점수[:\s]*\*{0,2}(\d+)", accumulated)
                )
                if score_match:
                    score = int(score_match.group(1))

                try:
                    supabase.table("ai_analyses").insert({
                        "submission_id": submission_id,
                        "score": score,
                        "feedback": accumulated,
                    }).execute()
                    supabase.table("submissions").update(
                        {"status": "completed"}
                    ).eq("id", submission_id).execute()
                except Exception as db_err:
                    logger.error(f"[Analysis] DB 저장 실패 submission_id={submission_id}: {db_err}")

                yield {"event": "message", "data": json.dumps({"type": "done"}, ensure_ascii=False)}
                break

            elif event_type == "error":
                logger.error(f"[Analysis] Gemini 스트리밍 오류 submission_id={submission_id}: {data}")
                yield {"event": "message", "data": json.dumps({"type": "error", "text": data}, ensure_ascii=False)}
                break

    return EventSourceResponse(generate())
