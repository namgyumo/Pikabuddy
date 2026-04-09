import asyncio
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from common.supabase_client import get_supabase
from common.gemini_client import get_gemini_model
from middleware.auth import get_current_user, require_student_or_personal

logger = logging.getLogger(__name__)

router = APIRouter(tags=["노트"])


class NoteCreateRequest(BaseModel):
    title: str
    content: dict  # Tiptap JSON
    parent_id: str | None = None  # 하위 노트일 경우 부모 노트 ID


class NoteUpdateRequest(BaseModel):
    title: str | None = None
    content: dict | None = None


class TagRequest(BaseModel):
    tag: str


class NotePolishRequest(BaseModel):
    content: dict  # Tiptap JSON (미저장 초안도 허용)


class AskRequest(BaseModel):
    question: str
    note_content: dict | None = None  # 노트 맥락 (선택)


@router.post("/courses/{course_id}/notes", status_code=201)
async def create_note(
    course_id: str, body: NoteCreateRequest, user: dict = Depends(require_student_or_personal)
):
    """노트 생성"""
    supabase = get_supabase()
    row = {
        "student_id": user["id"],
        "course_id": course_id,
        "title": body.title,
        "content": body.content,
    }
    if body.parent_id:
        row["parent_id"] = body.parent_id
    result = supabase.table("notes").insert(row).execute()
    return result.data[0]


@router.get("/courses/{course_id}/notes")
async def list_notes(course_id: str, user: dict = Depends(get_current_user)):
    """노트 목록 조회"""
    supabase = get_supabase()
    query = supabase.table("notes").select("*").eq("course_id", course_id)

    if user["role"] == "student":
        query = query.eq("student_id", user["id"])

    result = query.order("updated_at", desc=True).execute()
    return result.data


@router.patch("/notes/{note_id}")
async def update_note(
    note_id: str, body: NoteUpdateRequest, user: dict = Depends(require_student_or_personal)
):
    """노트 수정"""
    supabase = get_supabase()

    # Verify ownership
    note = supabase.table("notes").select("student_id").eq("id", note_id).single().execute()
    if not note.data or note.data["student_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    update_data = {}
    if body.title is not None:
        update_data["title"] = body.title
    if body.content is not None:
        update_data["content"] = body.content

    if not update_data:
        raise HTTPException(status_code=400, detail="변경할 내용이 없습니다.")

    result = supabase.table("notes").update(update_data).eq("id", note_id).execute()
    return result.data[0]


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: str, user: dict = Depends(require_student_or_personal)):
    """노트 삭제"""
    supabase = get_supabase()

    note = supabase.table("notes").select("student_id").eq("id", note_id).single().execute()
    if not note.data or note.data["student_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    supabase.table("notes").delete().eq("id", note_id).execute()


## ── 그래프 데이터 ──────────────────────────────────────

@router.get("/courses/{course_id}/notes/graph")
async def get_graph_data(course_id: str, user: dict = Depends(get_current_user)):
    """노트 그래프 데이터 — 노드 + 엣지 (부모-자식 + 노트 간 링크)"""
    supabase = get_supabase()
    query = supabase.table("notes").select("*").eq("course_id", course_id)
    if user["role"] == "student":
        query = query.eq("student_id", user["id"])
    notes_result = query.order("created_at").execute()
    notes = notes_result.data

    # 태그 조회
    note_ids = [n["id"] for n in notes]
    tags_map: dict[str, list[str]] = {}
    if note_ids:
        tags_result = (
            supabase.table("note_tags")
            .select("note_id, tag")
            .in_("note_id", note_ids)
            .execute()
        )
        for t in tags_result.data:
            tags_map.setdefault(t["note_id"], []).append(t["tag"])

    # 노드 생성
    nodes = []
    for n in notes:
        content_text = _tiptap_to_markdown(n.get("content") or {})
        nodes.append({
            "id": n["id"],
            "title": n["title"],
            "parent_id": n.get("parent_id"),
            "understanding_score": n.get("understanding_score"),
            "tags": tags_map.get(n["id"], []),
            "updated_at": n["updated_at"],
            "created_at": n["created_at"],
            "content_length": len(content_text),
        })

    # 엣지: 부모-자식 관계
    edges = []
    for n in notes:
        if n.get("parent_id"):
            edges.append({
                "source": n["parent_id"],
                "target": n["id"],
                "type": "parent",
            })

    # 엣지: 노트 내 [[링크]] 추출
    note_id_set = set(note_ids)
    for n in notes:
        links = _extract_note_links(n.get("content") or {})
        for link_target_id in links:
            if link_target_id in note_id_set and link_target_id != n["id"]:
                edges.append({
                    "source": n["id"],
                    "target": link_target_id,
                    "type": "link",
                })

    return {"nodes": nodes, "edges": edges}


## ── 태그 CRUD ────────────────────────────────────────

@router.get("/notes/{note_id}/tags")
async def get_tags(note_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    result = (
        supabase.table("note_tags")
        .select("*")
        .eq("note_id", note_id)
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/notes/{note_id}/tags", status_code=201)
async def add_tag(note_id: str, body: TagRequest, user: dict = Depends(require_student_or_personal)):
    supabase = get_supabase()
    # 소유 확인
    note = supabase.table("notes").select("student_id").eq("id", note_id).single().execute()
    if not note.data or note.data["student_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    # 중복 방지
    existing = (
        supabase.table("note_tags")
        .select("id")
        .eq("note_id", note_id)
        .eq("tag", body.tag.strip())
        .execute()
    )
    if existing.data:
        return existing.data[0]
    result = supabase.table("note_tags").insert({
        "note_id": note_id,
        "tag": body.tag.strip(),
    }).execute()
    return result.data[0]


@router.delete("/notes/{note_id}/tags/{tag_id}", status_code=204)
async def remove_tag(note_id: str, tag_id: str, user: dict = Depends(require_student_or_personal)):
    supabase = get_supabase()
    note = supabase.table("notes").select("student_id").eq("id", note_id).single().execute()
    if not note.data or note.data["student_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    supabase.table("note_tags").delete().eq("id", tag_id).execute()


## ── 백링크 ──────────────────────────────────────────

@router.get("/notes/{note_id}/backlinks")
async def get_backlinks(note_id: str, user: dict = Depends(get_current_user)):
    """이 노트를 참조하는 다른 노트 목록"""
    supabase = get_supabase()
    # 같은 과목의 모든 노트에서 이 노트 ID를 링크하는 것 검색
    note = supabase.table("notes").select("course_id, student_id").eq("id", note_id).single().execute()
    if not note.data:
        raise HTTPException(status_code=404)

    query = supabase.table("notes").select("id, title, content, updated_at").eq("course_id", note.data["course_id"])
    if user["role"] == "student":
        query = query.eq("student_id", user["id"])
    all_notes = query.execute()

    backlinks = []
    for n in all_notes.data:
        if n["id"] == note_id:
            continue
        links = _extract_note_links(n.get("content") or {})
        if note_id in links:
            backlinks.append({
                "id": n["id"],
                "title": n["title"],
                "updated_at": n["updated_at"],
            })
    return backlinks


## ── AI 관련 노트 추천 ────────────────────────────────

@router.get("/notes/{note_id}/recommendations")
async def get_recommendations(note_id: str, user: dict = Depends(get_current_user)):
    """AI 기반 관련 노트 추천 — 키워드 유사도 기반"""
    supabase = get_supabase()
    note = supabase.table("notes").select("*").eq("id", note_id).single().execute()
    if not note.data:
        raise HTTPException(status_code=404)

    # 같은 과목의 다른 노트들
    query = supabase.table("notes").select("id, title, content, understanding_score, updated_at").eq(
        "course_id", note.data["course_id"]
    )
    if user["role"] == "student":
        query = query.eq("student_id", user["id"])
    all_notes = query.execute()

    target_text = _tiptap_to_markdown(note.data.get("content") or {}).lower()
    target_words = set(target_text.split())

    scored = []
    for n in all_notes.data:
        if n["id"] == note_id:
            continue
        other_text = _tiptap_to_markdown(n.get("content") or {}).lower()
        other_words = set(other_text.split())
        if not target_words or not other_words:
            continue
        # Jaccard 유사도
        intersection = len(target_words & other_words)
        union = len(target_words | other_words)
        similarity = intersection / union if union > 0 else 0
        if similarity > 0.05:
            scored.append({
                "id": n["id"],
                "title": n["title"],
                "similarity": round(similarity, 3),
                "understanding_score": n.get("understanding_score"),
                "updated_at": n["updated_at"],
            })

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:5]


## ── 학습 경로 추천 ───────────────────────────────────

@router.get("/courses/{course_id}/study-path")
async def get_study_path(course_id: str, user: dict = Depends(require_student_or_personal)):
    """이해도 낮은 순서로 복습 경로 추천"""
    supabase = get_supabase()
    result = (
        supabase.table("notes")
        .select("id, title, understanding_score, updated_at, parent_id")
        .eq("course_id", course_id)
        .eq("student_id", user["id"])
        .order("updated_at")
        .execute()
    )
    notes = result.data

    # 분석된 노트 중 이해도 낮은 순 정렬
    analyzed = [n for n in notes if n.get("understanding_score") is not None]
    analyzed.sort(key=lambda x: x["understanding_score"])

    # 미분석 노트
    unanalyzed = [n for n in notes if n.get("understanding_score") is None]

    path = []
    for n in analyzed:
        path.append({
            "id": n["id"],
            "title": n["title"],
            "score": n["understanding_score"],
            "reason": "이해도 낮음 — 복습 필요" if n["understanding_score"] < 60
                      else "보통 — 보완 권장" if n["understanding_score"] < 80
                      else "잘 이해함",
            "priority": "high" if n["understanding_score"] < 60
                        else "medium" if n["understanding_score"] < 80
                        else "low",
        })
    for n in unanalyzed:
        path.append({
            "id": n["id"],
            "title": n["title"],
            "score": None,
            "reason": "아직 분석하지 않은 노트",
            "priority": "medium",
        })

    return path


## ── 주간 리포트 ──────────────────────────────────────

@router.get("/courses/{course_id}/weekly-report")
async def get_weekly_report(course_id: str, user: dict = Depends(require_student_or_personal)):
    """주간 학습 리포트 생성"""
    from datetime import datetime, timedelta

    supabase = get_supabase()
    now = datetime.utcnow()
    week_ago = (now - timedelta(days=7)).isoformat()

    all_notes = (
        supabase.table("notes")
        .select("id, title, understanding_score, created_at, updated_at, content")
        .eq("course_id", course_id)
        .eq("student_id", user["id"])
        .execute()
    ).data

    new_notes = [n for n in all_notes if n["created_at"] >= week_ago]
    scores = [n["understanding_score"] for n in all_notes if n.get("understanding_score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    weakest = sorted(
        [n for n in all_notes if n.get("understanding_score") is not None],
        key=lambda x: x["understanding_score"],
    )[:3]

    # Gemini로 요약 생성
    note_titles = [n["title"] for n in all_notes]
    new_titles = [n["title"] for n in new_notes]
    weak_info = ", ".join(f"{n['title']}({n['understanding_score']}%)" for n in weakest) or "없음"

    prompt = f"""학생의 주간 학습 리포트를 한국어로 짧게 작성하세요 (3-4문장).

전체 노트: {len(all_notes)}개 ({', '.join(note_titles[:10])})
이번 주 새 노트: {len(new_notes)}개 ({', '.join(new_titles[:5]) or '없음'})
평균 이해도: {avg_score or '미분석'}%
가장 약한 영역: {weak_info}

격려하는 톤으로, 구체적인 학습 조언 1개를 포함하세요."""

    try:
        def _call():
            return get_gemini_model().generate_content(prompt)

        loop = asyncio.get_running_loop()
        resp = await loop.run_in_executor(None, _call)
        summary = resp.text.strip()
    except Exception:
        summary = "이번 주 학습 리포트를 생성하지 못했습니다."

    return {
        "period": f"{(now - timedelta(days=7)).strftime('%m/%d')} ~ {now.strftime('%m/%d')}",
        "total_notes": len(all_notes),
        "new_notes": len(new_notes),
        "avg_score": avg_score,
        "weakest_notes": [
            {"id": n["id"], "title": n["title"], "score": n["understanding_score"]}
            for n in weakest
        ],
        "summary": summary,
    }


## ── 노트 링크 추출 헬퍼 ──────────────────────────────

def _extract_note_links(node: dict) -> list[str]:
    """Tiptap JSON에서 noteLink 노드의 target ID들을 추출"""
    ids = []
    if not node or not isinstance(node, dict):
        return ids
    if node.get("type") == "noteLink":
        attrs = node.get("attrs") or {}
        target_id = attrs.get("noteId")
        if target_id:
            ids.append(target_id)
    for child in (node.get("content") or []):
        ids.extend(_extract_note_links(child))
    return ids


@router.get("/notes/{note_id}/ai-comments")
async def get_ai_comments(note_id: str, user: dict = Depends(get_current_user)):
    """노트 AI 코멘트 조회"""
    supabase = get_supabase()
    result = (
        supabase.table("ai_comments")
        .select("*")
        .eq("note_id", note_id)
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/notes/ask")
async def ask_ai_helper(body: AskRequest, user: dict = Depends(require_student_or_personal)):
    """노트 작성 중 AI 도우미 — 특정 질문·개념에만 집중해서 답변"""
    note_context = ""
    if body.note_content:
        md = _tiptap_to_markdown(body.note_content)
        if md.strip():
            note_context = f"\n\n[학생 노트 맥락]\n{md[:2000]}"

    prompt = f"""당신은 학생의 학습을 돕는 친절한 AI 도우미입니다.
학생이 노트를 작성하는 도중 질문을 했습니다.

규칙:
1. 질문한 내용에만 집중해서 답변하세요. 노트 전체를 분석하거나 요약하지 마세요.
2. 핵심 개념을 2~4문장으로 간결하게 설명하세요.
3. 필요하면 짧은 예시를 1개만 제시하세요.
4. 반드시 한국어로 답변하고, **굵게** 또는 - 목록 같은 Markdown을 자유롭게 사용하세요.
5. "노트에서 보면" 같이 노트를 굳이 언급하지 말고 질문에 바로 답하세요.
{note_context}

학생 질문: {body.question}

답변:"""

    def _call_gemini():
        return get_gemini_model().generate_content(prompt)

    try:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, _call_gemini)
        answer = response.text.strip()
    except Exception:
        raise HTTPException(status_code=500, detail="AI 응답 중 오류가 발생했습니다.")

    return {"answer": answer}


def _tiptap_to_markdown(node: dict, _depth: int = 0) -> str:
    """Tiptap JSON → Markdown 텍스트 변환 (Gemini에게 보내기 위한 전처리)"""
    if not node or not isinstance(node, dict):
        return ""

    t = node.get("type", "")
    children = node.get("content") or []
    attrs = node.get("attrs") or {}
    marks = node.get("marks") or []

    # ── 텍스트 노드 ──────────────────────────────────────
    if t == "text":
        text = node.get("text", "")
        for m in marks:
            mt = m.get("type", "")
            if mt == "bold":      text = f"**{text}**"
            elif mt == "italic":  text = f"*{text}*"
            elif mt == "code":    text = f"`{text}`"
            elif mt == "strike":  text = f"~~{text}~~"
        return text

    inner = "".join(_tiptap_to_markdown(c, _depth) for c in children)

    # ── 블록 노드 ─────────────────────────────────────────
    if t == "doc":
        return inner.strip()
    if t == "paragraph":
        return (inner.strip() or "") + "\n\n"
    if t == "heading":
        level = attrs.get("level", 1)
        return "#" * level + " " + inner.strip() + "\n\n"
    if t == "bulletList":
        lines = []
        for child in children:
            ci = "".join(_tiptap_to_markdown(c, _depth + 1) for c in (child.get("content") or []))
            lines.append("  " * _depth + "- " + ci.strip())
        return "\n".join(lines) + "\n\n"
    if t == "orderedList":
        lines = []
        for i, child in enumerate(children, 1):
            ci = "".join(_tiptap_to_markdown(c, _depth + 1) for c in (child.get("content") or []))
            lines.append("  " * _depth + f"{i}. " + ci.strip())
        return "\n".join(lines) + "\n\n"
    if t == "listItem":
        return inner
    if t == "taskList":
        lines = []
        for child in children:
            checked = (child.get("attrs") or {}).get("checked", False)
            cb = "[x]" if checked else "[ ]"
            ci = "".join(_tiptap_to_markdown(c, _depth + 1) for c in (child.get("content") or []))
            lines.append(f"- {cb} " + ci.strip())
        return "\n".join(lines) + "\n\n"
    if t == "blockquote":
        return "\n".join("> " + l for l in inner.strip().splitlines()) + "\n\n"
    if t == "codeBlock":
        lang = attrs.get("language") or ""
        return f"```{lang}\n{inner}\n```\n\n"
    if t == "horizontalRule":
        return "---\n\n"
    if t == "hardBreak":
        return "\n"
    if t == "aiPolished":
        return inner  # AI 다듬기 구간은 내용 그대로
    # table, image 등 나머지
    return inner


@router.post("/notes/{note_id}/polish")
async def polish_note(
    note_id: str, body: NotePolishRequest, user: dict = Depends(require_student_or_personal)
):
    """노트 AI 다듬기 — 내용 보존, 구조·형식 정리 후 Markdown 반환"""
    supabase = get_supabase()

    note = supabase.table("notes").select("student_id").eq("id", note_id).single().execute()
    if not note.data or note.data["student_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    # Tiptap JSON → 읽기 쉬운 Markdown으로 변환 후 Gemini에게 전달
    content_markdown = _tiptap_to_markdown(body.content)
    if not content_markdown.strip():
        raise HTTPException(status_code=400, detail="노트 내용이 비어있습니다.")

    prompt = f"""아래는 학생이 작성한 노트 초안입니다. **내용은 한 글자도 바꾸지 말고**, 서식과 구조만 개선해 주세요.

수행할 작업 (모두 적용):
1. **구조화**: 큰 주제는 `#`, 하위 섹션은 `##`, 세부 항목은 `###`으로 계층을 나누세요.
2. **목록화**: 나열 가능한 내용은 `- 목록` 또는 `1. 번호 목록`으로 변환하세요.
3. **강조**: 핵심 개념은 **굵게**, 코드·명령어·기술 용어는 `코드 형식`으로 표시하세요.
4. 틀린 내용이 있어도 절대 수정하지 마세요. 내용 추가·삭제도 금지입니다.

출력 규칙:
- 설명이나 안내 없이 Markdown 결과만 출력하세요.
- 코드 블록(```) 으로 감싸지 마세요.

--- 원본 노트 ---
{content_markdown}
--- 끝 ---"""

    def _call_gemini():
        return get_gemini_model().generate_content(prompt)

    try:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, _call_gemini)
        polished = response.text.strip()

        # 혹시 코드 블록으로 감쌌을 경우 제거
        for prefix in ("```markdown\n", "```\n", "```markdown", "```"):
            if polished.startswith(prefix):
                polished = polished[len(prefix):]
                break
        if polished.endswith("```"):
            polished = polished[:-3]
        polished = polished.strip()
    except Exception as e:
        logger.error("[polish] error: %s", e)
        raise HTTPException(status_code=500, detail="AI 처리 중 오류가 발생했습니다.")

    return {"polished_markdown": polished}


def _extract_ai_polished(node: dict) -> tuple[dict, bool]:
    """aiPolished 노드를 제거하고 그 자리를 빈 상태로 처리.
    반환: (정리된_노드, AI구간_존재여부)"""
    if not node or not isinstance(node, dict):
        return node, False

    children = node.get("content") or []
    new_children = []
    had_ai = False

    for child in children:
        if child.get("type") == "aiPolished":
            had_ai = True          # AI 구간 발견 — 자식 포함하지 않음
        else:
            cleaned, found = _extract_ai_polished(child)
            new_children.append(cleaned)
            had_ai = had_ai or found

    return {**node, "content": new_children}, had_ai


@router.post("/notes/{note_id}/analyze")
async def analyze_note(note_id: str, user: dict = Depends(get_current_user)):
    """노트 갭 분석 요청"""
    import re

    supabase = get_supabase()

    note = supabase.table("notes").select("*, courses(objectives)").eq("id", note_id).single().execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    note_data = note.data

    # AI 다듬기 구간 제거 — 학생이 직접 작성한 내용만 평가
    raw_content = note_data["content"] or {}
    stripped_content, had_ai_section = _extract_ai_polished(raw_content)
    content_text = _tiptap_to_markdown(stripped_content)  # JSON 대신 읽기 쉬운 Markdown으로 변환
    objectives = note_data.get("courses", {}).get("objectives", [])

    submissions = (
        supabase.table("submissions")
        .select("*, ai_analyses(*)")
        .eq("student_id", note_data["student_id"])
        .execute()
    )

    ai_polished_notice = (
        "\n※ 이 노트에는 'AI 다듬기' 기능으로 처리된 구간이 있었으나 평가에서 제외했습니다. "
        "아래 내용은 학생이 직접 작성한 부분만입니다.\n"
        if had_ai_section else ""
    )

    prompt = f"""당신은 친절한 학습 튜터입니다.
학생의 노트를 분석하고 피드백을 자연스러운 한국어로 작성하세요.
코드블록(```)이나 JSON 없이 순수 텍스트로만 출력하세요.
{ai_polished_notice}
강의 목표: {json.dumps(objectives, ensure_ascii=False)}
학생 노트: {content_text}
코드 제출 수: {len(submissions.data)}건

아래 형식 그대로 작성하세요:

📊 이해도 점수: [0~100]점 / 100점

📝 종합 평가
(2~3문장)

✅ 잘 이해한 부분
(정확하게 이해한 개념)

⚠️ 보완이 필요한 부분
(잘못 이해했거나 빠진 개념)

💡 학습 추천
(구체적인 방법 2~3개를 번호로)

말투는 친근하고 격려하는 톤으로. 잘한 점도 반드시 언급하세요."""

    def _call_gemini():
        return get_gemini_model().generate_content(prompt)

    try:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, _call_gemini)
        feedback_text = response.text.strip()
        # Strip code blocks if Gemini wraps output
        if feedback_text.startswith("```"):
            feedback_text = feedback_text.split("\n", 1)[1] if "\n" in feedback_text else feedback_text[3:]
        if feedback_text.endswith("```"):
            feedback_text = feedback_text[:-3]
        feedback_text = feedback_text.strip()
    except Exception:
        feedback_text = "분석 실패"

    # Extract score from text
    score = None
    match = re.search(r"점수[:\s]*(\d+)", feedback_text)
    if match:
        score = int(match.group(1))

    # Save to DB
    supabase.table("notes").update({
        "gap_analysis": {"feedback": feedback_text},
        "understanding_score": score,
    }).eq("id", note_id).execute()

    return {
        "understanding_score": score,
        "feedback": feedback_text,
    }
