import hmac
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import get_current_user
from config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["인증"])


class AuthCallbackRequest(BaseModel):
    access_token: str


class RoleSelectRequest(BaseModel):
    role: str  # "professor" | "student"


class AdminLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/admin-login")
async def admin_login(body: AdminLoginRequest):
    """관리자 계정 로그인 (ID/PW)"""
    import httpx

    settings = get_settings()
    supabase = get_supabase()

    # Match credentials (admin + test accounts)
    role = None
    if hmac.compare_digest(body.username, settings.studentAdminId) and hmac.compare_digest(body.password, settings.studentAdminPassword):
        role = "student"
    elif hmac.compare_digest(body.username, settings.teacherAdminId) and hmac.compare_digest(body.password, settings.teacherAdminPassword):
        role = "professor"
    elif settings.studenttestid and hmac.compare_digest(body.username, settings.studenttestid) and hmac.compare_digest(body.password, settings.studenttestpassword):
        role = "student"
    elif settings.teachertestid and hmac.compare_digest(body.username, settings.teachertestid) and hmac.compare_digest(body.password, settings.teachertestpassword):
        role = "professor"
    else:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    admin_email = f"{body.username}@pikabuddy.admin"
    base_url = settings.SUPABASE_URL
    service_key = settings.SUPABASE_SERVICE_KEY
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        # Try sign in first
        sign_in = await client.post(
            f"{base_url}/auth/v1/token?grant_type=password",
            headers={"apikey": service_key, "Content-Type": "application/json"},
            json={"email": admin_email, "password": body.password},
        )

        if sign_in.status_code == 200:
            data = sign_in.json()
        else:
            # Create user via Admin API (auto-confirmed)
            create_res = await client.post(
                f"{base_url}/auth/v1/admin/users",
                headers=headers,
                json={
                    "email": admin_email,
                    "password": body.password,
                    "email_confirm": True,
                },
            )
            if create_res.status_code not in (200, 201):
                logger.error(f"[Admin] 계정 생성 실패: {create_res.text}")
                raise HTTPException(status_code=500, detail="계정 생성에 실패했습니다.")

            # Now sign in
            sign_in2 = await client.post(
                f"{base_url}/auth/v1/token?grant_type=password",
                headers={"apikey": service_key, "Content-Type": "application/json"},
                json={"email": admin_email, "password": body.password},
            )
            if sign_in2.status_code != 200:
                logger.error(f"[Admin] 로그인 실패: {sign_in2.text}")
                raise HTTPException(status_code=500, detail="로그인에 실패했습니다.")
            data = sign_in2.json()

    access_token = data.get("access_token")
    supabase_uid = data.get("user", {}).get("id")

    if not access_token or not supabase_uid:
        raise HTTPException(status_code=500, detail="인증 실패")

    # Ensure user record in users table with correct role
    existing = supabase.table("users").select("*").eq("supabase_uid", supabase_uid).execute()
    if not existing.data:
        supabase.table("users").insert({
            "email": admin_email,
            "name": f"Admin ({role})",
            "supabase_uid": supabase_uid,
            "role": role,
        }).execute()
    else:
        # Always force role update
        supabase.table("users").update({"role": role}).eq("supabase_uid", supabase_uid).execute()

    user_data = supabase.table("users").select("*").eq("supabase_uid", supabase_uid).single().execute()

    # 일일 로그인 EXP + 스트릭 보너스 + 배지 체크
    earned_badges = []
    try:
        from datetime import date as _date, datetime as _dt
        from modules.gamification.router import award_exp
        from modules.gamification.badge_defs import check_badges, _count_exp_log_days, _calc_streak
        uid = user_data.data["id"]
        award_exp(uid, "daily_login", f"login_{_date.today().isoformat()}", 5)
        # Streak bonus
        sb = get_supabase()
        days = _count_exp_log_days(sb, uid)
        streak = _calc_streak(days)
        if streak > 0 and streak % 7 == 0:
            award_exp(uid, "streak_bonus", f"streak_{streak}_{_date.today().isoformat()}", min(streak, 50))
        hour = _dt.now().hour
        earned_badges = check_badges(uid, "login", {"is_dawn": 4 <= hour <= 5})
    except Exception as e:
        logger.error(f"[Auth] gamification error on admin-login: {e}")

    return {
        "access_token": access_token,
        "refresh_token": data.get("refresh_token", ""),
        "user": user_data.data,
        "earned_badges": [{"id": b["id"], "name": b["name"], "icon": b["icon"], "desc": b["desc"], "rarity": b["rarity"]} for b in earned_badges],
    }


@router.get("/test-accounts")
async def get_test_accounts():
    """테스트 계정 정보 반환 (로그인 화면에 표시)"""
    settings = get_settings()
    accounts = []
    if settings.teachertestid:
        accounts.append({"role": "professor", "label": "교수 테스트", "username": settings.teachertestid})
    if settings.studenttestid:
        accounts.append({"role": "student", "label": "학생 테스트", "username": settings.studenttestid})
    return {"accounts": accounts}


@router.post("/callback")
async def auth_callback(body: AuthCallbackRequest):
    """Google OAuth 콜백 - Supabase에서 처리된 토큰으로 사용자 레코드 생성/갱신"""
    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(body.access_token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

        su = user_response.user
        existing = (
            supabase.table("users")
            .select("*")
            .eq("supabase_uid", su.id)
            .execute()
        )

        is_new = len(existing.data) == 0
        if is_new:
            supabase.table("users").insert(
                {
                    "email": su.email,
                    "name": su.user_metadata.get("full_name", su.email.split("@")[0]),
                    "avatar_url": su.user_metadata.get("avatar_url"),
                    "supabase_uid": su.id,
                }
            ).execute()
            user_data = (
                supabase.table("users")
                .select("*")
                .eq("supabase_uid", su.id)
                .single()
                .execute()
            )
        else:
            user_data = (
                supabase.table("users")
                .select("*")
                .eq("supabase_uid", su.id)
                .single()
                .execute()
            )

        # 일일 로그인 EXP + 스트릭 보너스 + 배지 체크
        try:
            from datetime import date as _date, datetime as _dt
            from modules.gamification.router import award_exp
            from modules.gamification.badge_defs import check_badges, _count_exp_log_days, _calc_streak
            uid = user_data.data["id"]
            award_exp(uid, "daily_login", f"login_{_date.today().isoformat()}", 5)
            # Streak bonus
            _sb = get_supabase()
            days = _count_exp_log_days(_sb, uid)
            streak = _calc_streak(days)
            if streak > 0 and streak % 7 == 0:
                award_exp(uid, "streak_bonus", f"streak_{streak}_{_date.today().isoformat()}", min(streak, 50))
            hour = _dt.now().hour
            check_badges(uid, "login", {"is_dawn": 4 <= hour <= 5})
        except Exception as e:
            logger.error(f"[Auth] gamification error on callback: {e}")

        return {
            "user_id": user_data.data["id"],
            "email": user_data.data["email"],
            "role": user_data.data.get("role"),
            "is_new": is_new,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Auth] 콜백 처리 실패: {e}")
        raise HTTPException(status_code=500, detail="인증 처리 중 오류가 발생했습니다.")


@router.post("/role")
async def select_role(body: RoleSelectRequest, user: dict = Depends(get_current_user)):
    """최초 로그인 시 역할 선택"""
    if body.role not in ("professor", "student", "personal"):
        raise HTTPException(status_code=400, detail="역할은 professor, student, personal만 가능합니다.")

    # 이미 역할이 설정된 경우 차단 (switch-role 사용해야 함)
    if user.get("role"):
        raise HTTPException(status_code=400, detail="이미 역할이 설정되어 있습니다. 역할 변경은 설정에서 해주세요.")

    supabase = get_supabase()
    supabase.table("users").update({"role": body.role}).eq("id", user["id"]).execute()

    # 개인 모드 선택 시 가상 코스 자동 생성
    if body.role == "personal":
        existing = supabase.table("courses").select("id").eq("professor_id", user["id"]).eq("is_personal", True).execute()
        if not existing.data:
            import random, string
            code = "P" + "".join(random.choices(string.ascii_uppercase + string.digits, k=7))
            supabase.table("courses").insert({
                "professor_id": user["id"],
                "title": "내 학습 공간",
                "description": "개인 학습을 위한 공간입니다.",
                "invite_code": code,
                "is_personal": True,
            }).execute()

    return {"message": "역할이 설정되었습니다.", "role": body.role}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """내 정보 조회"""
    return user


class SwitchRoleRequest(BaseModel):
    role: str  # "professor" | "student" | "personal"


@router.post("/switch-role")
async def switch_role(body: SwitchRoleRequest, user: dict = Depends(get_current_user)):
    """계정 설정에서 역할 변경"""
    if body.role not in ("professor", "student", "personal"):
        raise HTTPException(status_code=400, detail="유효하지 않은 역할입니다.")

    supabase = get_supabase()
    current_role = user.get("role")

    # ── 역할 전환 시 기존 데이터 보존 ──
    # 수강 등록, 노트, 강의 등 모든 데이터를 유지
    # 역할에 따라 UI에서 보이는 뷰만 달라짐

    supabase.table("users").update({"role": body.role}).eq("id", user["id"]).execute()

    # 개인 모드로 전환 시 가상 코스 생성
    if body.role == "personal":
        existing = supabase.table("courses").select("id").eq("professor_id", user["id"]).eq("is_personal", True).execute()
        if not existing.data:
            import random, string
            code = "P" + "".join(random.choices(string.ascii_uppercase + string.digits, k=7))
            supabase.table("courses").insert({
                "professor_id": user["id"],
                "title": "내 학습 공간",
                "description": "개인 학습을 위한 공간입니다.",
                "invite_code": code,
                "is_personal": True,
            }).execute()

    result = supabase.table("users").select("*").eq("id", user["id"]).single().execute()
    return result.data


@router.post("/recover-enrollments")
async def recover_enrollments(user: dict = Depends(get_current_user)):
    """활동 ���록이 존재하는 코스에 대해 수강 등록을 복구한다."""
    supabase = get_supabase()
    uid = user["id"]

    # 1) 이 유저의 활동이 있는 코스 ID 수집 (노트, 메시��, 과제 제출)
    activity_course_ids: set = set()

    # 노트
    notes = supabase.table("notes").select("course_id").eq("student_id", uid).execute()
    for n in (notes.data or []):
        if n.get("course_id"):
            activity_course_ids.add(n["course_id"])

    # 메시지 (보낸 것 + 받은 것)
    try:
        sent = supabase.table("messages").select("course_id").eq("sender_id", uid).execute()
        for m in (sent.data or []):
            if m.get("course_id"):
                activity_course_ids.add(m["course_id"])
        received = supabase.table("messages").select("course_id").eq("receiver_id", uid).execute()
        for m in (received.data or []):
            if m.get("course_id"):
                activity_course_ids.add(m["course_id"])
    except Exception:
        pass

    # 과제 제출
    try:
        subs = supabase.table("submissions").select("assignment_id, assignments!inner(course_id)").eq("student_id", uid).execute()
        for s in (subs.data or []):
            assignment = s.get("assignments") or {}
            if assignment.get("course_id"):
                activity_course_ids.add(assignment["course_id"])
    except Exception:
        pass

    if not activity_course_ids:
        return {"recovered": 0, "message": "복구할 수강 등록이 없습니다."}

    # 2) 이미 등록된 코스 ��외
    existing = supabase.table("enrollments").select("course_id").eq("student_id", uid).execute()
    existing_ids = set(e["course_id"] for e in (existing.data or []))

    to_recover = [cid for cid in activity_course_ids if cid not in existing_ids]

    # 3) professor_id로 소유한 코스도 추가 (교수였다가 학생 전환한 경우)
    try:
        prof_courses = supabase.table("courses").select("id").eq("professor_id", uid).execute()
        for c in (prof_courses.data or []):
            if c["id"] not in existing_ids and c["id"] not in to_recover:
                to_recover.append(c["id"])
    except Exception:
        pass

    # 5) 수강 등록 복구
    recovered = 0
    for cid in to_recover:
        try:
            supabase.table("enrollments").insert({
                "student_id": uid,
                "course_id": cid,
            }).execute()
            recovered += 1
        except Exception:
            pass

    if recovered == 0 and not to_recover:
        return {"recovered": 0, "message": f"이미 모든 강의에 등록되어 있습니다. (활동 감지: {len(activity_course_ids)}개 코스)"}
    return {"recovered": recovered, "message": f"{recovered}개 강의 수강 등록이 복구되었습니다."}


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    school: str | None = None
    department: str | None = None
    student_id: str | None = None
    preferences: dict | None = None
    bio: str | None = None
    social_links: dict | None = None
    profile_color: str | None = None


@router.patch("/profile")
async def update_profile(body: ProfileUpdateRequest, user: dict = Depends(get_current_user)):
    """프로필 수정"""
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="변경할 내용이 없습니다.")

    supabase = get_supabase()
    supabase.table("users").update(update_data).eq("id", user["id"]).execute()
    result = supabase.table("users").select("*").eq("id", user["id"]).single().execute()
    return result.data


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_IMAGE_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """아바타 이미지 업로드"""
    ext = (file.filename.split(".")[-1] if file.filename else "png").lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail="허용되지 않는 파일 형식입니다. (jpg, png, gif, webp)")
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="허용되지 않는 이미지 형식입니다.")
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기가 5MB를 초과합니다.")

    supabase = get_supabase()
    path = f"avatars/{user['id']}/{uuid.uuid4().hex}.{ext}"
    supabase.storage.from_("avatars").upload(path, content, {"content-type": file.content_type or "image/png"})
    url = supabase.storage.from_("avatars").get_public_url(path)

    supabase.table("users").update({"avatar_url": url}).eq("id", user["id"]).execute()
    return {"avatar_url": url}


@router.post("/banner")
async def upload_banner(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """배너 이미지 업로드"""
    ext = (file.filename.split(".")[-1] if file.filename else "png").lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail="허용되지 않는 파일 형식입니다. (jpg, png, gif, webp)")
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="허용되지 않는 이미지 형식입니다.")
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="파일 크기가 5MB를 초과합니다.")

    supabase = get_supabase()
    path = f"banners/{user['id']}/{uuid.uuid4().hex}.{ext}"
    supabase.storage.from_("banners").upload(path, content, {"content-type": file.content_type or "image/png"})
    url = supabase.storage.from_("banners").get_public_url(path)

    supabase.table("users").update({"banner_url": url}).eq("id", user["id"]).execute()
    return {"banner_url": url}


@router.get("/profile/{user_id}")
async def get_public_profile(user_id: str):
    """공개 프로필 조회"""
    supabase = get_supabase()
    result = supabase.table("users").select(
        "id, name, role, avatar_url, banner_url, bio, social_links, profile_color, school, department, created_at"
    ).eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return result.data
