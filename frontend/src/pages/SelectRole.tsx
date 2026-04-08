import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function SelectRole() {
  const navigate = useNavigate();
  const selectRole = useAuthStore((s) => s.selectRole);

  const handleSelect = async (role: "professor" | "student") => {
    await selectRole(role);
    navigate(role === "professor" ? "/professor" : "/student");
  };

  return (
    <div className="page-center">
      <div className="logo" style={{ fontSize: 28, marginBottom: 8 }}>
        pikabuddy
      </div>
      <h1>당신의 역할을 선택해주세요</h1>
      <p>인지적 아틀리에에 오신 것을 환영합니다.</p>

      <div className="role-cards">
        <button
          className="role-card"
          onClick={() => handleSelect("professor")}
        >
          <div className="role-icon">&#x1F468;&#x200D;&#x1F3EB;</div>
          <h2>교수 (Professor)</h2>
          <p>
            클래스를 개설하고 학생들의 학습 데이터를 분석하세요. 개인화된
            교육 전략을 수립할 수 있습니다.
          </p>
        </button>
        <button className="role-card" onClick={() => handleSelect("student")}>
          <div className="role-icon">&#x1F393;</div>
          <h2>학생 (Student)</h2>
          <p>
            AI 튜터와 함께 코딩 실력을 키워보세요. 실시간 피드백과 함께
            나만의 페이스로 학습을 경험하세요.
          </p>
        </button>
      </div>
    </div>
  );
}
