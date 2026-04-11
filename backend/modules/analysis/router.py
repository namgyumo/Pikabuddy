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
    "free": "Free mode - AI use and copy-paste are allowed. Note paste occurrences for reference only.",
    "normal": "Normal mode - Pastes are detected; excessive pasting is a deduction factor.",
    "strict": "Strict mode - AI use and pasting are restricted. Significant deduction if pasting is found.",
    "exam": "Exam mode - All external tools and pasting are forbidden. Pasting is treated as cheating with major deduction.",
}

STRICTNESS_DESCRIPTIONS = {
    "mild": "Mild grading - Be lenient. Value effort and attempts; do not heavily penalize minor mistakes. Focus on encouragement.",
    "normal": "Normal grading - Balanced grading. Praise strengths but also clearly point out weaknesses.",
    "strict": "Strict grading - Apply high standards. Evaluate even minor details carefully. Only give 80+ for truly excellent work.",
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

        prompt = f"""You are a friendly writing tutor. Analyze the student's essay and provide feedback.

Assignment: {assignment.get('title', '')} / Topic: {assignment.get('topic', '')}
Writing prompt: {writing_prompt}

=== AI Policy ===
{policy_desc}

=== Grading Criteria ===
{strictness_desc}
{f'Professor note: {grading_note}' if grading_note else ''}

=== Paste Analysis ===
{paste_context}

Student submission:
\"\"\"
{writing_text}
\"\"\"

Character count: {len(writing_text)}

Write in Markdown. Use ## for sections, ### for subsections, **bold** for keywords, - for lists.

## 🤖 피카버디의 추천 점수는 **[0~100점]점**이에요!

## 📝 종합 피드백
[2-3 sentence overall assessment]

## 📖 논리 구조
[Intro-body-conclusion structure, paragraph flow, logical coherence]

## ✍️ 표현력
[Vocabulary diversity, sentence structure, grammar accuracy]

## 🎯 주제 적합도
[How well the submission matches the assignment prompt]

## 📋 복붙 분석
[Based on paste data above, explain paste occurrences and deductions. If none, say "외부 복붙 없이 직접 작성했습니다"]

## 💡 개선 제안
[2-3 specific improvement suggestions, numbered]

Important: Reflect AI policy paste deductions and grading strictness in the recommended score.
If professor notes exist, factor them into the score.
Use a warm, encouraging tone. Always mention what the student did well.
The score is a recommendation — the professor makes the final decision.
IMPORTANT: Write the entire output in Korean."""
    else:
        paste_context = _build_paste_context(snapshots.data, sub.get("code", ""))

        prompt = f"""You are a friendly coding tutor. Analyze the student's code and provide feedback.

Assignment: {assignment.get('title', '')} / Topic: {assignment.get('topic', '')}
Rubric: {json.dumps(assignment.get('rubric', {}), ensure_ascii=False)}

=== AI Policy ===
{policy_desc}

=== Grading Criteria ===
{strictness_desc}
{f'Professor note: {grading_note}' if grading_note else ''}

=== Paste Analysis ===
{paste_context}

{f'Starter code (provided):\n```\n{starter_code}\n```\n' if starter_code else ''}
Student submitted code:
```
{sub['code']}
```

Coding snapshots: {len(snapshots.data)}

{f'Important: Do NOT evaluate the starter code. Only analyze parts the student wrote or modified.' if starter_code else ''}

Write in Markdown. Use ## for sections, ### for subsections, **bold** for keywords, - for lists.

## 🤖 피카버디의 추천 점수는 **[0~100점]점**이에요!

## 📝 종합 피드백
[2-3 sentence overall assessment]

## 🔍 로직 분석
[Pros and cons of the student's logic]

## ✨ 코드 품질
[Variable naming, structure, readability, etc.]

## 📋 복붙 분석
[Based on paste data above, specify which parts were pasted and how many lines. If none, say "외부 복붙 없이 직접 작성했습니다"]

## 💡 개선 제안
[2-3 specific improvement suggestions, numbered]

Important: Reflect AI policy paste deductions and grading strictness in the recommended score.
If professor notes exist, factor them into the score.
Use a warm, encouraging tone. Always mention what the student did well.
The score is a recommendation — the professor makes the final decision.
IMPORTANT: Write the entire output in Korean."""

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
