import React, { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo, Component } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2DImport from "react-force-graph-2d";
import { forceCollide, forceX, forceY, forceManyBody } from "d3-force";
import api from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import type { Course, GraphData } from "../types";

const ForceGraph2D = (ForceGraph2DImport as any).default || ForceGraph2DImport;

/* ── Course color palette (10 distinct colors) ── */
const COURSE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

/* ── Theme helpers (reused from NoteGraph) ── */
function parseColorLuminance(color: string): number {
  let r = 0, g = 0, b = 0;
  if (color.startsWith("#")) {
    const hex = color.length === 4
      ? "#" + color[1]+color[1]+color[2]+color[2]+color[3]+color[3]
      : color;
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  } else {
    const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) { r = +m[1]/255; g = +m[2]/255; b = +m[3]/255; }
  }
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getGraphColors() {
  const cs = getComputedStyle(document.documentElement);
  const surface = cs.getPropertyValue("--surface").trim() || "#f5f6fa";
  const onSurface = cs.getPropertyValue("--on-surface").trim() || "#1a1c23";
  const onSurfaceVar = cs.getPropertyValue("--on-surface-variant").trim() || "#44474f";
  const isDark = parseColorLuminance(surface) < 0.4;
  const parentCore = isDark ? "rgba(34,211,238,0.75)" : "rgba(6,150,170,0.85)";
  const parentGlow = isDark ? "rgba(34,211,238,0.2)" : "rgba(6,150,170,0.25)";
  const linkCore = isDark ? "rgba(251,191,36,0.7)" : "rgba(180,120,0,0.8)";
  const linkGlow = isDark ? "rgba(251,191,36,0.15)" : "rgba(180,120,0,0.2)";
  const simR = isDark ? 220 : 160;
  const simG = isDark ? 80 : 40;
  const simB = isDark ? 240 : 200;
  const simCoreBase = isDark ? 0.45 : 0.55;
  const simCoreDelta = isDark ? 0.35 : 0.3;
  const simGlow1Base = isDark ? 0.08 : 0.1;
  const simGlow1Delta = isDark ? 0.12 : 0.14;
  const simGlow2Base = isDark ? 0.16 : 0.2;
  const simGlow2Delta = isDark ? 0.16 : 0.18;
  const simGlow3Base = isDark ? 0.22 : 0.28;
  const simGlow3Delta = isDark ? 0.14 : 0.14;
  const nodeStroke = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
  const nodeStrokeRoot = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";
  const nodeHighlight = isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.35)";
  const rootRingAlpha = isDark ? "40" : "30";
  const labelBg = isDark ? "rgba(15,23,42,0.75)" : "rgba(255,255,255,0.88)";
  const labelBgRoot = isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.94)";
  const labelBgHover = isDark ? "rgba(30,41,59,0.95)" : "rgba(255,255,255,0.97)";
  const labelText = isDark ? "rgba(203,213,225,0.8)" : onSurfaceVar;
  const labelTextRoot = isDark ? "#e2e8f0" : onSurface;
  const labelTextHover = isDark ? "#f8fafc" : onSurface;
  const labelBorderAlpha = "60";
  return {
    isDark, surface, onSurface, onSurfaceVar, parentCore, parentGlow, linkCore, linkGlow,
    simR, simG, simB, simCoreBase, simCoreDelta,
    simGlow1Base, simGlow1Delta, simGlow2Base, simGlow2Delta, simGlow3Base, simGlow3Delta,
    nodeStroke, nodeStrokeRoot, nodeHighlight, rootRingAlpha,
    labelBg, labelBgRoot, labelBgHover, labelText, labelTextRoot, labelTextHover, labelBorderAlpha,
  };
}

type GraphColorPalette = ReturnType<typeof getGraphColors>;

/* ── Error boundary ── */
class GraphErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; msg: string }
> {
  state = { hasError: false, msg: "" };
  static getDerivedStateFromError(e: Error) { return { hasError: true, msg: e?.message || "" }; }
  componentDidCatch(e: Error) { console.error("[AllNotesGraph]", e); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--on-surface-variant, #64748b)" }}>
        그래프 렌더링 오류<br />
        <span style={{ fontSize: 11 }}>{this.state.msg}</span><br />
        <button style={{ marginTop: 12, padding: "6px 16px", borderRadius: 6, border: "1px solid var(--outline-variant)", background: "transparent", cursor: "pointer" }}
          onClick={() => window.location.reload()}>새로고침</button>
      </div>
    );
    return this.props.children;
  }
}

function scoreColor(s: number | null) {
  if (s == null) return "#64748b";
  if (s < 40) return "#f87171";
  if (s < 60) return "#fbbf24";
  if (s < 80) return "#60a5fa";
  return "#4ade80";
}

/* ── types ── */
interface GNode {
  id: string;
  title: string;
  score: number | null;
  tags: string[];
  parentId: string | null;
  courseId: string;
  courseName: string;
  courseColor: string;
  size: number;
  updatedAt: string;
  x?: number; y?: number;
  vx?: number; vy?: number;
  fx?: number; fy?: number;
}
interface GLink {
  source: string | GNode;
  target: string | GNode;
  type: "parent" | "link" | "similar";
  weight?: number;
}

export default function AllNotesGraph() {
  const navigate = useNavigate();
  const fgRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [mergedGraph, setMergedGraph] = useState<GraphData | null>(null);
  const [courseColorMap, setCourseColorMap] = useState<Map<string, string>>(new Map());
  const [courseNameMap, setCourseNameMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<GNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [gColors, setGColors] = useState<GraphColorPalette>(getGraphColors);
  const gColorsRef = useRef(gColors);
  gColorsRef.current = gColors;
  useEffect(() => {
    const refresh = () => { const c = getGraphColors(); setGColors(c); gColorsRef.current = c; };
    const mo = new MutationObserver(refresh);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });
    return () => mo.disconnect();
  }, []);

  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [nodeSpacing, setNodeSpacing] = useState(50);
  const [edgeLength, setEdgeLength] = useState(50);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  // Edge type filters
  const [showParentEdges, setShowParentEdges] = useState(true);
  const [showLinkEdges, setShowLinkEdges] = useState(true);
  const [showSimilarEdges, setShowSimilarEdges] = useState(true);

  // Filters
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [tagFilter, setTagFilter] = useState("");
  const [timeRange, setTimeRange] = useState(100);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; node: GNode | null } | null>(null);

  // Panels: study path + weekly report
  const [panel, setPanel] = useState<"none" | "path" | "report">("none");
  const [studyPath, setStudyPath] = useState<any>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const nodeSpacingRef = useRef(nodeSpacing);
  const edgeLengthRef = useRef(edgeLength);
  nodeSpacingRef.current = nodeSpacing;
  edgeLengthRef.current = edgeLength;

  const fittedRef = useRef(false);
  const prevNodesRef = useRef<GNode[]>([]);
  const connectedNodeIds = useRef(new Set<string>());

  // Edge visibility ref
  const edgeVisRef = useRef({ parent: true, link: true, similar: true });
  edgeVisRef.current = { parent: showParentEdges, link: showLinkEdges, similar: showSimilarEdges };

  /* ── Fetch unified graph (single API — cross-course similarity included) ── */
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        // Fetch courses + unified graph in parallel
        const [coursesRes, graphRes] = await Promise.all([
          api.get("/courses"),
          api.get("/notes/unified-graph").catch(() => null),
        ]);
        if (!on) return;

        const courseList: Course[] = coursesRes.data;
        setCourses(courseList);

        const colorMap = new Map<string, string>();
        const nameMap = new Map<string, string>();
        courseList.forEach((c: Course, i: number) => {
          colorMap.set(c.id, COURSE_COLORS[i % COURSE_COLORS.length]);
          nameMap.set(c.id, c.title);
        });
        setCourseColorMap(colorMap);
        setCourseNameMap(nameMap);

        if (graphRes) {
          // unified-graph already has cross-course similarity edges
          setMergedGraph(graphRes.data);
        } else {
          // Fallback: fetch per-course and merge (no cross-course similarity)
          const graphResults = await Promise.all(
            courseList.map((c: Course) =>
              api.get(`/courses/${c.id}/notes/graph`).catch(() => ({ data: { nodes: [], edges: [] } }))
            )
          );
          if (!on) return;
          const allNodes: GraphData["nodes"] = [];
          const allEdges: GraphData["edges"] = [];
          graphResults.forEach((res, i) => {
            const gd: GraphData = res.data;
            const cid = courseList[i].id;
            gd.nodes.forEach((n) => {
              allNodes.push({ ...n, categories: [...(n.categories || []), cid] });
            });
            allEdges.push(...gd.edges);
          });
          setMergedGraph({ nodes: allNodes, edges: allEdges });
        }
      } catch {
        if (on) setError("데이터를 불러올 수 없습니다.");
      }
      if (on) setLoading(false);
    })();
    return () => { on = false; };
  }, []);

  /* ── Resize ── */
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

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // Close context menu on click
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [ctxMenu]);

  // Tags list
  const allTags = useMemo(() => {
    if (!mergedGraph) return [];
    const s = new Set<string>();
    mergedGraph.nodes.forEach((n) => n.tags.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [mergedGraph]);

  // Date range
  const dateRange = useMemo(() => {
    if (!mergedGraph?.nodes.length) return { min: 0, max: Date.now() };
    const ts = mergedGraph.nodes.map((n) => new Date(n.created_at).getTime());
    return { min: Math.min(...ts), max: Math.max(...ts) };
  }, [mergedGraph]);

  /* ── Map graph data ── */
  const gd = useMemo(() => {
    if (!mergedGraph) return { nodes: [] as GNode[], links: [] as GLink[] };
    const allNodes = mergedGraph.nodes;
    const ids = new Set(allNodes.map((n) => n.id));

    const parentMap = new Map<string, string | null>();
    allNodes.forEach((n) => parentMap.set(n.id, ids.has(n.parent_id ?? "") ? n.parent_id : null));

    const contentLengths = allNodes.map((n) => n.content_length || 0);
    const maxLen = Math.max(...contentLengths, 1);
    const sizeByContent = (cl: number) => 7 + (Math.log(1 + cl) / Math.log(1 + maxLen)) * 17;

    // Determine course_id per node from categories (last entry is courseId)
    const getCourseId = (n: typeof allNodes[0]) => {
      const cats = n.categories || [];
      // The course_id we pushed is the last item
      return cats[cats.length - 1] || "";
    };

    const posMap = new Map<string, { x: number; y: number }>();
    prevNodesRef.current.forEach((pn) => {
      if (pn.x != null && pn.y != null && isFinite(pn.x) && isFinite(pn.y)) {
        posMap.set(pn.id, { x: pn.x, y: pn.y });
      }
    });

    // Group by course for initial positioning (cluster per course)
    const courseIds = [...new Set(allNodes.map(getCourseId))];
    const courseAngle = new Map<string, number>();
    courseIds.forEach((cid, i) => {
      courseAngle.set(cid, (i / courseIds.length) * Math.PI * 2);
    });

    const nodes = allNodes.map((n, i): GNode => {
      const pid = parentMap.get(n.id) ?? null;
      const cid = getCourseId(n);
      const existing = posMap.get(n.id);
      let x: number, y: number;
      if (existing) {
        x = existing.x; y = existing.y;
      } else {
        // Place in cluster for this course
        const angle = courseAngle.get(cid) || 0;
        const radius = 200 + Math.random() * 150;
        x = Math.cos(angle) * radius + (Math.random() - 0.5) * 100;
        y = Math.sin(angle) * radius + (Math.random() - 0.5) * 100;
      }
      return {
        id: n.id, title: n.title, score: n.understanding_score,
        tags: n.tags, parentId: pid,
        courseId: cid,
        courseName: courseNameMap.get(cid) || "",
        courseColor: courseColorMap.get(cid) || "#64748b",
        size: sizeByContent(n.content_length || 0),
        updatedAt: n.updated_at,
        x, y,
      };
    });
    prevNodesRef.current = nodes;

    const links = mergedGraph.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e): GLink => ({ source: e.source, target: e.target, type: e.type, weight: e.weight }));
    const connected = new Set<string>();
    links.forEach((l) => {
      if (l.type === "parent" || l.type === "link") {
        connected.add(typeof l.source === "string" ? l.source : l.source.id);
        connected.add(typeof l.target === "string" ? l.target : l.target.id);
      }
    });
    connectedNodeIds.current = connected;

    return { nodes, links };
  }, [mergedGraph, courseColorMap, courseNameMap]);

  /* ── Visible nodes (course + score + tag + time filters) ── */
  const visibleIds = useMemo(() => {
    const cutoff = dateRange.min + (dateRange.max - dateRange.min) * (timeRange / 100);
    return new Set(
      gd.nodes.filter((n) => {
        if (courseFilter !== "all" && n.courseId !== courseFilter) return false;
        if (n.score != null && (n.score < scoreRange[0] || n.score > scoreRange[1])) return false;
        if (tagFilter && !n.tags.includes(tagFilter)) return false;
        // time filter — need createdAt, derive from mergedGraph
        const orig = mergedGraph?.nodes.find((mn) => mn.id === n.id);
        if (orig && new Date(orig.created_at).getTime() > cutoff) return false;
        return true;
      }).map((n) => n.id)
    );
  }, [gd, courseFilter, scoreRange, tagFilter, timeRange, dateRange, mergedGraph]);
  const visibleIdsRef = useRef(visibleIds);
  visibleIdsRef.current = visibleIds;

  /* ── Force setup ── */
  useLayoutEffect(() => {
    const fg = fgRef.current;
    if (!fg || gd.nodes.length === 0) return;
    try {
      const sp = nodeSpacingRef.current;
      const spV = sp / 50;
      const el = edgeLengthRef.current / 50;
      const visible = visibleIdsRef.current;

      fg.d3Force("charge", (forceManyBody as any)()
        .strength((node: GNode) => visible.has(node.id) ? -200 * spV * spV / Math.sqrt(el) : 0)
      );
      fg.d3Force("collide", forceCollide<GNode>()
        .radius((node: GNode) => visible.has(node.id) ? 5 + sp * 0.28 : 0)
        .strength(1).iterations(3)
      );
      const pullStr = 0.005 + Math.max(0, 0.035 * (1 - spV));
      fg.d3Force("pullX", (forceX as any)(0).strength(
        (node: GNode) => visible.has(node.id) ? pullStr : 0.5
      ));
      fg.d3Force("pullY", (forceY as any)(0).strength(
        (node: GNode) => visible.has(node.id) ? pullStr : 0.5
      ));
      fg.d3Force("center")?.strength(0.003);
      const vis = edgeVisRef.current;
      fg.d3Force("link")
        ?.iterations(20)
        .distance((link: GLink) => {
          if (link.type === "parent") return 10 + 110 * el;
          if (link.type === "link") return 15 + 130 * el;
          return 40 + 160 * el;
        })
        .strength((link: GLink) => {
          const sId = typeof link.source === "string" ? link.source : link.source.id;
          const tId = typeof link.target === "string" ? link.target : link.target.id;
          if (!visible.has(sId) || !visible.has(tId)) return 0;
          const k = link.type as keyof typeof vis;
          if (!vis[k]) return 0;
          if (link.type === "parent") return 0.99;
          if (link.type === "link") return 0.99;
          return 0.03;
        });
      fg.d3ReheatSimulation();
    } catch { /* force API may vary */ }
  }, [gd, nodeSpacing, edgeLength, visibleIds, showParentEdges, showLinkEdges, showSimilarEdges]);

  const onEngineStop = useCallback(() => {
    if (!fittedRef.current && fgRef.current && gd.nodes.length > 0) {
      fittedRef.current = true;
      fgRef.current.zoomToFit(300, 80);
    }
  }, [gd.nodes]);

  /* ── Panel loaders ── */
  const loadStudyPath = useCallback(async () => {
    if (panel === "path") { setPanel("none"); return; }
    setPathLoading(true); setPanel("path");
    try {
      const res = await api.get("/notes/unified-study-path");
      setStudyPath(res.data);
    } catch { setStudyPath({ path: [], weak_concepts: [] }); }
    setPathLoading(false);
  }, [panel]);

  const loadReport = useCallback(async () => {
    if (panel === "report") { setPanel("none"); return; }
    setReportLoading(true); setPanel("report");
    try { setReport((await api.get("/notes/unified-weekly-report")).data); }
    catch { setReport({ summary: "리포트를 생성하지 못했습니다." }); }
    setReportLoading(false);
  }, [panel]);

  /* ── Label collision avoidance ── */
  const labelRectsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const paintCountRef = useRef(0);

  function reserveLabel(cx: number, cy: number, w: number, h: number): { lx: number; ly: number } {
    const rects = labelRectsRef.current;
    let lx = cx, ly = cy;
    for (let attempt = 0; attempt < 5; attempt++) {
      const left = lx - w / 2, top = ly - h / 2;
      let overlap = false;
      for (const r of rects) {
        if (left < r.x + r.w && left + w > r.x && top < r.y + r.h && top + h > r.y) {
          overlap = true; break;
        }
      }
      if (!overlap) break;
      if (attempt % 2 === 0) ly += h + 2;
      else lx += (attempt % 4 < 2 ? 1 : -1) * (w * 0.6);
    }
    rects.push({ x: lx - w / 2, y: ly - h / 2, w, h });
    return { lx, ly };
  }

  /* ── Node paint (colored by course, score-bordered) ── */
  const paintNode = useCallback((node: GNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!visibleIdsRef.current.has(node.id)) return;
    const x = node.x, y = node.y;
    if (x == null || y == null || !isFinite(x) || !isFinite(y)) return;
    const gc = gColorsRef.current;

    const isHov = hovered?.id === node.id;
    const r = isHov ? node.size + 3 : node.size;
    const col = node.courseColor;

    // Hover glow
    if (isHov) {
      ctx.beginPath();
      ctx.arc(x, y, r + 10, 0, Math.PI * 2);
      ctx.fillStyle = col + "28";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = col + "40";
      ctx.fill();
    }

    // Score ring — bold, visible border showing understanding
    const scoreCol = scoreColor(node.score);
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = scoreCol + (gc.isDark ? "90" : "B0");
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Main circle (course color fill)
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = col + (gc.isDark ? "90" : "B0");
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.22, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = gc.nodeHighlight;
    ctx.fill();

    const showLbl = isHov || (showLabels && globalScale > 0.55);
    if (!showLbl) return;

    const fs = Math.min(10, Math.max(7, 9 / globalScale));
    ctx.font = `${isHov ? "600" : "400"} ${fs}px "Pretendard", -apple-system, system-ui, sans-serif`;
    const maxChars = isHov ? 24 : 14;
    const txt = node.title.length > maxChars ? node.title.slice(0, maxChars) + "\u2026" : node.title;
    const tw = ctx.measureText(txt).width;

    const px = 5, py = 2.5;
    const pillW = tw + px * 2;
    const pillH = fs + py * 2;
    const pillR = pillH / 2;
    const idealLy = y + r + fs * 0.5 + 6;
    const { lx, ly } = reserveLabel(x, idealLy, pillW, pillH);
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
      ctx.fillStyle = gc.labelBgHover;
      ctx.strokeStyle = col + "60";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = gc.labelBg;
      ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isHov ? gc.labelTextHover : gc.labelText;
    ctx.fillText(txt, lx, ly);
  }, [hovered, showLabels]);

  /* ── Link paint (matches NoteGraph) ── */
  const paintLink = useCallback((link: GLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const s = link.source as GNode, t = link.target as GNode;
    if (!isFinite(s.x!) || !isFinite(s.y!) || !isFinite(t.x!) || !isFinite(t.y!)) return;
    const visible = visibleIdsRef.current;
    if (!visible.has(s.id) || !visible.has(t.id)) return;

    // Edge type visibility
    const vis = edgeVisRef.current;
    if (link.type === "parent" && !vis.parent) return;
    if (link.type === "link" && !vis.link) return;
    if (link.type === "similar" && !vis.similar) return;

    const gc = gColorsRef.current;
    const lw = 1 / globalScale;

    if (link.type === "parent") {
      const mx = (s.x! + t.x!) / 2;
      const my = (s.y! + t.y!) / 2;
      const dx = t.x! - s.x!, dy = t.y! - s.y!;
      const dist = Math.sqrt(dx * dx + dy * dy + 1);
      const offset = Math.min(25, dist * 0.12);
      const cx = mx - dy * offset / dist;
      const cy = my + dx * offset / dist;

      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.quadraticCurveTo(cx, cy, t.x!, t.y!);
      ctx.strokeStyle = gc.parentGlow;
      ctx.lineWidth = Math.max(lw * 5, 5);
      ctx.setLineDash([]);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.quadraticCurveTo(cx, cy, t.x!, t.y!);
      ctx.strokeStyle = gc.parentCore;
      ctx.lineWidth = Math.max(lw * 1.8, 1.5);
      ctx.stroke();
    } else if (link.type === "link") {
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.strokeStyle = gc.linkGlow;
      ctx.lineWidth = Math.max(lw * 4, 4);
      ctx.setLineDash([]);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.strokeStyle = gc.linkCore;
      ctx.lineWidth = Math.max(lw * 1.2, 1);
      ctx.setLineDash([6 / globalScale, 4 / globalScale]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Similar — multi-layer glow (matches NoteGraph)
      const w = Math.min(link.weight || 2, 8);
      const t_norm = (w - 2) / 6;
      const thickness = 1.2 + t_norm * 1.5;
      const isWeak = w <= 2;
      const { simR: r, simG: g, simB: b } = gc;
      const coreOpacity = gc.simCoreBase + t_norm * gc.simCoreDelta;

      // Layer 1: wide soft glow
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.strokeStyle = `rgba(${r},${g},${b},${gc.simGlow1Base + t_norm * gc.simGlow1Delta})`;
      ctx.lineWidth = Math.max((thickness + 6) / globalScale, thickness + 5);
      ctx.setLineDash([]);
      ctx.stroke();

      // Layer 2: medium glow (weight >= 3)
      if (w >= 3) {
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.strokeStyle = `rgba(${r},${g},${b},${gc.simGlow2Base + t_norm * gc.simGlow2Delta})`;
        ctx.lineWidth = Math.max((thickness + 3) / globalScale, thickness + 2.5);
        ctx.setLineDash([]);
        ctx.stroke();
      }

      // Layer 3: bright inner glow (weight >= 5)
      if (w >= 5) {
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        const g3r = gc.isDark ? 232 : 180;
        const g3g = gc.isDark ? 121 : 50;
        const g3b = gc.isDark ? 249 : 210;
        ctx.strokeStyle = `rgba(${g3r},${g3g},${g3b},${gc.simGlow3Base + t_norm * gc.simGlow3Delta})`;
        ctx.lineWidth = Math.max((thickness + 1.5) / globalScale, thickness + 1);
        ctx.setLineDash([]);
        ctx.stroke();
      }

      // Core line
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.strokeStyle = `rgba(${r},${g},${b},${coreOpacity})`;
      ctx.lineWidth = Math.max(thickness / globalScale, thickness * 0.7);
      if (isWeak) {
        ctx.setLineDash([4 / globalScale, 5 / globalScale]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, []);

  /* ── Render ── */
  if (loading) return (
    <div className="graph-page" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--on-surface-variant, #64748b)" }}>통합 그래프를 불러오는 중...</div>
    </div>
  );

  if (error) return (
    <div className="graph-page" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#f87171", textAlign: "center" }}>{error}<br />
        <button className="btn btn-ghost" style={{ marginTop: 12 }}
          onClick={() => navigate("/all-notes")}>노트 목록으로</button>
      </div>
    </div>
  );

  return (
    <div className="graph-page">
      <header className="graph-header">
        <div className="graph-header-left">
          <button className="btn btn-ghost" onClick={() => navigate("/all-notes")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="graph-title">통합 노트 지도</h1>
          <span className="graph-count">{visibleIds.size}개</span>
        </div>
        <div className="graph-header-right">
          <button className={`graph-panel-btn${panel === "path" ? " active" : ""}`}
            onClick={loadStudyPath}>학습 경로</button>
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
          {/* Course legend / filter */}
          <div className="graph-legend">
            <h4>강의별 색상</h4>
            <div
              className="legend-row"
              style={{ cursor: "pointer", fontWeight: courseFilter === "all" ? 700 : 400 }}
              onClick={() => setCourseFilter("all")}
            >
              <span className="legend-dot" style={{ background: "var(--on-surface-variant)", width: 8, height: 8 }} /> 전체 ({gd.nodes.length})
            </div>
            {courses.map((c) => {
              const color = courseColorMap.get(c.id) || "#64748b";
              const count = gd.nodes.filter((n) => n.courseId === c.id).length;
              if (count === 0) return null;
              return (
                <div
                  key={c.id}
                  className="legend-row"
                  style={{ cursor: "pointer", fontWeight: courseFilter === c.id ? 700 : 400 }}
                  onClick={() => setCourseFilter(courseFilter === c.id ? "all" : c.id)}
                >
                  <span className="legend-dot" style={{ background: color }} /> {c.title} ({count})
                </div>
              );
            })}
          </div>
          <div className="graph-legend">
            <h4>이해도 (테두리)</h4>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#f87171" }} /> 0-39%</div>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#fbbf24" }} /> 40-59%</div>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#60a5fa" }} /> 60-79%</div>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#4ade80" }} /> 80-100%</div>
            <div className="legend-row"><span className="legend-dot" style={{ background: "#64748b" }} /> 미분석</div>
          </div>
          <div className="graph-legend">
            <h4>연결선</h4>
            <label className="edge-filter-chip">
              <input type="checkbox" checked={showParentEdges} onChange={(e) => setShowParentEdges(e.target.checked)} />
              <span className="edge-chip edge-chip-parent"><span className="edge-chip-line solid" />부모-자식</span>
            </label>
            <label className="edge-filter-chip">
              <input type="checkbox" checked={showLinkEdges} onChange={(e) => setShowLinkEdges(e.target.checked)} />
              <span className="edge-chip edge-chip-link"><span className="edge-chip-line dashed" />링크</span>
            </label>
            <label className="edge-filter-chip">
              <input type="checkbox" checked={showSimilarEdges} onChange={(e) => setShowSimilarEdges(e.target.checked)} />
              <span className="edge-chip edge-chip-similar"><span className="edge-chip-line similar" />유사</span>
            </label>
          </div>
          <div className="graph-filter">
            <label>점수: {scoreRange[0]}-{scoreRange[1]}%</label>
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
          <div className="graph-filter">
            <label>노드 간격</label>
            <input type="range" min={10} max={100} value={nodeSpacing}
              onChange={(e) => setNodeSpacing(+e.target.value)} />
            <div className="graph-filter-hint">{nodeSpacing < 30 ? "밀집" : nodeSpacing < 70 ? "보통" : "넓게"}</div>
          </div>
          <div className="graph-filter">
            <label>간선 간격</label>
            <input type="range" min={10} max={100} value={edgeLength}
              onChange={(e) => setEdgeLength(+e.target.value)} />
            <div className="graph-filter-hint">{edgeLength < 30 ? "짧게" : edgeLength < 70 ? "보통" : "길게"}</div>
          </div>
          <label className="graph-toggle-switch">
            <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            <span>이름 표시</span>
          </label>
        </div>

        {/* Canvas */}
        <div className="graph-canvas" ref={wrapRef} onContextMenu={(e) => {
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY, node: hovered });
        }}>
          <GraphErrorBoundary>
            {ready && dim.w > 0 && dim.h > 0 && (
              <ForceGraph2D
                ref={fgRef}
                width={dim.w}
                height={dim.h}
                graphData={gd}
                nodeId="id"
                nodeCanvasObject={(node: GNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  if (paintCountRef.current === 0) {
                    labelRectsRef.current = [];
                  }
                  paintCountRef.current = (paintCountRef.current + 1) % Math.max(1, gd.nodes.length);
                  paintNode(node, ctx, globalScale);
                }}
                nodePointerAreaPaint={(node: GNode, color: string, ctx: CanvasRenderingContext2D) => {
                  if (!visibleIdsRef.current.has(node.id)) return;
                  if (node.x == null || node.y == null) return;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, node.size + 6, 0, Math.PI * 2);
                  ctx.fillStyle = color;
                  ctx.fill();
                }}
                linkCanvasObject={paintLink}
                onNodeClick={(node: GNode) => {
                  navigate(`/courses/${node.courseId}/notes/${node.id}`);
                }}
                onNodeHover={(node: GNode | null) => setHovered(node)}
                onNodeDrag={(node: GNode) => { node.fx = node.x; node.fy = node.y; }}
                onNodeDragEnd={(node: GNode) => {
                  node.fx = undefined; node.fy = undefined;
                  fgRef.current?.d3ReheatSimulation();
                }}
                onEngineStop={onEngineStop}
                backgroundColor="transparent"
                warmupTicks={0}
                cooldownTicks={400}
                cooldownTime={8000}
                d3AlphaDecay={0.012}
                d3VelocityDecay={0.35}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                minZoom={0.15}
                maxZoom={6}
                nodeRelSize={1}
              />
            )}
          </GraphErrorBoundary>

          {/* Tooltip */}
          {hovered && (
            <div className="graph-tooltip" style={{
              left: mousePos.x + 14 + 260 > window.innerWidth ? mousePos.x - 260 - 8 : mousePos.x + 14,
              top: mousePos.y + 14 + 200 > window.innerHeight ? mousePos.y - 200 - 8 : mousePos.y + 14,
            }}>
              <div className="graph-tooltip-title">{hovered.title}</div>
              <div className="graph-tooltip-row">
                <span className="graph-tooltip-dot" style={{ background: hovered.courseColor }} />
                {hovered.courseName}
              </div>
              <div className="graph-tooltip-row">
                <span className="graph-tooltip-dot" style={{
                  background: hovered.score == null ? "#64748b"
                    : hovered.score >= 80 ? "#4ade80"
                    : hovered.score >= 60 ? "#fbbf24"
                    : hovered.score >= 40 ? "#60a5fa" : "#f87171"
                }} />
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

          {/* Context menu */}
          {ctxMenu && (
            <div className="graph-ctx-menu" ref={(el) => {
              if (!el) return;
              const rect = el.getBoundingClientRect();
              const vw = window.innerWidth, vh = window.innerHeight;
              let x = ctxMenu.x, y = ctxMenu.y;
              if (y + rect.height > vh - 8) y = vh - rect.height - 8;
              if (y < 8) y = 8;
              if (x + rect.width > vw - 8) x = vw - rect.width - 8;
              if (el.style.left !== `${x}px` || el.style.top !== `${y}px`) {
                el.style.left = `${x}px`;
                el.style.top = `${y}px`;
              }
            }} style={{ left: ctxMenu.x, top: ctxMenu.y }}
              onClick={(e) => e.stopPropagation()}>
              {ctxMenu.node ? (
                <>
                  <div className="graph-ctx-header">
                    <span className="graph-ctx-dot" style={{ background: ctxMenu.node.courseColor }} />
                    {ctxMenu.node.title.length > 20 ? ctxMenu.node.title.slice(0, 20) + "..." : ctxMenu.node.title}
                  </div>
                  <button className="graph-ctx-item" onClick={() => { navigate(`/courses/${ctxMenu.node!.courseId}/notes/${ctxMenu.node!.id}`); setCtxMenu(null); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    노트 열기
                  </button>
                  <button className="graph-ctx-item" onClick={() => {
                    const n = ctxMenu.node!;
                    n.fx = n.x; n.fy = n.y;
                    setCtxMenu(null);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    위치 고정
                  </button>
                  <button className="graph-ctx-item" onClick={() => {
                    const n = ctxMenu.node!;
                    n.fx = undefined; n.fy = undefined;
                    fgRef.current?.d3ReheatSimulation();
                    setCtxMenu(null);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                    고정 해제
                  </button>
                  <div className="graph-ctx-divider" />
                  <button className="graph-ctx-item" onClick={() => {
                    fgRef.current?.centerAt(ctxMenu.node!.x, ctxMenu.node!.y, 400);
                    fgRef.current?.zoom(3, 400);
                    setCtxMenu(null);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    이 노트에 집중
                  </button>
                  <button className="graph-ctx-item" onClick={() => {
                    setCourseFilter(ctxMenu.node!.courseId === courseFilter ? "all" : ctxMenu.node!.courseId);
                    setCtxMenu(null);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    {ctxMenu.node!.courseId === courseFilter ? "전체 강의 보기" : `${ctxMenu.node!.courseName}만 보기`}
                  </button>
                </>
              ) : (
                <>
                  <button className="graph-ctx-item" onClick={() => {
                    fittedRef.current = false;
                    fgRef.current?.zoomToFit(300, 80);
                    setCtxMenu(null);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    전체 보기
                  </button>
                  <button className="graph-ctx-item" onClick={() => {
                    gd.nodes.forEach((n) => { n.fx = undefined; n.fy = undefined; });
                    fgRef.current?.d3ReheatSimulation();
                    setCtxMenu(null);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    레이아웃 초기화
                  </button>
                  <div className="graph-ctx-divider" />
                  <button className="graph-ctx-item" onClick={() => { setShowLabels(!showLabels); setCtxMenu(null); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    이름 {showLabels ? "숨기기" : "표시"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Side panel — study path / weekly report */}
        {panel !== "none" && (
          <div className="graph-side-panel">
            <button className="graph-panel-close" onClick={() => setPanel("none")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {panel === "path" && (
              <>
                <h3 className="panel-title">통합 학습 경로</h3>
                <p className="panel-desc">모든 강의를 종합한 맞춤 학습 추천</p>
                {pathLoading ? <div className="panel-loading">분석 중...</div> : studyPath && (
                  <>
                    {/* Weak concepts */}
                    {studyPath.weak_concepts?.length > 0 && (
                      <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                        <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#ef4444" }}>취약 개념</h4>
                        {studyPath.weak_concepts.map((c: any) => (
                          <div key={c.concept} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", fontSize: 12 }}>
                            <span style={{ color: "var(--on-surface)" }}>{c.concept}</span>
                            <span style={{ color: scoreColor(c.avg_score), fontWeight: 600, fontSize: 11 }}>평균 {c.avg_score}% ({c.note_count}개)</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Study path list */}
                    <div className="study-path-list">
                      {(studyPath.path || []).map((it: any, i: number) => (
                        <div key={it.id} className={`study-path-item priority-${it.priority}`}
                          onClick={() => navigate(`/courses/${it.course_id}/notes/${it.id}`)}>
                          <span className="study-path-num">{i + 1}</span>
                          <div className="study-path-info">
                            <div className="study-path-title">{it.title}</div>
                            <div className="study-path-reason">{it.reason}</div>
                          </div>
                          {it.score != null && <span className="study-path-score" style={{ color: scoreColor(it.score) }}>{it.score}%</span>}
                        </div>
                      ))}
                      {!(studyPath.path || []).length && <div className="panel-empty">노트가 없습니다</div>}
                    </div>
                  </>
                )}
              </>
            )}
            {panel === "report" && (
              <>
                <h3 className="panel-title">통합 주간 리포트</h3>
                {reportLoading ? <div className="panel-loading">생성 중...</div> : report && (
                  <div className="weekly-report">
                    <div className="report-period">{report.period}</div>
                    <div className="report-stats">
                      <div className="report-stat"><span className="report-stat-num">{report.total_notes}</span><span className="report-stat-label">전체</span></div>
                      <div className="report-stat"><span className="report-stat-num">{report.new_notes}</span><span className="report-stat-label">이번 주</span></div>
                      <div className="report-stat"><span className="report-stat-num">{report.avg_score ?? "–"}%</span><span className="report-stat-label">평균</span></div>
                    </div>
                    {/* Per-course breakdown */}
                    {report.courses?.length > 0 && (
                      <div style={{ margin: "12px 0", padding: "10px 12px", borderRadius: 10, background: "var(--surface-container, rgba(0,0,0,0.03))" }}>
                        <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)" }}>강의별 현황</h4>
                        {report.courses.map((cs: any) => (
                          <div key={cs.course_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12 }}>
                            <span style={{ color: "var(--on-surface)", fontWeight: 500 }}>
                              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: courseColorMap.get(cs.course_id) || "#64748b", marginRight: 6 }} />
                              {cs.course_name}
                            </span>
                            <span style={{ color: "var(--on-surface-variant)", fontSize: 11 }}>
                              {cs.total}개 · {cs.new > 0 ? `+${cs.new}` : "0"} · {cs.avg_score != null ? <span style={{ color: scoreColor(cs.avg_score), fontWeight: 600 }}>{cs.avg_score}%</span> : "–"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {report.weakest_notes?.length > 0 && (
                      <div className="report-weak">
                        <h4>보완 필요</h4>
                        {report.weakest_notes.map((n: any) => (
                          <div key={n.id} className="report-weak-item" onClick={() => navigate(`/courses/${n.course_id}/notes/${n.id}`)}>
                            <div>
                              <span>{n.title}</span>
                              <div style={{ fontSize: 10, color: "var(--on-surface-variant)", marginTop: 1 }}>{n.course_name}</div>
                            </div>
                            <span style={{ color: scoreColor(n.score) }}>{n.score}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="report-summary rendered-markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(report.summary || "") }} />
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
