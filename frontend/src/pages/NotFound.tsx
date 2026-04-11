import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function NotFound() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const getHomePath = () => {
    if (!user) return "/";
    if (user.role === "professor") return "/professor";
    if (user.role === "personal") return "/personal";
    return "/student";
  };

  return (
    <div className="not-found-page">
      <div className="not-found-code">404</div>
      <h1 className="not-found-title">페이지를 찾을 수 없습니다</h1>
      <p className="not-found-desc">
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn btn-primary" onClick={() => navigate(getHomePath())}>
          홈으로 가기
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1 as any)}>
          뒤로 가기
        </button>
      </div>
    </div>
  );
}
