"""시험 감독 시스템 — R2 스크린샷 + 이탈 감지"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from common.supabase_client import get_supabase
from common.r2_client import get_r2_client, generate_download_url
from config import get_settings
from middleware.auth import get_current_user, require_professor

router = APIRouter(tags=["시험 감독"])


# ── Request/Response 모델 ──

class ScreenshotURLRequest(BaseModel):
    assignment_id: str

class ViolationRequest(BaseModel):
    assignment_id: str
    violation_type: str  # fullscreen_exit, tab_switch, window_blur
    violation_count: int = 1
    detail: str = ""

class ExamConfigRequest(BaseModel):
    exam_mode: bool = True
    screenshot_interval: int = 30      # 초
    max_violations: int = 3
    screenshot_quality: float = 0.3    # JPEG 0.1~1.0
    fullscreen_required: bool = True

class ExamResetRequest(BaseModel):
    assignment_id: str
    student_id: str
    reason: str = ""


# ── 학생용: 스크린샷 업로드 (백엔드 프록시 → R2) ──

@router.post("/exam/screenshot", status_code=201)
async def upload_screenshot(
    assignment_id: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """스크린샷을 백엔드에서 R2로 업로드 + DB 메타데이터 저장"""
    student_id = user["id"]
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_id = uuid.uuid4().hex[:8]
    r2_key = f"exam/{assignment_id}/{student_id}/{timestamp}_{file_id}.jpg"

    file_bytes = await file.read()
    file_size_kb = len(file_bytes) // 1024

    # R2에 업로드
    settings = get_settings()
    client = get_r2_client()
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=r2_key,
        Body=file_bytes,
        ContentType="image/jpeg",
    )

    # DB에 메타데이터 저장
    supabase = get_supabase()
    supabase.table("exam_screenshots").insert({
        "assignment_id": assignment_id,
        "student_id": student_id,
        "r2_key": r2_key,
        "r2_url": "",
        "file_size_kb": file_size_kb,
        "captured_at": datetime.utcnow().isoformat(),
    }).execute()

    return {"message": "스크린샷 저장 완료", "r2_key": r2_key}


# ── 학생용: 시험 시작/종료 상태 ──

@router.post("/exam/start", status_code=201)
async def start_exam(body: ScreenshotURLRequest, user: dict = Depends(get_current_user)):
    """시험 시작 기록"""
    supabase = get_supabase()
    # 이미 forced_end가 있는지 확인 → 재입장 차단
    existing = supabase.table("exam_violations").select("id").eq(
        "assignment_id", body.assignment_id
    ).eq("student_id", user["id"]).eq("violation_type", "forced_end").execute()
    if existing.data:
        raise HTTPException(403, "시험이 이미 종료되었습니다. 재입장할 수 없습니다.")
    return {"message": "시험 시작"}


@router.get("/exam/status/{assignment_id}")
async def get_exam_status(assignment_id: str, user: dict = Depends(get_current_user)):
    """학생의 시험 상태 확인 (종료 여부)"""
    supabase = get_supabase()
    ended = supabase.table("exam_violations").select("id").eq(
        "assignment_id", assignment_id
    ).eq("student_id", user["id"]).eq("violation_type", "forced_end").execute()
    return {"ended": bool(ended.data)}


# ── 학생용: 이탈 위반 기록 ──

@router.post("/exam/violation", status_code=201)
async def log_violation(body: ViolationRequest, user: dict = Depends(get_current_user)):
    """이탈 위반 로그 기록"""
    valid_types = ("fullscreen_exit", "tab_switch", "window_blur", "forced_end")
    if body.violation_type not in valid_types:
        raise HTTPException(400, f"유효하지 않은 위반 유형: {body.violation_type}")

    supabase = get_supabase()
    supabase.table("exam_violations").insert({
        "assignment_id": body.assignment_id,
        "student_id": user["id"],
        "violation_type": body.violation_type,
        "violation_count": body.violation_count,
        "detail": body.detail,
    }).execute()
    return {"message": "위반 기록 완료"}


# ── 학생용: 시험 설정 조회 ──

@router.get("/exam/config/{assignment_id}")
async def get_exam_config(assignment_id: str, user: dict = Depends(get_current_user)):
    """과제의 시험 모드 설정 조회"""
    supabase = get_supabase()
    result = supabase.table("assignments").select(
        "exam_mode, exam_config"
    ).eq("id", assignment_id).single().execute()
    data = result.data
    if not data:
        raise HTTPException(404, "과제를 찾을 수 없습니다.")
    config = data.get("exam_config") or {}
    return {
        "exam_mode": data.get("exam_mode", False),
        "screenshot_interval": config.get("screenshot_interval", 30),
        "max_violations": config.get("max_violations", 3),
        "screenshot_quality": config.get("screenshot_quality", 0.3),
        "fullscreen_required": config.get("fullscreen_required", True),
    }


# ── 교수용: 시험 모드 설정 ──

@router.patch("/exam/config/{assignment_id}")
async def update_exam_config(
    assignment_id: str, body: ExamConfigRequest, user: dict = Depends(require_professor)
):
    """과제의 시험 모드 설정 변경 (교수 전용)"""
    supabase = get_supabase()
    supabase.table("assignments").update({
        "exam_mode": body.exam_mode,
        "exam_config": {
            "screenshot_interval": body.screenshot_interval,
            "max_violations": body.max_violations,
            "screenshot_quality": body.screenshot_quality,
            "fullscreen_required": body.fullscreen_required,
        },
    }).eq("id", assignment_id).execute()
    return {"message": "시험 설정 업데이트 완료"}


# ── 교수용: 학생 스크린샷 목록 조회 ──

@router.get("/exam/screenshots/{assignment_id}")
async def get_screenshots(
    assignment_id: str,
    student_id: str = Query(None, description="특정 학생만 조회"),
    user: dict = Depends(require_professor),
):
    """과제의 스크린샷 목록 조회 (교수 전용). student_id로 특정 학생 필터링 가능."""
    supabase = get_supabase()
    query = supabase.table("exam_screenshots").select(
        "*, users!exam_screenshots_student_id_fkey(name, email)"
    ).eq("assignment_id", assignment_id).order("captured_at")

    if student_id:
        query = query.eq("student_id", student_id)

    result = query.execute()
    screenshots = result.data or []

    # 각 스크린샷에 presigned download URL 추가
    for s in screenshots:
        try:
            s["view_url"] = generate_download_url(s["r2_key"], expires=3600)
        except Exception:
            s["view_url"] = ""

    return screenshots


# ── 교수용: 학생 위반 기록 조회 ──

@router.get("/exam/violations/{assignment_id}")
async def get_violations(
    assignment_id: str,
    student_id: str = Query(None),
    user: dict = Depends(require_professor),
):
    """과제의 위반 기록 조회 (교수 전용)"""
    supabase = get_supabase()
    query = supabase.table("exam_violations").select(
        "*, users!exam_violations_student_id_fkey(name, email)"
    ).eq("assignment_id", assignment_id).order("created_at")

    if student_id:
        query = query.eq("student_id", student_id)

    result = query.execute()
    return result.data or []


# ── 교수용: 학생별 요약 ──

@router.get("/exam/summary/{assignment_id}")
async def get_exam_summary(assignment_id: str, user: dict = Depends(require_professor)):
    """학생별 스크린샷 수, 위반 수 요약 (교수 전용)"""
    supabase = get_supabase()

    # 스크린샷 수
    screenshots = supabase.table("exam_screenshots").select(
        "student_id"
    ).eq("assignment_id", assignment_id).execute().data or []

    # 위반 수
    violations = supabase.table("exam_violations").select(
        "student_id, violation_type"
    ).eq("assignment_id", assignment_id).execute().data or []

    # 수강생 목록
    assignment = supabase.table("assignments").select("course_id").eq(
        "id", assignment_id
    ).single().execute().data
    if not assignment:
        raise HTTPException(404, "과제를 찾을 수 없습니다.")

    enrollments = supabase.table("enrollments").select(
        "student_id, users!enrollments_student_id_fkey(name, email)"
    ).eq("course_id", assignment["course_id"]).execute().data or []

    # 집계
    ss_count = {}
    for s in screenshots:
        ss_count[s["student_id"]] = ss_count.get(s["student_id"], 0) + 1

    viol_count = {}
    for v in violations:
        viol_count[v["student_id"]] = viol_count.get(v["student_id"], 0) + 1

    summary = []
    for e in enrollments:
        sid = e["student_id"]
        student_info = e.get("users", {})
        summary.append({
            "student_id": sid,
            "name": student_info.get("name", ""),
            "email": student_info.get("email", ""),
            "screenshot_count": ss_count.get(sid, 0),
            "violation_count": viol_count.get(sid, 0),
        })

    return sorted(summary, key=lambda x: -x["violation_count"])


# ── 교수용: 학생별 시험 응시 상태 조회 ──

@router.get("/exam/students/{assignment_id}")
async def get_exam_students(assignment_id: str, user: dict = Depends(require_professor)):
    """학생별 시험 응시 상태 (응시완료/미응시) 조회 (교수 전용)"""
    supabase = get_supabase()

    assignment = supabase.table("assignments").select("course_id").eq(
        "id", assignment_id
    ).single().execute().data
    if not assignment:
        raise HTTPException(404, "과제를 찾을 수 없습니다.")

    # 수강생 목록
    enrollments = supabase.table("enrollments").select(
        "student_id, users!enrollments_student_id_fkey(name, email)"
    ).eq("course_id", assignment["course_id"]).execute().data or []

    # forced_end 위반 = 시험 종료(응시 완료)
    ended = supabase.table("exam_violations").select(
        "student_id"
    ).eq("assignment_id", assignment_id).eq("violation_type", "forced_end").execute().data or []
    ended_ids = {v["student_id"] for v in ended}

    # 리셋 로그
    reset_logs = supabase.table("exam_reset_logs").select(
        "student_id, reset_at, reason, professor_id"
    ).eq("assignment_id", assignment_id).order("reset_at", desc=True).execute().data or []
    # 학생별 최근 리셋
    latest_reset = {}
    for r in reset_logs:
        if r["student_id"] not in latest_reset:
            latest_reset[r["student_id"]] = r

    students = []
    for e in enrollments:
        sid = e["student_id"]
        info = e.get("users", {})
        students.append({
            "student_id": sid,
            "name": info.get("name", ""),
            "email": info.get("email", ""),
            "exam_ended": sid in ended_ids,
            "last_reset": latest_reset.get(sid),
        })

    return sorted(students, key=lambda x: (not x["exam_ended"], x["name"]))


# ── 교수용: 학생 시험 응시 상태 리셋 (재응시 허용) ──

@router.post("/exam/reset", status_code=200)
async def reset_exam_status(body: ExamResetRequest, user: dict = Depends(require_professor)):
    """학생의 시험 종료 상태를 리셋하여 재응시 허용 (교수 전용). 로그 기록."""
    supabase = get_supabase()

    # forced_end 위반 기록 삭제
    existing = supabase.table("exam_violations").select("id").eq(
        "assignment_id", body.assignment_id
    ).eq("student_id", body.student_id).eq("violation_type", "forced_end").execute()

    if not existing.data:
        raise HTTPException(400, "해당 학생의 시험 종료 기록이 없습니다.")

    supabase.table("exam_violations").delete().eq(
        "assignment_id", body.assignment_id
    ).eq("student_id", body.student_id).eq("violation_type", "forced_end").execute()

    # 리셋 로그 기록 (부정 방지 감사 로그)
    supabase.table("exam_reset_logs").insert({
        "assignment_id": body.assignment_id,
        "student_id": body.student_id,
        "professor_id": user["id"],
        "reason": body.reason or "교수 수동 리셋",
        "reset_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {"message": "시험 상태가 리셋되었습니다. 학생이 재응시할 수 있습니다."}
