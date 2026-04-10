import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="not-found-page">
      <div className="not-found-code">404</div>
      <h1 className="not-found-title">{"\uD398\uC774\uC9C0\uB97C"} {"\uCC3E\uC744"} {"\uC218"} {"\uC5C6\uC2B5\uB2C8\uB2E4"}</h1>
      <p className="not-found-desc">
        {"\uC694\uCCAD\uD558\uC2E0"} {"\uD398\uC774\uC9C0\uAC00"} {"\uC874\uC7AC\uD558\uC9C0"} {"\uC54A\uAC70\uB098"} {"\uC774\uB3D9\uB418\uC5C8\uC744"} {"\uC218"} {"\uC788\uC2B5\uB2C8\uB2E4"}.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          {"\uD648\uC73C\uB85C"} {"\uAC00\uAE30"}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1 as any)}>
          {"\uB4A4\uB85C"} {"\uAC00\uAE30"}
        </button>
      </div>
    </div>
  );
}
