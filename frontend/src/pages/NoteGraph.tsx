import React, { useEffect, useState, useRef, useCallback, useMemo, Component } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ForceGraph2DImport from "react-force-graph-2d";
import api from "../lib/api";
import type { Course, GraphData } from "../types";

const ForceGraph2D = (ForceGraph2DImport as any).default || ForceGraph2DImport;

/* ── Error boundary ── */
class GraphErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; msg: string }
> {
  state = { hasError: false, msg: "" };
  static getDerivedStateFromError(e: Error) { return { hasError: true, msg: e?.message || "" }; }
  componentDidCatch(e: Error) { console.error("[NoteGraph]", e); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
        그래프 렌더링 오류<br />
        <span style={{ fontSize: 11, color: "#475569" }}>{this.state.msg}</span><br />
        <button style={{ marginTop: 12, padding: "6px 16px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer" }}
          onClick={() => window.location.reload()}>새로고침</button>
      </div>
    );
    return this.props.children;
  }
}

/* ── types ── */
interface GNode {
  id: string;
  title: string;
  score: number | null;
  tags: string[];
  parentId: string | null;
  size: number;
  createdAt: string;
  updatedAt: string;
  x?: number; y?: number;
  vx?: number; vy?: number;
  fx?: number; fy?: number;
}
interface GLink {
  source: string | GNode;
  target: string | GNode;
  type: "parent" | "link" | "similar";
}

function scoreColor(s: number | null) {
  if (s == null) return "#64748b";
  if (s < 40) return "#f87171";
  if (s < 60) return "#fbbf24";
  if (s < 80) return "#60a5fa";
  return "#4ade80";
}

export default function NoteGraph() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const fgRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<GNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);

  // Filters
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [tagFilter, setTagFilter] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [timeRange, setTimeRange] = useState(100);

  // Panels
  const [studyPath, setStudyPath] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [panel, setPanel] = useState<"none" | "path" | "report">("none");

  const fittedRef = useRef(false);

  /* ── data ── */
  useEffect(() => {
    if (!courseId) return;
    let on = true;
    (async () => {
      try { const r = await api.get(`/courses/${courseId}`); if (on) setCourse(r.data); } catch {}
      // graph endpoint → fallback to notes list
      try {
        const r = await api.get(`/courses/${courseId}/notes/graph`);
        if (on) setGraphData(r.data);
      } catch {
        try {
          const r = await api.get(`/courses/${courseId}/notes`);
          if (on) {
            const nodes = r.data.map((n: any) => ({
              id: n.id, title: n.title, parent_id: n.parent_id,
              understanding_score: n.understanding_score, tags: [],
              updated_at: n.updated_at, created_at: n.created_at, content_length: 100,
            }));
            const edges = r.data.filter((n: any) => n.parent_id).map((n: any) => ({
              source: n.parent_id, target: n.id, type: "parent" as const,
            }));
            setGraphData({ nodes, edges });
          }
        } catch { if (on) setError("노트를 불러올 수 없습니다."); }
      }
      try { const r = await api.get(`/courses/${courseId}/study-path`); if (on) setStudyPath(r.data); } catch {}
      if (on) setLoading(false);
    })();
    return () => { on = false; };
  }, [courseId]);

  /* ── resize (re-run when loading finishes so wrapRef is available) ── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setDim({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, error]);

  /* ── delay mount to ensure layout ── */
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  /* ── mouse pos ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  /* ── tags list ── */
  const allTags = useMemo(() => {
    if (!graphData) return [];
    const s = new Set<string>();
    graphData.nodes.forEach((n) => n.tags.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [graphData]);

  /* ── date range ── */
  const dateRange = useMemo(() => {
    if (!graphData?.nodes.length) return { min: 0, max: Date.now() };
    const ts = graphData.nodes.map((n) => new Date(n.created_at).getTime());
    return { min: Math.min(...ts), max: Math.max(...ts) };
  }, [graphData]);

  /* ── filtered + mapped graph data ── */
  const gd = useMemo(() => {
    if (!graphData) return { nodes: [] as GNode[], links: [] as GLink[] };
    const cutoff = dateRange.min + (dateRange.max - dateRange.min) * (timeRange / 100);
    const nodes = graphData.nodes.filter((n) => {
      if (new Date(n.created_at).getTime() > cutoff) return false;
      const s = n.understanding_score;
      if (s != null && (s < scoreRange[0] || s > scoreRange[1])) return false;
      if (tagFilter && !n.tags.includes(tagFilter)) return false;
      return true;
    });
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes: nodes.map((n): GNode => ({
        id: n.id, title: n.title, score: n.understanding_score,
        tags: n.tags, parentId: n.parent_id,
        size: Math.max(4, Math.min(14, 3 + Math.sqrt(n.content_length) / 5)),
        createdAt: n.created_at, updatedAt: n.updated_at,
      })),
      links: graphData.edges
        .filter((e) => ids.has(e.source) && ids.has(e.target))
        .map((e): GLink => ({ source: e.source, target: e.target, type: e.type })),
    };
  }, [graphData, scoreRange, tagFilter, timeRange, dateRange]);

  /* ── zoom to fit + freeze all nodes after engine settles ── */
  const onEngineStop = useCallback(() => {
    if (!fittedRef.current && fgRef.current && gd.nodes.length > 0) {
      fittedRef.current = true;
      // freeze every node in place so dragging one doesn't ripple
      gd.nodes.forEach((n) => { n.fx = n.x; n.fy = n.y; });
      fgRef.current.zoomToFit(300, 80);
    }
  }, [gd.nodes]);

  /* ── node paint ── */
  const paintNode = useCallback((node: GNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const x = node.x, y = node.y;
    if (x == null || y == null || !isFinite(x) || !isFinite(y)) return;

    const isHov = hovered?.id === node.id;
    const r = isHov ? node.size + 2 : node.size;
    const col = scoreColor(node.score);

    // soft glow behind hovered node
    if (isHov) {
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.fillStyle = col + "18"; // ~10% opacity hex
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = col + "30"; // ~19% opacity hex
      ctx.fill();
    }

    // main circle with subtle border
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // inner highlight (gives depth)
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.22, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fill();

    // label
    const showLbl = isHov || (showLabels && globalScale > 0.7);
    if (!showLbl) return;

    const fs = Math.min(11, Math.max(7, 10 / globalScale));
    ctx.font = `${isHov ? "600" : "500"} ${fs}px "Pretendard", -apple-system, system-ui, sans-serif`;
    const maxChars = isHov ? 24 : 14;
    const txt = node.title.length > maxChars ? node.title.slice(0, maxChars) + "…" : node.title;
    const tw = ctx.measureText(txt).width;

    // pill-shaped label background
    const px = 5, py = 2.5;
    const lx = x;
    const ly = y + r + fs * 0.5 + 5;
    const pillW = tw + px * 2;
    const pillH = fs + py * 2;
    const pillR = pillH / 2; // fully rounded ends
    const left = lx - pillW / 2;
    const top = ly - pillH / 2;

    ctx.beginPath();
    ctx.moveTo(left + pillR, top);
    ctx.lineTo(left + pillW - pillR, top);
    ctx.quadraticCurveTo(left + pillW, top, left + pillW, top + pillR);
    ctx.lineTo(left + pillW, top + pillH - pillR);
    ctx.quadraticCurveTo(left + pillW, top + pillH, left + pillW - pillR, top + pillH);
    ctx.lineTo(left + pillR, top + pillH);
    ctx.quadraticCurveTo(left, top + pillH, left, top + pillH - pillR);
    ctx.lineTo(left, top + pillR);
    ctx.quadraticCurveTo(left, top, left + pillR, top);
    ctx.closePath();

    if (isHov) {
      ctx.fillStyle = "rgba(30,41,59,0.92)";
      ctx.strokeStyle = col + "60";
      ctx.lineWidth = 0.8;
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(15,23,42,0.8)";
      ctx.fill();
    }

    // label text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isHov ? "#f8fafc" : "rgba(203,213,225,0.85)";
    ctx.fillText(txt, lx, ly);
  }, [hovered, showLabels]);

  /* ── link paint ── */
  const paintLink = useCallback((link: GLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const s = link.source as GNode, t = link.target as GNode;
    if (!isFinite(s.x!) || !isFinite(s.y!) || !isFinite(t.x!) || !isFinite(t.y!)) return;

    const lw = 1 / globalScale;
    ctx.beginPath();
    ctx.moveTo(s.x!, s.y!);
    ctx.lineTo(t.x!, t.y!);
    if (link.type === "parent") {
      ctx.strokeStyle = "rgba(96,165,250,0.3)";
      ctx.lineWidth = Math.max(lw, 0.8);
      ctx.setLineDash([]);
    } else if (link.type === "link") {
      ctx.strokeStyle = "rgba(251,191,36,0.25)";
      ctx.lineWidth = Math.max(lw * 0.8, 0.5);
      ctx.setLineDash([4 / globalScale, 4 / globalScale]);
    } else {
      ctx.strokeStyle = "rgba(148,163,184,0.12)";
      ctx.lineWidth = Math.max(lw * 0.5, 0.3);
      ctx.setLineDash([2 / globalScale, 4 / globalScale]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const loadReport = useCallback(async () => {
    if (!courseId) return;
    if (panel === "report") { setPanel("none"); return; }
    setReportLoading(true); setPanel("report");
    try { setReport((await api.get(`/courses/${courseId}/weekly-report`)).data); }
    catch { setReport({ summary: "리포트를 생성하지 못했습니다." }); }
    setReportLoading(false);
  }, [courseId, panel]);

  /* ── render ── */
  if (loading) return (
    <div className="graph-page" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#64748b" }}>그래프를 불러오는 중...</div>
    </div>
  );

  if (error) return (
    <div className="graph-page" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#f87171", textAlign: "center" }}>{error}<br />
        <button className="btn btn-ghost" style={{ marginTop: 12, color: "#94a3b8" }}
          onClick={() => navigate(`/courses/${courseId}/notes`)}>노트 목록으로</button>
      </div>
    </div>
  );

  return (
    <div className="graph-page">
      <header className="graph-header">
        <div className="graph-header-left">
          <button className="btn btn-ghost" onClick={() => navigate(`/courses/${courseId}/notes`)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="graph-title">노트 지도</h1>
          <span className="graph-count">{gd.nodes.length}개</span>
        </div>
        <div className="graph-header-right">
          <button className={`graph-panel-btn${panel === "path" ? " active" : ""}`}
            onClick={() => setPanel(panel === "path" ? "none" : "path")}>학습 경로</button>
          <button className={`graph-panel-btn${panel === "report" ? " active" : ""}`}
            onClick={loadReport}>주간 리포트</button>
          <button className="graph-panel-btn" onClick={() => { fittedRef.current = false; fgRef.current?.zoomToFit(300, 80); }}>
            전체 보기
          </button>
        </div>
      </header>

      <div className="graph-body">
        {/* Controls */}
        <div className="graph-controls">
          <div className="graph-legend">
            <h4>이해도</h4>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#f87171" }} /> 0–39%</div>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#fbbf24" }} /> 40–59%</div>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#60a5fa" }} /> 60–79%</div>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#4ade80" }} /> 80–100%</div>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#64748b" }} /> 미분석</div>
          </div>
          <div className="graph-legend">
            <h4>연결선</h4>
            <div className="legend-row"><span className="legend-line solid" /> 부모-자식</div>
            <div className="legend-row"><span className="legend-line dashed" /> 링크</div>
          </div>
          <div className="graph-filter">
            <label>점수: {scoreRange[0]}–{scoreRange[1]}%</label>
            <input type="range" min={0} max={100} value={scoreRange[0]}
              onChange={(e) => setScoreRange([+e.target.value, scoreRange[1]])} />
            <input type="range" min={0} max={100} value={scoreRange[1]}
              onChange={(e) => setScoreRange([scoreRange[0], +e.target.value])} />
          </div>
          {allTags.length > 0 && (
            <div className="graph-filter">
              <label>태그</label>
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="">전체</option>
                {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
              </select>
            </div>
          )}
          <div className="graph-filter">
            <label>기간</label>
            <input type="range" min={1} max={100} value={timeRange}
              onChange={(e) => setTimeRange(+e.target.value)} />
            <div className="graph-filter-hint">{timeRange < 100 ? `${timeRange}%` : "전체"}</div>
          </div>
          <label className="graph-toggle">
            <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
            <span>이름 표시</span>
          </label>
        </div>

        {/* Canvas */}
        <div className="graph-canvas" ref={wrapRef}>
          <GraphErrorBoundary>
            {ready && dim.w > 0 && dim.h > 0 && (
              <ForceGraph2D
                ref={fgRef}
                width={dim.w}
                height={dim.h}
                graphData={gd}
                nodeId="id"
                nodeCanvasObject={paintNode}
                nodePointerAreaPaint={(node: GNode, color: string, ctx: CanvasRenderingContext2D) => {
                  if (node.x == null || node.y == null) return;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, node.size + 6, 0, Math.PI * 2);
                  ctx.fillStyle = color;
                  ctx.fill();
                }}
                linkCanvasObject={paintLink}
                onNodeClick={(node: GNode) => navigate(`/courses/${courseId}/notes/${node.id}`)}
                onNodeHover={(node: GNode | null) => setHovered(node)}
                onNodeDrag={(node: GNode) => { node.fx = node.x; node.fy = node.y; }}
                onNodeDragEnd={(node: GNode) => { node.fx = node.x; node.fy = node.y; }}
                onEngineStop={onEngineStop}
                backgroundColor="transparent"
                warmupTicks={120}
                cooldownTicks={60}
                cooldownTime={3000}
                d3AlphaDecay={0.08}
                d3VelocityDecay={0.45}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                minZoom={0.15}
                maxZoom={6}
              />
            )}
          </GraphErrorBoundary>

          {/* Tooltip (HTML, follows mouse) */}
          {hovered && (
            <div className="graph-tooltip" style={{ left: mousePos.x + 14, top: mousePos.y + 14 }}>
              <div className="graph-tooltip-title">{hovered.title}</div>
              <div className="graph-tooltip-row">
                <span className="graph-tooltip-dot" style={{ background: scoreColor(hovered.score) }} />
                {hovered.score != null ? `이해도 ${hovered.score}%` : "미분석"}
              </div>
              {hovered.tags.length > 0 && (
                <div className="graph-tooltip-tags">
                  {hovered.tags.map((t) => <span key={t}>#{t}</span>)}
                </div>
              )}
              <div className="graph-tooltip-date">
                {new Date(hovered.updatedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 수정
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        {panel !== "none" && (
          <div className="graph-side-panel">
            <button className="graph-panel-close" onClick={() => setPanel("none")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {panel === "path" && (
              <>
                <h3 className="panel-title">학습 경로</h3>
                <p className="panel-desc">이해도 낮은 순서대로 복습하세요</p>
                <div className="study-path-list">
                  {studyPath.map((it, i) => (
                    <div key={it.id} className={`study-path-item priority-${it.priority}`}
                      onClick={() => navigate(`/courses/${courseId}/notes/${it.id}`)}>
                      <span className="study-path-num">{i + 1}</span>
                      <div className="study-path-info">
                        <div className="study-path-title">{it.title}</div>
                        <div className="study-path-reason">{it.reason}</div>
                      </div>
                      {it.score != null && <span className="study-path-score" style={{ color: scoreColor(it.score) }}>{it.score}%</span>}
                    </div>
                  ))}
                  {!studyPath.length && <div className="panel-empty">노트가 없습니다</div>}
                </div>
              </>
            )}
            {panel === "report" && (
              <>
                <h3 className="panel-title">주간 리포트</h3>
                {reportLoading ? <div className="panel-loading">생성 중...</div> : report && (
                  <div className="weekly-report">
                    <div className="report-period">{report.period}</div>
                    <div className="report-stats">
                      <div className="report-stat"><span className="report-stat-num">{report.total_notes}</span><span className="report-stat-label">전체</span></div>
                      <div className="report-stat"><span className="report-stat-num">{report.new_notes}</span><span className="report-stat-label">이번 주</span></div>
                      <div className="report-stat"><span className="report-stat-num">{report.avg_score ?? "–"}%</span><span className="report-stat-label">평균</span></div>
                    </div>
                    {report.weakest_notes?.length > 0 && (
                      <div className="report-weak">
                        <h4>보완 필요</h4>
                        {report.weakest_notes.map((n: any) => (
                          <div key={n.id} className="report-weak-item" onClick={() => navigate(`/courses/${courseId}/notes/${n.id}`)}>
                            <span>{n.title}</span><span style={{ color: scoreColor(n.score) }}>{n.score}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="report-summary">{report.summary}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
