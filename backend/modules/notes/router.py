import asyncio
import json
import logging
import re as _re_module
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from common.supabase_client import get_supabase
from common.gemini_client import get_gemini_model, MODEL_LIGHT, get_embeddings, cosine_similarity, pairwise_similarities
from common.note_categories import (
    match_categories_by_text, get_categories_prompt_list,
    get_field_for_course,
    CATEGORY_SLUGS, SLUG_TO_NAME,
)
from middleware.auth import get_current_user, require_student_or_personal

logger = logging.getLogger(__name__)

router = APIRouter(tags=["노트"])


class NoteCreateRequest(BaseModel):
    title: str
    content: dict  # Tiptap JSON
    parent_id: str | None = None  # 하위 노트일 경우 부모 노트 ID
    team_id: str | None = None  # 팀 공유 노트일 경우 팀 ID


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
    """노트 생성. team_id가 있으면 공유 팀 노트."""
    supabase = get_supabase()
    row = {
        "student_id": user["id"],
        "course_id": course_id,
        "title": body.title,
        "content": body.content,
    }
    if body.parent_id:
        row["parent_id"] = body.parent_id

    # 팀 노트: team_id 검증
    if body.team_id:
        from modules.teams.router import get_user_team_ids
        user_teams = get_user_team_ids(supabase, user["id"], course_id)
        if body.team_id not in user_teams:
            raise HTTPException(status_code=403, detail="해당 팀의 멤버가 아닙니다.")
        row["team_id"] = body.team_id

    result = supabase.table("notes").insert(row).execute()
    return result.data[0]


@router.get("/courses/{course_id}/notes")
async def list_notes(course_id: str, user: dict = Depends(get_current_user)):
    """노트 목록 조회. 학생은 본인 노트 + 소속 팀 공유 노트도 조회."""
    supabase = get_supabase()
    query = supabase.table("notes").select("*").eq("course_id", course_id)

    if user["role"] == "student":
        from modules.teams.router import get_user_team_ids
        team_ids = get_user_team_ids(supabase, user["id"], course_id)
        if team_ids:
            team_filter = ",".join(team_ids)
            query = query.or_(f"student_id.eq.{user['id']},team_id.in.({team_filter})")
        else:
            query = query.eq("student_id", user["id"])

    result = query.order("updated_at", desc=True).execute()
    return result.data


@router.patch("/notes/{note_id}")
async def update_note(
    note_id: str, body: NoteUpdateRequest, user: dict = Depends(require_student_or_personal)
):
    """노트 수정. 팀 노트는 팀 멤버도 수정 가능. 팀 노트 저장 시 스냅샷 자동 생성."""
    supabase = get_supabase()

    # 소유자 또는 팀 멤버 검증
    note = supabase.table("notes").select("student_id, team_id, course_id").eq("id", note_id).single().execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    is_owner = note.data["student_id"] == user["id"]
    is_team_member = False
    if note.data.get("team_id"):
        from modules.teams.router import get_user_team_ids
        user_teams = get_user_team_ids(supabase, user["id"], note.data["course_id"])
        is_team_member = note.data["team_id"] in user_teams

    if not is_owner and not is_team_member:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    update_data = {}
    if body.title is not None:
        update_data["title"] = body.title
    if body.content is not None:
        update_data["content"] = body.content

    if not update_data:
        raise HTTPException(status_code=400, detail="변경할 내용이 없습니다.")

    result = supabase.table("notes").update(update_data).eq("id", note_id).execute()
    updated_note = result.data[0]

    # 팀 노트인 경우 스냅샷 자동 생성
    if note.data.get("team_id"):
        snapshot_row = {
            "note_id": note_id,
            "saved_by": user["id"],
            "title": updated_note.get("title", ""),
            "content": updated_note.get("content", {}),
        }
        try:
            supabase.table("note_snapshots").insert(snapshot_row).execute()
        except Exception as e:
            logger.warning(f"[Notes] 스냅샷 생성 실패: {e}")

    return updated_note


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: str, user: dict = Depends(require_student_or_personal)):
    """노트 삭제"""
    supabase = get_supabase()

    note = supabase.table("notes").select("student_id").eq("id", note_id).single().execute()
    if not note.data or note.data["student_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    supabase.table("notes").delete().eq("id", note_id).execute()


## ── 노트 스냅샷 (팀 공유 노트 히스토리) ─────────────────

def _can_access_note(supabase, note_data: dict, user: dict) -> bool:
    """노트에 접근 가능한지 확인 (소유자, 팀 멤버, 교수)."""
    if user["role"] == "professor":
        return True
    if note_data["student_id"] == user["id"]:
        return True
    if note_data.get("team_id"):
        from modules.teams.router import get_user_team_ids
        user_teams = get_user_team_ids(supabase, user["id"], note_data.get("course_id", ""))
        return note_data["team_id"] in user_teams
    return False


@router.get("/notes/{note_id}/snapshots")
async def list_note_snapshots(note_id: str, user: dict = Depends(get_current_user)):
    """노트 스냅샷 목록 (content 제외, 메타정보만)."""
    supabase = get_supabase()

    note = (
        supabase.table("notes")
        .select("student_id, team_id, course_id")
        .eq("id", note_id)
        .single()
        .execute()
    )
    if not note.data:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    if not _can_access_note(supabase, note.data, user):
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    result = (
        supabase.table("note_snapshots")
        .select("id, note_id, saved_by, title, created_at, users!saved_by(name, avatar_url)")
        .eq("note_id", note_id)
        .order("created_at", desc=True)
        .execute()
    )
    snapshots = []
    for s in (result.data or []):
        u = s.pop("users", {}) or {}
        s["saved_by_name"] = u.get("name", "")
        s["saved_by_avatar_url"] = u.get("avatar_url")
        snapshots.append(s)
    return snapshots


@router.get("/notes/{note_id}/snapshots/{snapshot_id}")
async def get_note_snapshot(note_id: str, snapshot_id: str, user: dict = Depends(get_current_user)):
    """노트 스냅샷 상세 (content 포함)."""
    supabase = get_supabase()

    note = (
        supabase.table("notes")
        .select("student_id, team_id, course_id")
        .eq("id", note_id)
        .single()
        .execute()
    )
    if not note.data:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")
    if not _can_access_note(supabase, note.data, user):
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    snapshot = (
        supabase.table("note_snapshots")
        .select("*, users!saved_by(name, avatar_url)")
        .eq("id", snapshot_id)
        .eq("note_id", note_id)
        .single()
        .execute()
    )
    if not snapshot.data:
        raise HTTPException(status_code=404, detail="스냅샷을 찾을 수 없습니다.")

    s = snapshot.data
    u = s.pop("users", {}) or {}
    s["saved_by_name"] = u.get("name", "")
    s["saved_by_avatar_url"] = u.get("avatar_url")
    return s


## ── 그래프 데이터 ──────────────────────────────────────

@router.get("/courses/{course_id}/notes/graph")
async def get_graph_data(course_id: str, user: dict = Depends(get_current_user)):
    """노트 그래프 데이터 — 노드 + 엣지 (부모-자식 + 링크 + 카테고리 유사도)"""
    supabase = get_supabase()
    query = supabase.table("notes").select("*").eq("course_id", course_id)
    if user["role"] == "student":
        from modules.teams.router import get_user_team_ids
        team_ids = get_user_team_ids(supabase, user["id"], course_id)
        if team_ids:
            team_filter = ",".join(team_ids)
            query = query.or_(f"student_id.eq.{user['id']},team_id.in.({team_filter})")
        else:
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

    # 카테고리 맵 — DB에 있으면 사용, 없으면 키워드 매칭
    cat_map: dict[str, list[str]] = {}
    for n in notes:
        db_cats = n.get("categories")
        if db_cats and isinstance(db_cats, list) and len(db_cats) > 0:
            cat_map[n["id"]] = db_cats
        else:
            content_text = _tiptap_to_markdown(n.get("content") or {})
            cat_map[n["id"]] = match_categories_by_text(content_text, max_categories=10)

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
            "categories": cat_map.get(n["id"], []),
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

    # 엣지: 수동 링크 (그래프 UI에서 생성)
    try:
        ml_result = supabase.table("note_manual_links").select("source_note_id, target_note_id").eq("course_id", course_id).execute()
        for ml in (ml_result.data or []):
            if ml["source_note_id"] in note_id_set and ml["target_note_id"] in note_id_set:
                edges.append({
                    "source": ml["source_note_id"],
                    "target": ml["target_note_id"],
                    "type": "link",
                })
    except Exception:
        pass  # 테이블이 아직 없을 수 있음

    # 엣지: 임베딩 유사도 기반 (기존 간선과 중복 허용)
    existing_edges = set()

    # 1) DB 캐시된 임베딩 사용, 없는 것만 API 호출
    embeddings: list[list[float]] = []
    uncached_indices: list[int] = []
    uncached_texts: list[str] = []

    for idx, n in enumerate(notes):
        db_emb = n.get("embedding")
        if db_emb and isinstance(db_emb, list) and len(db_emb) > 0:
            embeddings.append(db_emb)
        else:
            embeddings.append([])
            content_text = _tiptap_to_markdown(n.get("content") or {})
            uncached_indices.append(idx)
            uncached_texts.append(f"{n['title']}. {content_text[:500]}")

    # 2) 캐시 없는 노트만 API 호출 (이벤트 루프 블로킹 방지)
    if uncached_texts:
        try:
            loop = asyncio.get_event_loop()
            new_embs = await loop.run_in_executor(None, get_embeddings, uncached_texts)
            for i, idx in enumerate(uncached_indices):
                if new_embs[i]:
                    embeddings[idx] = new_embs[i]

            # DB 캐시 저장 — 백그라운드 (응답 안 막음)
            def _save_embeddings_sync():
                for i, idx in enumerate(uncached_indices):
                    if new_embs[i]:
                        try:
                            supabase.table("notes").update({
                                "embedding": json.dumps(new_embs[i])
                            }).eq("id", notes[idx]["id"]).execute()
                        except Exception:
                            pass
            asyncio.get_event_loop().run_in_executor(None, _save_embeddings_sync)
        except Exception:
            pass

    # 3) 유사도 계산 — 임베딩 + 카테고리 겹침으로 복합 가중치 산출
    has_embeddings = any(e for e in embeddings)
    if has_embeddings:
        all_sims = pairwise_similarities(embeddings, threshold=0.65)
        for i, j, sim in all_sims:
            pair = tuple(sorted([notes[i]["id"], notes[j]["id"]]))
            if pair in existing_edges:
                continue

            # 카테고리 겹침 비율 계산
            cats_i = set(cat_map.get(notes[i]["id"], []))
            cats_j = set(cat_map.get(notes[j]["id"], []))
            shared_cats = cats_i & cats_j
            total_cats = cats_i | cats_j
            cat_overlap = len(shared_cats) / len(total_cats) if total_cats else 0

            # 완전 무관: 카테고리 겹침 0% + 임베딩도 높지 않으면 → 연결 안함
            if cat_overlap == 0 and sim < 0.82:
                continue

            # 복합 가중치: 임베딩 유사도(60%) + 카테고리 겹침(40%)
            sim_norm = (sim - 0.65) / 0.35  # 0.65~1.0 → 0~1
            combined = sim_norm * 0.6 + cat_overlap * 0.4
            weight = max(1, min(10, round(combined * 10)))

            existing_edges.add(pair)
            edges.append({
                "source": notes[i]["id"],
                "target": notes[j]["id"],
                "type": "similar",
                "weight": weight,
            })
    else:
        # 임베딩 실패 시 카테고리 기반 폴백
        for i in range(len(notes)):
            cats_i = set(cat_map.get(notes[i]["id"], []))
            if not cats_i:
                continue
            for j in range(i + 1, len(notes)):
                cats_j = set(cat_map.get(notes[j]["id"], []))
                if not cats_j:
                    continue
                shared = cats_i & cats_j
                total = cats_i | cats_j
                overlap = len(shared) / len(total) if total else 0
                if overlap >= 0.2:
                    pair = tuple(sorted([notes[i]["id"], notes[j]["id"]]))
                    if pair not in existing_edges:
                        existing_edges.add(pair)
                        weight = max(1, min(10, round(overlap * 10)))
                        edges.append({
                            "source": notes[i]["id"],
                            "target": notes[j]["id"],
                            "type": "similar",
                            "weight": weight,
                        })

    return {"nodes": nodes, "edges": edges}


@router.get("/notes/unified-graph")
async def get_unified_graph(user: dict = Depends(get_current_user)):
    """통합 노트 그래프 — 모든 코스의 노트를 합치고, 크로스-코스 유사도 간선도 생성."""
    supabase = get_supabase()

    # 1) 유저가 속한 모든 코스 가져오기
    if user["role"] == "professor":
        courses_res = supabase.table("courses").select("id, title").eq("professor_id", user["id"]).execute()
    elif user["role"] == "personal":
        courses_res = supabase.table("courses").select("id, title").eq("professor_id", user["id"]).execute()
    else:
        enroll_res = supabase.table("enrollments").select("course_id").eq("student_id", user["id"]).execute()
        cids = [e["course_id"] for e in (enroll_res.data or [])]
        if not cids:
            return {"nodes": [], "edges": []}
        courses_res = supabase.table("courses").select("id, title").in_("id", cids).execute()

    course_list = courses_res.data or []
    if not course_list:
        return {"nodes": [], "edges": []}

    course_id_set = set(c["id"] for c in course_list)

    # 2) 모든 코스의 노트를 한번에 가져오기
    all_notes: list[dict] = []
    for c in course_list:
        query = supabase.table("notes").select("*").eq("course_id", c["id"])
        if user["role"] == "student":
            from modules.teams.router import get_user_team_ids
            team_ids = get_user_team_ids(supabase, user["id"], c["id"])
            if team_ids:
                team_filter = ",".join(team_ids)
                query = query.or_(f"student_id.eq.{user['id']},team_id.in.({team_filter})")
            else:
                query = query.eq("student_id", user["id"])
        result = query.order("created_at").execute()
        all_notes.extend(result.data or [])

    if not all_notes:
        return {"nodes": [], "edges": []}

    note_ids = [n["id"] for n in all_notes]
    note_id_set = set(note_ids)

    # 3) 태그 조회
    tags_map: dict[str, list[str]] = {}
    # supabase .in_ 은 최대 ~300개 제한이므로 배치 처리
    for batch_start in range(0, len(note_ids), 300):
        batch = note_ids[batch_start:batch_start + 300]
        tags_result = supabase.table("note_tags").select("note_id, tag").in_("note_id", batch).execute()
        for t in tags_result.data:
            tags_map.setdefault(t["note_id"], []).append(t["tag"])

    # 4) 카테고리 맵
    cat_map: dict[str, list[str]] = {}
    for n in all_notes:
        db_cats = n.get("categories")
        if db_cats and isinstance(db_cats, list) and len(db_cats) > 0:
            cat_map[n["id"]] = db_cats
        else:
            content_text = _tiptap_to_markdown(n.get("content") or {})
            cat_map[n["id"]] = match_categories_by_text(content_text, max_categories=10)

    # 5) 노드 생성
    nodes = []
    for n in all_notes:
        content_text = _tiptap_to_markdown(n.get("content") or {})
        nodes.append({
            "id": n["id"],
            "title": n["title"],
            "parent_id": n.get("parent_id"),
            "understanding_score": n.get("understanding_score"),
            "tags": tags_map.get(n["id"], []),
            "categories": cat_map.get(n["id"], []) + [n["course_id"]],
            "updated_at": n["updated_at"],
            "created_at": n["created_at"],
            "content_length": len(content_text),
        })

    # 6) 엣지: 부모-자식 (유사도 간선과 중복 허용 — link만 중복 방지)
    edges = []
    existing_edges: set[tuple[str, str]] = set()
    for n in all_notes:
        if n.get("parent_id") and n["parent_id"] in note_id_set:
            edges.append({"source": n["parent_id"], "target": n["id"], "type": "parent"})

    # 7) 엣지: [[링크]] + 수동 링크
    for n in all_notes:
        links = _extract_note_links(n.get("content") or {})
        for link_target_id in links:
            if link_target_id in note_id_set and link_target_id != n["id"]:
                pair = tuple(sorted([n["id"], link_target_id]))
                if pair not in existing_edges:
                    existing_edges.add(pair)
                    edges.append({"source": n["id"], "target": link_target_id, "type": "link"})

    for cid in course_id_set:
        try:
            ml_result = supabase.table("note_manual_links").select("source_note_id, target_note_id").eq("course_id", cid).execute()
            for ml in (ml_result.data or []):
                if ml["source_note_id"] in note_id_set and ml["target_note_id"] in note_id_set:
                    pair = tuple(sorted([ml["source_note_id"], ml["target_note_id"]]))
                    if pair not in existing_edges:
                        existing_edges.add(pair)
                        edges.append({"source": ml["source_note_id"], "target": ml["target_note_id"], "type": "link"})
        except Exception:
            pass

    # 8) 엣지: 임베딩 유사도 (크로스-코스 포함!) — 기존 간선과 중복 허용
    existing_edges.clear()
    embeddings: list[list[float]] = []
    uncached_indices: list[int] = []
    uncached_texts: list[str] = []

    for idx, n in enumerate(all_notes):
        db_emb = n.get("embedding")
        if db_emb and isinstance(db_emb, list) and len(db_emb) > 0:
            embeddings.append(db_emb)
        else:
            embeddings.append([])
            content_text = _tiptap_to_markdown(n.get("content") or {})
            uncached_indices.append(idx)
            uncached_texts.append(f"{n['title']}. {content_text[:500]}")

    if uncached_texts:
        try:
            loop = asyncio.get_event_loop()
            new_embs = await loop.run_in_executor(None, get_embeddings, uncached_texts)
            for i, idx in enumerate(uncached_indices):
                if new_embs[i]:
                    embeddings[idx] = new_embs[i]

            def _save_embeddings_sync():
                for i, idx in enumerate(uncached_indices):
                    if new_embs[i]:
                        try:
                            supabase.table("notes").update({
                                "embedding": json.dumps(new_embs[i])
                            }).eq("id", all_notes[idx]["id"]).execute()
                        except Exception:
                            pass
            asyncio.get_event_loop().run_in_executor(None, _save_embeddings_sync)
        except Exception:
            pass

    has_embeddings = any(e for e in embeddings)
    if has_embeddings:
        all_sims = pairwise_similarities(embeddings, threshold=0.65)
        for i, j, sim in all_sims:
            pair = tuple(sorted([all_notes[i]["id"], all_notes[j]["id"]]))
            if pair in existing_edges:
                continue
            cats_i = set(cat_map.get(all_notes[i]["id"], []))
            cats_j = set(cat_map.get(all_notes[j]["id"], []))
            shared_cats = cats_i & cats_j
            total_cats = cats_i | cats_j
            cat_overlap = len(shared_cats) / len(total_cats) if total_cats else 0

            # 완전 무관: 카테고리 겹침 0% + 임베딩도 높지 않으면 → 연결 안함
            if cat_overlap == 0 and sim < 0.82:
                continue

            sim_norm = (sim - 0.65) / 0.35
            combined = sim_norm * 0.6 + cat_overlap * 0.4
            weight = max(1, min(10, round(combined * 10)))

            existing_edges.add(pair)
            edges.append({
                "source": all_notes[i]["id"],
                "target": all_notes[j]["id"],
                "type": "similar",
                "weight": weight,
            })
    else:
        for i in range(len(all_notes)):
            cats_i = set(cat_map.get(all_notes[i]["id"], []))
            if not cats_i:
                continue
            for j in range(i + 1, len(all_notes)):
                cats_j = set(cat_map.get(all_notes[j]["id"], []))
                if not cats_j:
                    continue
                shared = cats_i & cats_j
                total = cats_i | cats_j
                overlap = len(shared) / len(total) if total else 0
                if overlap >= 0.2:
                    pair = tuple(sorted([all_notes[i]["id"], all_notes[j]["id"]]))
                    if pair not in existing_edges:
                        existing_edges.add(pair)
                        weight = max(1, min(10, round(overlap * 10)))
                        edges.append({
                            "source": all_notes[i]["id"],
                            "target": all_notes[j]["id"],
                            "type": "similar",
                            "weight": weight,
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

    prompt = f"""Write a short weekly study report (3-4 sentences) for a student.

Total notes: {len(all_notes)} ({', '.join(note_titles[:10])})
New notes this week: {len(new_notes)} ({', '.join(new_titles[:5]) or 'None'})
Average understanding: {avg_score or 'Not analyzed'}%
Weakest areas: {weak_info}

Use an encouraging tone and include 1 specific study tip.
IMPORTANT: Write the entire output in Korean."""

    try:
        def _call():
            return get_gemini_model(MODEL_LIGHT).generate_content(prompt)

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


## ── 통합 학습 경로 ──────────────────────────────────────

@router.get("/notes/unified-study-path")
async def get_unified_study_path(user: dict = Depends(require_student_or_personal)):
    """모든 코스의 노트를 종합해 학습 경로 추천 — 어떤 강의의 어떤 노트/개념을 공부하면 좋을지."""
    supabase = get_supabase()

    # 유저의 코스 가져오기
    if user["role"] == "personal":
        courses_res = supabase.table("courses").select("id, title").eq("professor_id", user["id"]).execute()
    else:
        enroll_res = supabase.table("enrollments").select("course_id").eq("student_id", user["id"]).execute()
        cids = [e["course_id"] for e in (enroll_res.data or [])]
        if not cids:
            return []
        courses_res = supabase.table("courses").select("id, title").in_("id", cids).execute()

    course_map = {c["id"]: c["title"] for c in (courses_res.data or [])}
    if not course_map:
        return []

    # 모든 노트 가져오기
    all_notes: list[dict] = []
    for cid in course_map:
        result = (
            supabase.table("notes")
            .select("id, title, understanding_score, updated_at, parent_id, course_id, categories")
            .eq("course_id", cid)
            .eq("student_id", user["id"])
            .order("updated_at")
            .execute()
        )
        all_notes.extend(result.data or [])

    if not all_notes:
        return []

    # 이해도 낮은 순 정렬 (코스 정보 포함)
    analyzed = [n for n in all_notes if n.get("understanding_score") is not None]
    analyzed.sort(key=lambda x: x["understanding_score"])

    unanalyzed = [n for n in all_notes if n.get("understanding_score") is None]

    # 크로스-코스 개념 분석: 어떤 카테고리가 전체적으로 약한지
    cat_scores: dict[str, list[int]] = {}
    for n in analyzed:
        cats = n.get("categories") or []
        for cat in cats:
            if cat not in course_map:  # course_id가 아닌 진짜 카테고리만
                cat_scores.setdefault(cat, []).append(n["understanding_score"])

    weak_concepts = []
    for cat, scores in cat_scores.items():
        avg = sum(scores) / len(scores)
        if avg < 70:
            weak_concepts.append({"concept": cat, "avg_score": round(avg, 1), "note_count": len(scores)})
    weak_concepts.sort(key=lambda x: x["avg_score"])

    path = []
    for n in analyzed:
        score = n["understanding_score"]
        course_name = course_map.get(n["course_id"], "")
        if score < 60:
            reason = f"[{course_name}] 이해도 낮음 — 우선 복습 필요"
            priority = "high"
        elif score < 80:
            reason = f"[{course_name}] 보통 — 보완 권장"
            priority = "medium"
        else:
            reason = f"[{course_name}] 잘 이해함"
            priority = "low"

        path.append({
            "id": n["id"],
            "title": n["title"],
            "score": score,
            "course_id": n["course_id"],
            "course_name": course_name,
            "reason": reason,
            "priority": priority,
        })

    for n in unanalyzed:
        course_name = course_map.get(n["course_id"], "")
        path.append({
            "id": n["id"],
            "title": n["title"],
            "score": None,
            "course_id": n["course_id"],
            "course_name": course_name,
            "reason": f"[{course_name}] 아직 분석하지 않은 노트",
            "priority": "medium",
        })

    return {
        "path": path,
        "weak_concepts": weak_concepts[:10],
    }


## ── 통합 주간 리포트 ──────────────────────────────────────

@router.get("/notes/unified-weekly-report")
async def get_unified_weekly_report(user: dict = Depends(require_student_or_personal)):
    """모든 코스를 종합한 주간 학습 리포트."""
    from datetime import datetime, timedelta

    supabase = get_supabase()

    # 유저의 코스 가져오기
    if user["role"] == "personal":
        courses_res = supabase.table("courses").select("id, title").eq("professor_id", user["id"]).execute()
    else:
        enroll_res = supabase.table("enrollments").select("course_id").eq("student_id", user["id"]).execute()
        cids = [e["course_id"] for e in (enroll_res.data or [])]
        if not cids:
            return {"period": "", "total_notes": 0, "new_notes": 0, "avg_score": None, "courses": [], "weakest_notes": [], "summary": "등록된 강의가 없습니다."}
        courses_res = supabase.table("courses").select("id, title").in_("id", cids).execute()

    course_map = {c["id"]: c["title"] for c in (courses_res.data or [])}
    now = datetime.utcnow()
    week_ago = (now - timedelta(days=7)).isoformat()

    # 전체 노트 수집
    all_notes: list[dict] = []
    for cid in course_map:
        result = (
            supabase.table("notes")
            .select("id, title, understanding_score, created_at, updated_at, course_id, content")
            .eq("course_id", cid)
            .eq("student_id", user["id"])
            .execute()
        )
        all_notes.extend(result.data or [])

    new_notes = [n for n in all_notes if n["created_at"] >= week_ago]
    scores = [n["understanding_score"] for n in all_notes if n.get("understanding_score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    weakest = sorted(
        [n for n in all_notes if n.get("understanding_score") is not None],
        key=lambda x: x["understanding_score"],
    )[:5]

    # 코스별 요약
    course_stats = []
    for cid, cname in course_map.items():
        cnotes = [n for n in all_notes if n["course_id"] == cid]
        cscores = [n["understanding_score"] for n in cnotes if n.get("understanding_score") is not None]
        cnew = [n for n in cnotes if n["created_at"] >= week_ago]
        course_stats.append({
            "course_id": cid,
            "course_name": cname,
            "total": len(cnotes),
            "new": len(cnew),
            "avg_score": round(sum(cscores) / len(cscores), 1) if cscores else None,
        })

    # Gemini 요약
    note_titles = [n["title"] for n in all_notes[:15]]
    new_titles = [n["title"] for n in new_notes[:8]]
    weak_info = ", ".join(f"{n['title']}({n['understanding_score']}%, {course_map.get(n['course_id'], '')})" for n in weakest) or "없음"
    course_info = "; ".join(f"{cs['course_name']}: {cs['total']}개(평균 {cs['avg_score'] or '?'}%)" for cs in course_stats)

    prompt = f"""Write a comprehensive weekly study report (4-5 sentences) for a student studying multiple courses.

Courses overview: {course_info}
Total notes across all courses: {len(all_notes)}
New notes this week: {len(new_notes)} ({', '.join(new_titles) or 'None'})
Overall average understanding: {avg_score or 'Not analyzed'}%
Weakest areas (with course): {weak_info}

Include:
1. Overall progress assessment across all courses
2. Which course needs the most attention and why
3. Cross-course connections or concepts that overlap
4. 1-2 specific actionable study tips

Use an encouraging but honest tone.
IMPORTANT: Write the entire output in Korean."""

    try:
        def _call():
            return get_gemini_model(MODEL_LIGHT).generate_content(prompt)
        loop = asyncio.get_running_loop()
        resp = await loop.run_in_executor(None, _call)
        summary = resp.text.strip()
    except Exception:
        summary = "이번 주 통합 학습 리포트를 생성하지 못했습니다."

    return {
        "period": f"{(now - timedelta(days=7)).strftime('%m/%d')} ~ {now.strftime('%m/%d')}",
        "total_notes": len(all_notes),
        "new_notes": len(new_notes),
        "avg_score": avg_score,
        "courses": course_stats,
        "weakest_notes": [
            {"id": n["id"], "title": n["title"], "score": n["understanding_score"],
             "course_id": n["course_id"], "course_name": course_map.get(n["course_id"], "")}
            for n in weakest
        ],
        "summary": summary,
    }


## ── 수동 링크 (그래프 UI에서 생성) ─────────────────────

@router.post("/courses/{course_id}/notes/manual-link")
async def create_manual_link(
    course_id: str,
    body: dict,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    source_id = body.get("source_note_id")
    target_id = body.get("target_note_id")
    if not source_id or not target_id or source_id == target_id:
        raise HTTPException(status_code=400, detail="source와 target이 필요합니다")
    # 정렬하여 중복 방지 (A→B == B→A)
    ids = sorted([source_id, target_id])
    try:
        supabase.table("note_manual_links").insert({
            "course_id": course_id,
            "source_note_id": ids[0],
            "target_note_id": ids[1],
            "created_by": user["id"],
        }).execute()
    except Exception:
        # UNIQUE 위반 → 이미 존재
        pass
    return {"ok": True}


@router.delete("/courses/{course_id}/notes/manual-link")
async def delete_manual_link(
    course_id: str,
    body: dict,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    source_id = body.get("source_note_id")
    target_id = body.get("target_note_id")
    if not source_id or not target_id:
        raise HTTPException(status_code=400, detail="source와 target이 필요합니다")
    ids = sorted([source_id, target_id])
    supabase.table("note_manual_links").delete().match({
        "source_note_id": ids[0],
        "target_note_id": ids[1],
    }).execute()
    return {"ok": True}


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

    prompt = f"""You are a friendly AI study helper. A student asked a question while writing notes.

Rules:
1. Answer ONLY the asked question. Do not analyze or summarize the entire note.
2. Explain the core concept concisely in 2-4 sentences.
3. Provide at most 1 short example if needed.
4. Use Markdown freely (**bold**, - lists, etc.).
5. Answer the question directly without referencing the note context.
{note_context}

Student question: {body.question}

IMPORTANT: Write the entire output in Korean.
Answer:"""

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

    prompt = f"""Below is a student's draft note. Improve ONLY the formatting and structure — do NOT change any content.

Tasks (apply all):
1. **Structure**: Use `#` for main topics, `##` for sub-sections, `###` for details.
2. **Lists**: Convert enumerable content to `- bullet` or `1. numbered` lists.
3. **Emphasis**: Bold key concepts with **bold**, use `code` for code/commands/technical terms.
4. Do NOT fix errors, add, or remove any content.

Output rules:
- Output ONLY the Markdown result. No explanations or preamble.
- Do NOT wrap in code blocks (```).
- Keep the output language exactly as the original note (Korean).

--- Original note ---
{content_markdown}
--- End ---"""

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

    note = supabase.table("notes").select("*, courses(title, objectives)").eq("id", note_id).single().execute()
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

    # ── 카테고리 목록 (강의 분야별 필터링) ──
    course_name = note_data.get("courses", {}).get("title", "")
    cat_fields = get_field_for_course(course_name)
    cat_list = get_categories_prompt_list(fields=cat_fields)

    prompt = f"""You are a friendly study tutor. Analyze the student's note and provide feedback.
{ai_polished_notice}
Course objectives: {json.dumps(objectives, ensure_ascii=False)}
Student note: {content_text}
Code submissions: {len(submissions.data)}

Use EXACTLY this format:

📊 이해도 점수: [0~100]점 / 100점

📝 종합 평가
(2-3 sentences)

✅ 잘 이해한 부분
(correctly understood concepts)

⚠️ 보완이 필요한 부분
(misunderstood or missing concepts)

💡 학습 추천
(2-3 specific suggestions, numbered)

🏷️ 카테고리
Pick 5-10 matching category slugs from the list below, comma-separated.
Choose both broad and specific categories for better graph connectivity.
If a topic is missing, add up to 2 as "NEW:slug:Korean_name".
Category list: {cat_list}

Use a warm, encouraging tone. Always mention what the student did well.
IMPORTANT: Write the entire output in Korean."""

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

    # ── 카테고리 추출 ──
    categories: list[str] = []
    cat_match = re.search(r"카테고리[:\s]*\n?(.+)", feedback_text)
    if cat_match:
        raw_cats = cat_match.group(1).strip()
        for token in re.split(r"[,\s]+", raw_cats):
            token = token.strip().strip("`")
            if not token:
                continue
            if token.startswith("NEW:"):
                # AI가 새 카테고리 추가: NEW:slug:한글명
                parts = token.split(":", 2)
                if len(parts) == 3:
                    new_slug = parts[1].strip().lower().replace(" ", "-")
                    new_name = parts[2].strip()
                    if new_slug and new_name and new_slug not in CATEGORY_SLUGS:
                        try:
                            supabase.table("custom_categories").upsert({
                                "slug": new_slug,
                                "name": new_name,
                                "keywords": json.dumps([new_name.lower(), new_slug]),
                            }, on_conflict="slug").execute()
                            CATEGORY_SLUGS.add(new_slug)
                            SLUG_TO_NAME[new_slug] = new_name
                        except Exception:
                            pass
                    if new_slug:
                        categories.append(new_slug)
            elif token in CATEGORY_SLUGS:
                categories.append(token)

    # 카테고리가 너무 적으면 키워드 매칭으로 보충
    if len(categories) < 5:
        kw_cats = match_categories_by_text(content_text, max_categories=8)
        for c in kw_cats:
            if c not in categories:
                categories.append(c)
            if len(categories) >= 8:
                break

    # 임베딩 생성 (비동기 저장)
    embedding_data = None
    try:
        emb_text = f"{note_data['title']}. {content_text[:500]}"
        embs = get_embeddings([emb_text])
        if embs and embs[0]:
            embedding_data = embs[0]
    except Exception:
        pass

    # Save to DB
    update_data = {
        "gap_analysis": {"feedback": feedback_text},
        "understanding_score": score,
        "categories": json.dumps(categories),
    }
    if embedding_data is not None:
        update_data["embedding"] = json.dumps(embedding_data)
    supabase.table("notes").update(update_data).eq("id", note_id).execute()

    return {
        "understanding_score": score,
        "feedback": feedback_text,
        "categories": categories,
    }


@router.get("/notes/{note_id}/analyze-stream")
async def analyze_note_stream(note_id: str, user: dict = Depends(get_current_user)):
    """노트 갭 분석 SSE 스트리밍 — 실시간으로 피드백 전달"""
    import re

    supabase = get_supabase()

    note = supabase.table("notes").select("*, courses(title, objectives)").eq("id", note_id).single().execute()
    if not note.data:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    note_data = note.data
    raw_content = note_data["content"] or {}
    stripped_content, had_ai_section = _extract_ai_polished(raw_content)
    content_text = _tiptap_to_markdown(stripped_content)
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

    # ── 카테고리 목록 (강의 분야별 필터링) ──
    course_name = note_data.get("courses", {}).get("title", "")
    cat_fields = get_field_for_course(course_name)
    cat_list = get_categories_prompt_list(fields=cat_fields)

    prompt = f"""You are a friendly study tutor. Analyze the student's note and provide feedback.
{ai_polished_notice}
Course objectives: {json.dumps(objectives, ensure_ascii=False)}
Student note: {content_text}
Code submissions: {len(submissions.data)}

Use EXACTLY this format:

📊 이해도 점수: [0~100]점 / 100점

📝 종합 평가
(2-3 sentences)

✅ 잘 이해한 부분
(correctly understood concepts)

⚠️ 보완이 필요한 부분
(misunderstood or missing concepts)

💡 학습 추천
(2-3 specific suggestions, numbered)

🏷️ 카테고리
Pick 5-10 matching category slugs from the list below, comma-separated.
Choose both broad and specific categories for better graph connectivity.
If a topic is missing, add up to 2 as "NEW:slug:Korean_name".
Category list: {cat_list}

Use a warm, encouraging tone. Always mention what the student did well.
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
                feedback_text = accumulated.strip()
                if feedback_text.startswith("```"):
                    feedback_text = feedback_text.split("\n", 1)[1] if "\n" in feedback_text else feedback_text[3:]
                if feedback_text.endswith("```"):
                    feedback_text = feedback_text[:-3]
                feedback_text = feedback_text.strip()

                # Extract score
                score = None
                match = re.search(r"점수[:\s]*(\d+)", feedback_text)
                if match:
                    score = int(match.group(1))

                # Extract categories
                categories: list[str] = []
                cat_match = re.search(r"카테고리[:\s]*\n?(.+)", feedback_text)
                if cat_match:
                    raw_cats = cat_match.group(1).strip()
                    for token in re.split(r"[,\s]+", raw_cats):
                        token = token.strip().strip("`")
                        if not token:
                            continue
                        if token.startswith("NEW:"):
                            parts = token.split(":", 2)
                            if len(parts) == 3:
                                new_slug = parts[1].strip().lower().replace(" ", "-")
                                new_name = parts[2].strip()
                                if new_slug and new_name and new_slug not in CATEGORY_SLUGS:
                                    try:
                                        supabase.table("custom_categories").upsert({
                                            "slug": new_slug,
                                            "name": new_name,
                                            "keywords": json.dumps([new_name.lower(), new_slug]),
                                        }, on_conflict="slug").execute()
                                        CATEGORY_SLUGS.add(new_slug)
                                        SLUG_TO_NAME[new_slug] = new_name
                                    except Exception:
                                        pass
                                if new_slug:
                                    categories.append(new_slug)
                        elif token in CATEGORY_SLUGS:
                            categories.append(token)

                if len(categories) < 5:
                    kw_cats = match_categories_by_text(content_text, max_categories=8)
                    for c in kw_cats:
                        if c not in categories:
                            categories.append(c)
                        if len(categories) >= 8:
                            break

                # 임베딩 생성
                embedding_data = None
                try:
                    emb_text = f"{note_data['title']}. {content_text[:500]}"
                    embs = get_embeddings([emb_text])
                    if embs and embs[0]:
                        embedding_data = embs[0]
                except Exception:
                    pass

                try:
                    update_data = {
                        "gap_analysis": {"feedback": feedback_text},
                        "understanding_score": score,
                        "categories": json.dumps(categories),
                    }
                    if embedding_data is not None:
                        update_data["embedding"] = json.dumps(embedding_data)
                    supabase.table("notes").update(update_data).eq("id", note_id).execute()
                except Exception as db_err:
                    logger.error(f"[NoteAnalysis] DB 저장 실패 note_id={note_id}: {db_err}")

                yield {"event": "message", "data": json.dumps({
                    "type": "done",
                    "score": score,
                    "categories": categories,
                }, ensure_ascii=False)}
                break

            elif event_type == "error":
                logger.error(f"[NoteAnalysis] Gemini 스트리밍 오류 note_id={note_id}: {data}")
                yield {"event": "message", "data": json.dumps({"type": "error", "text": data}, ensure_ascii=False)}
                break

    return EventSourceResponse(generate())
