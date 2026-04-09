import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from common.supabase_client import get_supabase

logger = logging.getLogger(__name__)
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """JWT를 검증하고 사용자 정보를 반환한다."""
    token = credentials.credentials
    supabase = get_supabase()

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 토큰입니다.",
            )

        supabase_uid = user_response.user.id
        result = (
            supabase.table("users")
            .select("*")
            .eq("supabase_uid", supabase_uid)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="사용자 레코드가 없습니다.",
            )

        user = result.data[0]
        logger.info(f"[Auth] uid={supabase_uid}, role={user.get('role')}, email={user.get('email')}")
        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Auth] 인증 실패: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다.",
        )


async def require_professor(user: dict = Depends(get_current_user)) -> dict:
    """교수 권한을 요구한다. 어드민은 통과."""
    is_admin = user.get("email", "").endswith("@pikabuddy.admin")
    if user.get("role") != "professor" and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="교수 권한이 필요합니다.",
        )
    return user


async def require_student(user: dict = Depends(get_current_user)) -> dict:
    """학생 권한을 요구한다."""
    if user.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="학생 권한이 필요합니다.",
        )
    return user


async def require_student_or_personal(user: dict = Depends(get_current_user)) -> dict:
    """학생 또는 개인 권한을 요구한다."""
    if user.get("role") not in ("student", "personal"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="학생 또는 개인 권한이 필요합니다.",
        )
    return user
