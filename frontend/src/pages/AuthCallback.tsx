import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function AuthCallback() {
  const navigate = useNavigate();
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      const pendingInvite = sessionStorage.getItem("pending_invite");
      if (pendingInvite) {
        sessionStorage.removeItem("pending_invite");
        navigate(`/join/${pendingInvite}`);
        return;
      }
      if (!user.role) {
        navigate("/select-role");
      } else if (user.role === "professor") {
        navigate("/professor");
      } else {
        navigate("/student");
      }
    }
  }, [user, navigate]);

  return (
    <div className="page-center">
      <div className="loading-spinner">로그인 처리 중...</div>
    </div>
  );
}
