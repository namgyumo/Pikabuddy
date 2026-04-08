import hmac
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from common.supabase_client import get_supabase
from middleware.auth import get_current_user
from config import get_settings

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

    # Match credentials
    role = None
    if hmac.compare_digest(body.username, settings.studentAdminId) and hmac.compare_digest(body.password, settings.studentAdminPassword):
        role = "student"
    elif hmac.compare_digest(body.username, settings.teacherAdminId) and hmac.compare_digest(body.password, settings.teacherAdminPassword):
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
                raise HTTPException(status_code=500, detail=f"계정 생성 실패: {create_res.text}")

            # Now sign in
            sign_in2 = await client.post(
                f"{base_url}/auth/v1/token?grant_type=password",
                headers={"apikey": service_key, "Content-Type": "application/json"},
                json={"email": admin_email, "password": body.password},
            )
            if sign_in2.status_code != 200:
                raise HTTPException(status_code=500, detail=f"로그인 실패: {sign_in2.text}")
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

    return {
        "access_token": access_token,
        "refresh_token": data.get("refresh_token", ""),
        "user": user_data.data,
    }


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

        return {
            "user_id": user_data.data["id"],
            "email": user_data.data["email"],
            "role": user_data.data.get("role"),
            "is_new": is_new,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/role")
async def select_role(body: RoleSelectRequest, user: dict = Depends(get_current_user)):
    """최초 로그인 시 역할 선택"""
    if body.role not in ("professor", "student"):
        raise HTTPException(status_code=400, detail="역할은 professor 또는 student만 가능합니다.")

    supabase = get_supabase()
    supabase.table("users").update({"role": body.role}).eq("id", user["id"]).execute()
    return {"message": "역할이 설정되었습니다.", "role": body.role}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """내 정보 조회"""
    return user


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    school: str | None = None
    department: str | None = None
    student_id: str | None = None


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
