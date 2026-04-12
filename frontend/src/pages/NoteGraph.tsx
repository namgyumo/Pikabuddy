import React, { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo, Component } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ForceGraph2DImport from "react-force-graph-2d";
import { forceCollide, forceX, forceY, forceManyBody } from "d3-force";
import api from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import type { Course, GraphData } from "../types";

const ForceGraph2D = (ForceGraph2DImport as any).default || ForceGraph2DImport;

/* ── Theme-aware graph color palette ── */
function parseColorLuminance(color: string): number {
  // Parse hex or rgb/rgba to get relative luminance (0=black, 1=white)
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
  const primary = cs.getPropertyValue("--primary").trim() || "#004AC6";
  const outlineVar = cs.getPropertyValue("--outline-variant").trim() || "rgba(68,71,79,0.15)";
  const surfaceLow = cs.getPropertyValue("--surface-container-low").trim() || surface;
  const surfaceHigh = cs.getPropertyValue("--surface-container-high").trim() || surface;

  const isDark = parseColorLuminance(surface) < 0.4;

  // Edge colors — high contrast for both themes
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

  // Node colors
  const nodeStroke = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
  const nodeStrokeRoot = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";
  const nodeHighlight = isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.35)";
  const rootRingAlpha = isDark ? "40" : "30";

  // Label colors
  const labelBg = isDark ? "rgba(15,23,42,0.75)" : "rgba(255,255,255,0.88)";
  const labelBgRoot = isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.94)";
  const labelBgHover = isDark ? "rgba(30,41,59,0.95)" : "rgba(255,255,255,0.97)";
  const labelText = isDark ? "rgba(203,213,225,0.8)" : onSurfaceVar;
  const labelTextRoot = isDark ? "#e2e8f0" : onSurface;
  const labelTextHover = isDark ? "#f8fafc" : onSurface;
  const labelBorderAlpha = "60";

  return {
    isDark, surface, onSurface, onSurfaceVar, primary, outlineVar, surfaceLow, surfaceHigh,
    parentCore, parentGlow, linkCore, linkGlow,
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
  componentDidCatch(e: Error) { console.error("[NoteGraph]", e); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--on-surface-variant, #64748b)" }}>
        그래프 렌더링 오류<br />
        <span style={{ fontSize: 11, color: "var(--on-surface-variant, #475569)" }}>{this.state.msg}</span><br />
        <button style={{ marginTop: 12, padding: "6px 16px", borderRadius: 6, border: "1px solid var(--outline-variant, #334155)", background: "transparent", color: "var(--on-surface-variant, #94a3b8)", cursor: "pointer" }}
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
  categories: string[];
  parentId: string | null;
  hasChildren: boolean;
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
  weight?: number;
}

function scoreColor(s: number | null) {
  if (s == null) return "#64748b";
  if (s < 40) return "#f87171";
  if (s < 60) return "#fbbf24";
  if (s < 80) return "#60a5fa";
  return "#4ade80";
}

function scoreEmoji(s: number | null) {
  if (s == null) return "\u{1F4DD}";
  if (s < 40) return "\u{1F534}";
  if (s < 60) return "\u{1F7E1}";
  if (s < 80) return "\u{1F535}";
  return "\u{1F7E2}";
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

  // Theme-aware graph colors — re-read on CSS variable changes
  const [gColors, setGColors] = useState<GraphColorPalette>(getGraphColors);
  const gColorsRef = useRef(gColors);
  gColorsRef.current = gColors;
  useEffect(() => {
    const refresh = () => { const c = getGraphColors(); setGColors(c); gColorsRef.current = c; };
    // Observe style attribute changes on <html> (theme switches)
    const mo = new MutationObserver(refresh);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });
    return () => mo.disconnect();
  }, []);
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);

  // Filters
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [tagFilter, setTagFilter] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [timeRange, setTimeRange] = useState(100);
  const [nodeSpacing, setNodeSpacing] = useState(50); // 0~100 : unconnected repulsion
  const [edgeLength, setEdgeLength] = useState(50);  // 0~100 : connected edge distance

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; node: GNode | null } | null>(null);

  // Linking mode
  const [linkingFrom, setLinkingFrom] = useState<GNode | null>(null);
  // 링크 해제 하이라이트 (hover/click 시 간선 깜빡임)
  const [highlightLink, setHighlightLink] = useState<{ s: string; t: string } | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkSearchOpen, setLinkSearchOpen] = useState(false);

  // Edge type filters
  const [showParentEdges, setShowParentEdges] = useState(true);
  const [showLinkEdges, setShowLinkEdges] = useState(true);
  const [showSimilarEdges, setShowSimilarEdges] = useState(true);

  // Set of node IDs that have structural edge (parent/link)
  const connectedNodeIds = useRef(new Set<string>());
  // Set of "id1|id2" pairs that have parent/link edges (to suppress duplicate similar edges)
  const structuralPairs = useRef(new Set<string>());

  // Refs so force functions always read latest slider values without re-registration
  const nodeSpacingRef = useRef(nodeSpacing);
  const edgeLengthRef = useRef(edgeLength);
  nodeSpacingRef.current = nodeSpacing;
  edgeLengthRef.current = edgeLength;

  // Panels
  const [studyPath, setStudyPath] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [panel, setPanel] = useState<"none" | "path" | "report">("none");

  const fittedRef = useRef(false);
  const prevNodesRef = useRef<GNode[]>([]);

  /* ── data ── */
  useEffect(() => {
    if (!courseId) return;
    let on = true;
    (async () => {
      // Fire all requests in parallel
      const [courseRes, graphRes, pathRes] = await Promise.all([
        api.get(`/courses/${courseId}`).catch(() => null),
        api.get(`/courses/${courseId}/notes/graph`).catch(() => null),
        api.get(`/courses/${courseId}/study-path`).catch(() => null),
      ]);
      if (!on) return;
      if (courseRes) setCourse(courseRes.data);
      if (pathRes) setStudyPath(pathRes.data);
      if (graphRes) {
        setGraphData(graphRes.data);
      } else {
        // fallback to notes list
        try {
          const r = await api.get(`/courses/${courseId}/notes`);
          if (on) {
            const nodes = r.data.map((n: any) => ({
              id: n.id, title: n.title, parent_id: n.parent_id,
              understanding_score: n.understanding_score, tags: [],
              categories: n.categories || [],
              updated_at: n.updated_at, created_at: n.created_at, content_length: 100,
            }));
            const edges = r.data.filter((n: any) => n.parent_id).map((n: any) => ({
              source: n.parent_id, target: n.id, type: "parent" as const,
            }));
            setGraphData({ nodes, edges });
          }
        } catch { if (on) setError("노트를 불러올 수 없습니다."); }
      }
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

  /* ── close context menu on click anywhere ── */
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => { setCtxMenu(null); setHighlightLink(null); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [ctxMenu]);

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

  /* ── mapped graph data (structural only — NO filtering) ── */
  const gd = useMemo(() => {
    if (!graphData) return { nodes: [] as GNode[], links: [] as GLink[] };
    const allNodes = graphData.nodes;
    const ids = new Set(allNodes.map((n) => n.id));

    // Compute depth for each node (root=0, child=1, grandchild=2, ...)
    const parentMap = new Map<string, string | null>();
    allNodes.forEach((n) => parentMap.set(n.id, ids.has(n.parent_id ?? "") ? n.parent_id : null));
    const depthMap = new Map<string, number>();
    const childCountMap = new Map<string, number>();
    const getDepth = (id: string): number => {
      if (depthMap.has(id)) return depthMap.get(id)!;
      const pid = parentMap.get(id);
      const d = pid ? getDepth(pid) + 1 : 0;
      depthMap.set(id, d);
      return d;
    };
    allNodes.forEach((n) => getDepth(n.id));
    allNodes.forEach((n) => {
      const pid = parentMap.get(n.id);
      if (pid) childCountMap.set(pid, (childCountMap.get(pid) || 0) + 1);
    });

    // Node size by content length (글자수)
    const contentLengths = allNodes.map((n) => n.content_length || 0);
    const maxLen = Math.max(...contentLengths, 1);
    const sizeByContent = (contentLength: number) => {
      // min 7, max 24 — log scale so small notes aren't invisible
      const t = Math.log(1 + contentLength) / Math.log(1 + maxLen); // 0..1
      return 7 + t * 17;
    };

    // Tree-based initial positions (BFS layout)
    const rootIds = allNodes.filter((n) => !parentMap.get(n.id)).map((n) => n.id);
    const childrenMap = new Map<string, string[]>();
    allNodes.forEach((n) => {
      const pid = parentMap.get(n.id);
      if (pid) childrenMap.set(pid, [...(childrenMap.get(pid) || []), n.id]);
    });
    const initPos = new Map<string, { x: number; y: number }>();
    const layerGap = 140;
    const sibGap = 120;
    // Place each root tree separately
    let treeOffsetX = 0;
    rootIds.forEach((rootId) => {
      // BFS to compute subtree sizes
      const subtreeSize = new Map<string, number>();
      const bfsOrder: string[] = [];
      const queue = [rootId];
      while (queue.length) {
        const id = queue.shift()!;
        bfsOrder.push(id);
        (childrenMap.get(id) || []).forEach((c) => queue.push(c));
      }
      for (let i = bfsOrder.length - 1; i >= 0; i--) {
        const id = bfsOrder[i];
        const ch = childrenMap.get(id) || [];
        subtreeSize.set(id, ch.length === 0 ? 1 : ch.reduce((s, c) => s + (subtreeSize.get(c) || 1), 0));
      }
      const treeW = (subtreeSize.get(rootId) || 1) * sibGap;
      const placeNode = (id: string, cx: number, cy: number) => {
        initPos.set(id, { x: cx, y: cy });
        const ch = childrenMap.get(id) || [];
        if (ch.length === 0) return;
        const totalW = ch.reduce((s, c) => s + (subtreeSize.get(c) || 1), 0) * sibGap;
        let left = cx - totalW / 2;
        ch.forEach((c) => {
          const w = (subtreeSize.get(c) || 1) * sibGap;
          placeNode(c, left + w / 2, cy + layerGap);
          left += w;
        });
      };
      placeNode(rootId, treeOffsetX + treeW / 2, 0);
      treeOffsetX += treeW + 200;
    });

    // Preserve positions from previous simulation (d3 mutates x/y in place)
    const posMap = new Map<string, { x: number; y: number }>();
    prevNodesRef.current.forEach((pn) => {
      if (pn.x != null && pn.y != null && isFinite(pn.x) && isFinite(pn.y)) {
        posMap.set(pn.id, { x: pn.x, y: pn.y });
      }
    });

    const nodes = allNodes.map((n, i): GNode => {
      const pid = parentMap.get(n.id);
      const existing = posMap.get(n.id);
      let x: number, y: number;
      if (existing) {
        x = existing.x; y = existing.y;
      } else {
        const treePos = initPos.get(n.id);
        if (treePos) {
          x = treePos.x; y = treePos.y;
        } else {
          // Orphan node fallback
          x = Math.cos(i * 2.4) * 300 + (Math.random() - 0.5) * 60;
          y = Math.sin(i * 2.4) * 300 + (Math.random() - 0.5) * 60;
        }
      }
      return {
        id: n.id, title: n.title, score: n.understanding_score,
        tags: n.tags, categories: n.categories || [],
        parentId: pid ?? null,
        hasChildren: (childCountMap.get(n.id) || 0) > 0,
        size: sizeByContent(n.content_length || 0),
        createdAt: n.created_at, updatedAt: n.updated_at,
        x, y,
      };
    });
    prevNodesRef.current = nodes;

    return {
      nodes,
      links: (() => {
        const links = graphData.edges
          .filter((e) => ids.has(e.source) && ids.has(e.target))
          .map((e): GLink => ({ source: e.source, target: e.target, type: e.type, weight: e.weight }));
        const connected = new Set<string>();
        const structural = new Set<string>();
        links.forEach((l) => {
          const sId = typeof l.source === "string" ? l.source : l.source.id;
          const tId = typeof l.target === "string" ? l.target : l.target.id;
          if (l.type === "parent" || l.type === "link") {
            connected.add(sId);
            connected.add(tId);
            structural.add([sId, tId].sort().join("|"));
          }
        });
        connectedNodeIds.current = connected;
        structuralPairs.current = structural;
        return links;
      })(),
    };
  }, [graphData]);

  /* ── visible node IDs (filter changes DON'T rebuild graphData → no simulation restart) ── */
  const visibleIds = useMemo(() => {
    if (!graphData) return new Set<string>();
    const cutoff = dateRange.min + (dateRange.max - dateRange.min) * (timeRange / 100);
    return new Set(
      graphData.nodes
        .filter((n) => {
          if (new Date(n.created_at).getTime() > cutoff) return false;
          const s = n.understanding_score;
          if (s != null && (s < scoreRange[0] || s > scoreRange[1])) return false;
          if (tagFilter && !n.tags.includes(tagFilter)) return false;
          return true;
        })
        .map((n) => n.id)
    );
  }, [graphData, scoreRange, tagFilter, timeRange, dateRange]);

  const visibleIdsRef = useRef(visibleIds);
  visibleIdsRef.current = visibleIds;

  // Edge visibility ref (read by force strength + paintLink)
  const edgeVisRef = useRef({ parent: true, link: true, similar: true });
  edgeVisRef.current = { parent: showParentEdges, link: showLinkEdges, similar: showSimilarEdges };

  // Hover 시 연결된 노드 집합 계산 — 현재 보이는 간선 타입만 고려
  const hoverNeighbors = useMemo(() => {
    if (!hovered || !gd.links.length) return null;
    const neighbors = new Set<string>();
    neighbors.add(hovered.id);
    const vis = { parent: showParentEdges, link: showLinkEdges, similar: showSimilarEdges };
    for (const l of gd.links) {
      // 비활성 간선 타입은 무시
      if (l.type === "parent" && !vis.parent) continue;
      if (l.type === "link" && !vis.link) continue;
      if (l.type === "similar" && !vis.similar) continue;
      // 유사도 간선이면서 같은 쌍에 structural edge가 보이면 무시
      if (l.type === "similar") {
        const sId = typeof l.source === "string" ? l.source : l.source.id;
        const tId = typeof l.target === "string" ? l.target : l.target.id;
        if (structuralPairs.current.has([sId, tId].sort().join("|")) && (vis.parent || vis.link)) continue;
      }
      const sId = typeof l.source === "string" ? l.source : l.source.id;
      const tId = typeof l.target === "string" ? l.target : l.target.id;
      if (sId === hovered.id) neighbors.add(tId);
      if (tId === hovered.id) neighbors.add(sId);
    }
    return neighbors;
  }, [hovered, gd.links, showParentEdges, showLinkEdges, showSimilarEdges]);
  const hoverNeighborsRef = useRef(hoverNeighbors);
  hoverNeighborsRef.current = hoverNeighbors;
  const hoveredIdRef = useRef<string | null>(null);
  hoveredIdRef.current = hovered?.id ?? null;

  const highlightLinkRef = useRef(highlightLink);
  highlightLinkRef.current = highlightLink;

  // 하이라이트 깜빡임을 위한 캔버스 리페인트 루프
  const [, setBlinkTick] = useState(0);
  useEffect(() => {
    if (!highlightLink) return;
    const iv = setInterval(() => setBlinkTick((t) => t + 1), 50);
    return () => clearInterval(iv);
  }, [highlightLink]);

  // ── Force 설정 ──
  // 시뮬레이션 테스트 검증 (8노드 트리):
  //   sp 10→100: 전체거리 161→337 (2.09x), 간선 160→161 (0.6% 커플링)
  //   el 10→100: 간선 104→230 (2.2x), sp와 독립
  //   sp=100 el=10: 간선=106 (target=104) → 완벽 독립
  //
  // charge(sp) + collision(sp) → 노드 간격
  // link(str=0.99, iter=20) → 간선 간격 (charge를 완전 차단)
  // useLayoutEffect: 첫 paint 전에 force 설정 → 기본 d3 force로 트리 배치 망가지는 것 방지
  useLayoutEffect(() => {
    const fg = fgRef.current;
    if (!fg || gd.nodes.length === 0) return;
    try {
      const sp = nodeSpacingRef.current;       // 10 ~ 100
      const spV = sp / 50;                     // 0.2 ~ 2.0
      const el = edgeLengthRef.current / 50;   // 0.2 ~ 2.0
      const vis = edgeVisRef.current;
      const visible = visibleIdsRef.current;

      // 노드 간격: charge + collision (sp 연동)
      fg.d3Force("charge", (forceManyBody as any)()
        .strength((node: GNode) => visible.has(node.id) ? -200 * spV * spV / Math.sqrt(el) : 0)
      );
      fg.d3Force("repulsion", null);

      fg.d3Force("collide", forceCollide<GNode>()
        .radius((node: GNode) => visible.has(node.id) ? 5 + sp * 0.28 : 0)
        .strength(1).iterations(3)
      );

      // Pull: sp 낮으면 강하게 당겨서 수축, sp 높으면 약하게
      const pullStr = 0.005 + Math.max(0, 0.035 * (1 - spV));
      fg.d3Force("pullX", (forceX as any)(0).strength(
        (node: GNode) => visible.has(node.id) ? pullStr : 0.5
      ));
      fg.d3Force("pullY", (forceY as any)(0).strength(
        (node: GNode) => visible.has(node.id) ? pullStr : 0.5
      ));
      fg.d3Force("center")?.strength(0.003);

      // 간선 간격: link (str=0.99, iter=20 → charge 영향 차단)
      // link target 최소(10+110*0.2=32) — collision보다 짧을 수 있으나 link(str=0.99,iter=20)가 우선
      fg.d3Force("link")
        ?.iterations(12)
        .distance((link: GLink) => {
          if (link.type === "parent") return 60 + 140 * el; // 최소60, 최대~340
          if (link.type === "link") return 80 + 180 * el;   // 최소80, 최대~440
          // 유사도 간선: weight 높으면 짧고, weight 낮으면 길게
          const w = (link as any).weight || 5;
          const wNorm = (10 - w) / 8; // w=2→1, w=10→0
          return (120 + 380 * wNorm) * el;
        })
        .strength((link: GLink) => {
          const sId = typeof link.source === "string" ? link.source : link.source.id;
          const tId = typeof link.target === "string" ? link.target : link.target.id;
          if (!visible.has(sId) || !visible.has(tId)) return 0;
          const k = link.type as keyof typeof vis;
          if (!vis[k]) return 0;
          // 부모/링크: 유연하게 (목표 거리 중심으로 자유 배치)
          if (link.type === "parent") return 0.3;
          if (link.type === "link") return 0.25;
          return 0.03;
        });

      fg.d3ReheatSimulation();
    } catch { /* force API may vary */ }
  }, [gd, nodeSpacing, edgeLength, showParentEdges, showLinkEdges, showSimilarEdges, visibleIds]);

  /* ── zoom to fit after engine settles ── */
  const onEngineStop = useCallback(() => {
    if (!fittedRef.current && fgRef.current && gd.nodes.length > 0) {
      fittedRef.current = true;
      fgRef.current.zoomToFit(300, 80);
    }
  }, [gd.nodes]);

  /* ── label collision avoidance ── */
  const labelRectsRef = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const paintCountRef = useRef(0);

  function reserveLabel(cx: number, cy: number, w: number, h: number): { lx: number; ly: number } {
    const rects = labelRectsRef.current;
    let lx = cx, ly = cy;
    // Try original position, then nudge down, then left/right
    for (let attempt = 0; attempt < 5; attempt++) {
      const left = lx - w / 2, top = ly - h / 2;
      let overlap = false;
      for (const r of rects) {
        if (left < r.x + r.w && left + w > r.x && top < r.y + r.h && top + h > r.y) {
          overlap = true;
          break;
        }
      }
      if (!overlap) break;
      // Nudge: alternate between down and sideways
      if (attempt % 2 === 0) ly += h + 2;
      else lx += (attempt % 4 < 2 ? 1 : -1) * (w * 0.6);
    }
    rects.push({ x: lx - w / 2, y: ly - h / 2, w, h });
    return { lx, ly };
  }

  /* ── node paint ── */
  const paintNode = useCallback((node: GNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!visibleIdsRef.current.has(node.id)) return; // hidden by filter
    const x = node.x, y = node.y;
    if (x == null || y == null || !isFinite(x) || !isFinite(y)) return;
    const gc = gColorsRef.current;

    const hn = hoverNeighborsRef.current;
    const isDimmed = hn != null && !hn.has(node.id);
    if (isDimmed) { ctx.globalAlpha = 0.15; }

    const isHov = hovered?.id === node.id;
    const isParent = node.hasChildren;
    const r = isHov ? node.size + 3 : node.size;
    const col = scoreColor(node.score);

    // soft glow behind hovered node
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

    // Parent nodes (have children): double ring for hierarchy
    if (isParent && !isHov) {
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = col + "50";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // main circle — score color border is now bold and visible
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    // Thick score-colored border for visibility
    ctx.strokeStyle = col + (gc.isDark ? "A0" : "C0");
    ctx.lineWidth = isParent ? 4 : 3;
    ctx.stroke();

    // inner highlight (gives depth)
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.22, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = gc.nodeHighlight;
    ctx.fill();

    // label
    const showLbl = isHov || (showLabels && globalScale > 0.55);
    if (!showLbl) { if (isDimmed) ctx.globalAlpha = 1; return; }

    const fs = Math.min(isParent ? 12 : 10, Math.max(7, (isParent ? 11 : 9) / globalScale));
    ctx.font = `${isHov || isParent ? "600" : "400"} ${fs}px "Pretendard", -apple-system, system-ui, sans-serif`;
    const maxChars = isHov ? 24 : isParent ? 18 : 12;
    const txt = node.title.length > maxChars ? node.title.slice(0, maxChars) + "…" : node.title;
    const tw = ctx.measureText(txt).width;

    // pill-shaped label background with collision avoidance
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
      ctx.strokeStyle = col + gc.labelBorderAlpha;
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = isParent ? gc.labelBgRoot : gc.labelBg;
      ctx.fill();
    }

    // label text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isHov ? gc.labelTextHover : isParent ? gc.labelTextRoot : gc.labelText;
    ctx.fillText(txt, lx, ly);
    if (isDimmed) { ctx.globalAlpha = 1; }
  }, [hovered, showLabels]);

  /* ── link paint (theme-aware) ── */
  const paintLink = useCallback((link: GLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const s = link.source as GNode, t = link.target as GNode;
    if (!isFinite(s.x!) || !isFinite(s.y!) || !isFinite(t.x!) || !isFinite(t.y!)) return;

    // hidden 노드 포함 간선 → 안 그림
    const visible = visibleIdsRef.current;
    if (!visible.has(s.id) || !visible.has(t.id)) return;

    // 숨긴 간선 타입 → 안 그림
    const vis = edgeVisRef.current;
    if (link.type === "parent" && !vis.parent) return;
    if (link.type === "link" && !vis.link) return;
    if (link.type === "similar" && !vis.similar) return;

    // 유사도 간선인데, 같은 쌍에 parent/link가 활성화되어 있으면 숨김
    if (link.type === "similar") {
      const pairKey = [s.id, t.id].sort().join("|");
      if (structuralPairs.current.has(pairKey) && (vis.parent || vis.link)) return;
    }

    const gc = gColorsRef.current;
    const lw = 1 / globalScale;

    // Hover dimming: 호버된 노드에 직접 연결된 간선만 밝게, 나머지 모두 dim
    const hn = hoverNeighborsRef.current;
    const hovId = hoveredIdRef.current;
    const isDirectEdge = hovId != null && (s.id === hovId || t.id === hovId);
    const linkDimmed = hn != null && !isDirectEdge;
    if (linkDimmed) { ctx.globalAlpha = 0.08; }

    if (link.type === "parent") {
      // Cyan curved line
      const mx = (s.x! + t.x!) / 2;
      const my = (s.y! + t.y!) / 2;
      const dx = t.x! - s.x!, dy = t.y! - s.y!;
      const dist = Math.sqrt(dx * dx + dy * dy + 1);
      const offset = Math.min(25, dist * 0.12);
      const cx = mx - dy * offset / dist;
      const cy = my + dx * offset / dist;

      // Outer glow
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.quadraticCurveTo(cx, cy, t.x!, t.y!);
      ctx.strokeStyle = gc.parentGlow;
      ctx.lineWidth = Math.max(lw * 5, 5);
      ctx.setLineDash([]);
      ctx.stroke();

      // Core line
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.quadraticCurveTo(cx, cy, t.x!, t.y!);
      ctx.strokeStyle = gc.parentCore;
      ctx.lineWidth = Math.max(lw * 1.8, 1.5);
      ctx.stroke();

    } else if (link.type === "link") {
      // Amber dashed
      // Outer glow
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.strokeStyle = gc.linkGlow;
      ctx.lineWidth = Math.max(lw * 4, 4);
      ctx.setLineDash([]);
      ctx.stroke();

      // Core
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.strokeStyle = gc.linkCore;
      ctx.lineWidth = Math.max(lw * 1.2, 1);
      ctx.setLineDash([6 / globalScale, 4 / globalScale]);
      ctx.stroke();
      ctx.setLineDash([]);

    } else {
      // Similar — weight (1~10) → thickness, opacity, glow intensity
      const w = Math.min(Math.max(link.weight || 1, 1), 10);
      const t_norm = (w - 1) / 9; // 0..1 normalized
      const thickness = 0.8 + t_norm * 2.5; // 0.8px ~ 3.3px
      const isWeak = w <= 3;

      const { simR: r, simG: g, simB: b } = gc;
      // opacity ramps more aggressively with weight
      const coreOpacity = 0.2 + t_norm * 0.65; // 0.2 ~ 0.85

      // Layer 1: wide soft glow (only for weight >= 4)
      if (w >= 4) {
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.05 + t_norm * 0.15})`;
        ctx.lineWidth = Math.max((thickness + 6) / globalScale, thickness + 5);
        ctx.setLineDash([]);
        ctx.stroke();
      }

      // Layer 2: medium glow (weight >= 6)
      if (w >= 6) {
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.1 + t_norm * 0.2})`;
        ctx.lineWidth = Math.max((thickness + 3) / globalScale, thickness + 2.5);
        ctx.setLineDash([]);
        ctx.stroke();
      }

      // Layer 3: bright inner glow (weight >= 8)
      if (w >= 8) {
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        const g3r = gc.isDark ? 232 : 180;
        const g3g = gc.isDark ? 121 : 50;
        const g3b = gc.isDark ? 249 : 210;
        ctx.strokeStyle = `rgba(${g3r},${g3g},${g3b},${0.2 + t_norm * 0.25})`;
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
        ctx.setLineDash([3 / globalScale, 6 / globalScale]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 링크 해제 하이라이트: 밝은 깜빡임 효과
    const hl = highlightLinkRef.current;
    if (hl && link.type === "link") {
      const sId = s.id, tId = t.id;
      if ((sId === hl.s && tId === hl.t) || (sId === hl.t && tId === hl.s)) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 150); // 빠른 깜빡임
        ctx.save();
        // 넓은 글로우
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.strokeStyle = `rgba(255,100,100,${0.15 + pulse * 0.35})`;
        ctx.lineWidth = Math.max(8 / globalScale, 8);
        ctx.setLineDash([]);
        ctx.stroke();
        // 밝은 코어
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.strokeStyle = `rgba(255,180,180,${0.4 + pulse * 0.6})`;
        ctx.lineWidth = Math.max(3 / globalScale, 3);
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (linkDimmed) { ctx.globalAlpha = 1; }
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
      <div style={{ color: "var(--on-surface-variant, #64748b)" }}>그래프를 불러오는 중...</div>
    </div>
  );

  if (error) return (
    <div className="graph-page" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#f87171", textAlign: "center" }}>{error}<br />
        <button className="btn btn-ghost" style={{ marginTop: 12, color: "var(--on-surface-variant, #94a3b8)" }}
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
          <span className="graph-count">{visibleIds.size}개</span>
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
            <label className="edge-filter-chip">
              <input type="checkbox" checked={showParentEdges} onChange={(e) => setShowParentEdges(e.target.checked)} />
              <span className="edge-chip edge-chip-parent"><span className="edge-chip-line solid" />{"\uBD80\uBAA8-\uC790\uC2DD"}</span>
            </label>
            <label className="edge-filter-chip">
              <input type="checkbox" checked={showLinkEdges} onChange={(e) => setShowLinkEdges(e.target.checked)} />
              <span className="edge-chip edge-chip-link"><span className="edge-chip-line dashed" />{"\uB9C1\uD06C"}</span>
            </label>
            <label className="edge-filter-chip">
              <input type="checkbox" checked={showSimilarEdges} onChange={(e) => setShowSimilarEdges(e.target.checked)} />
              <span className="edge-chip edge-chip-similar"><span className="edge-chip-line similar" />{"\uC720\uC0AC"}</span>
            </label>
          </div>
          <div className="graph-filter">
            <label>{"\uC810\uC218"}: {scoreRange[0]}–{scoreRange[1]}%</label>
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
            <label>{"\uB178\uB4DC"} {"\uAC04\uACA9"}</label>
            <input type="range" min={10} max={100} value={nodeSpacing}
              onChange={(e) => setNodeSpacing(+e.target.value)} />
            <div className="graph-filter-hint">{nodeSpacing < 30 ? "\uBC00\uC9D1" : nodeSpacing < 70 ? "\uBCF4\uD1B5" : "\uB113\uAC8C"}</div>
          </div>
          <div className="graph-filter">
            <label>{"\uAC04\uC120"} {"\uAC04\uACA9"}</label>
            <input type="range" min={10} max={100} value={edgeLength}
              onChange={(e) => setEdgeLength(+e.target.value)} />
            <div className="graph-filter-hint">{edgeLength < 30 ? "\uC9E7\uAC8C" : edgeLength < 70 ? "\uBCF4\uD1B5" : "\uAE38\uAC8C"}</div>
          </div>
          <label className="graph-toggle-switch">
            <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            <span>{"\uC774\uB984"} {"\uD45C\uC2DC"}</span>
          </label>
        </div>

        {/* Canvas */}
        <div className="graph-canvas" ref={wrapRef} onContextMenu={(e) => {
          e.preventDefault();
          // Check if hovering a node
          setCtxMenu({ x: e.clientX, y: e.clientY, node: hovered });
          setHighlightLink(null);
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
                  // Reset label collision rects at the start of each paint cycle
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
                  if (linkingFrom) {
                    if (node.id !== linkingFrom.id) {
                      api.post(`/courses/${courseId}/notes/manual-link`, {
                        source_note_id: linkingFrom.id,
                        target_note_id: node.id,
                      }).then(() => {
                        // Add edge locally for immediate feedback
                        setGraphData((prev) => {
                          if (!prev) return prev;
                          const newEdge = { source: linkingFrom.id, target: node.id, type: "link" as const };
                          return { ...prev, edges: [...prev.edges, newEdge] };
                        });
                      }).catch(() => {});
                    }
                    setLinkingFrom(null);
                    return;
                  }
                  navigate(`/courses/${courseId}/notes/${node.id}`);
                }}
                onNodeHover={(node: GNode | null) => setHovered(node)}
                onNodeDrag={(node: GNode) => { node.fx = node.x; node.fy = node.y; }}
                onNodeDragEnd={(node: GNode) => {
                  // 고정 해제 → 충돌 힘이 다시 작용하도록
                  node.fx = undefined;
                  node.fy = undefined;
                  // 시뮬레이션 재가열 → 충돌 판정 재개
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

          {/* Tooltip (HTML, follows mouse) */}
          {hovered && (
            <div className="graph-tooltip" style={{
              left: mousePos.x + 14 + 260 > window.innerWidth ? mousePos.x - 260 - 8 : mousePos.x + 14,
              top: mousePos.y + 14 + 200 > window.innerHeight ? mousePos.y - 200 - 8 : mousePos.y + 14,
            }}>
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
              {hovered.categories.length > 0 && (
                <div className="graph-tooltip-tags" style={{ borderTop: "1px solid var(--outline-variant, rgba(255,255,255,0.1))", paddingTop: 4, marginTop: 4 }}>
                  {hovered.categories.slice(0, 5).map((c) => <span key={c} style={{ color: "rgba(140,30,180,0.85)" }}>{c}</span>)}
                  {hovered.categories.length > 5 && <span style={{ color: "var(--on-surface-variant, rgba(148,163,184,0.6))" }}>+{hovered.categories.length - 5}</span>}
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
            }} style={{
              left: ctxMenu.x, top: ctxMenu.y,
              opacity: highlightLink ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
              onClick={(e) => e.stopPropagation()}>
              {ctxMenu.node ? (
                <>
                  <div className="graph-ctx-header">
                    <span className="graph-ctx-dot" style={{ background: scoreColor(ctxMenu.node.score) }} />
                    {ctxMenu.node.title.length > 20 ? ctxMenu.node.title.slice(0, 20) + "..." : ctxMenu.node.title}
                  </div>
                  <button className="graph-ctx-item" onClick={() => { navigate(`/courses/${courseId}/notes/${ctxMenu.node!.id}`); setCtxMenu(null); }}>
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
                  <div className="graph-ctx-divider" />
                  <button className="graph-ctx-item" onClick={() => {
                    setLinkingFrom(ctxMenu.node!);
                    setLinkSearch("");
                    setLinkSearchOpen(false);
                    setCtxMenu(null);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    다른 노트와 링크
                  </button>
                  {/* 이 노드의 수동 링크 목록 → 삭제 가능 */}
                  {(() => {
                    const nodeId = ctxMenu.node!.id;
                    const manualLinks = gd.links.filter((l) => {
                      if (l.type !== "link") return false;
                      const sId = typeof l.source === "string" ? l.source : (l.source as GNode).id;
                      const tId = typeof l.target === "string" ? l.target : (l.target as GNode).id;
                      return sId === nodeId || tId === nodeId;
                    });
                    if (manualLinks.length === 0) return null;
                    return (
                      <>
                        <div className="graph-ctx-divider" />
                        <div className="graph-ctx-header" style={{ fontSize: 10, opacity: 0.6, padding: "4px 12px 2px" }}>링크 해제</div>
                        {manualLinks.map((l, i) => {
                          const sId = typeof l.source === "string" ? l.source : (l.source as GNode).id;
                          const tId = typeof l.target === "string" ? l.target : (l.target as GNode).id;
                          const otherId = sId === nodeId ? tId : sId;
                          const otherNode = gd.nodes.find((n) => n.id === otherId);
                          const otherTitle = otherNode ? (otherNode.title.length > 16 ? otherNode.title.slice(0, 16) + "..." : otherNode.title) : "?";
                          return (
                            <button key={i} className="graph-ctx-item" style={{ color: "#f87171" }}
                              onMouseEnter={() => setHighlightLink({ s: sId, t: tId })}
                              onMouseLeave={() => setHighlightLink(null)}
                              onClick={() => {
                                setHighlightLink(null);
                                api.delete(`/courses/${courseId}/notes/manual-link`, { data: { source_note_id: sId, target_note_id: tId } })
                                  .then(() => {
                                    setGraphData((prev) => {
                                      if (!prev) return prev;
                                      return { ...prev, edges: prev.edges.filter((e) => !(
                                        (e.source === sId && e.target === tId && e.type === "link") ||
                                        (e.source === tId && e.target === sId && e.type === "link")
                                      ))};
                                    });
                                  }).catch(() => {});
                                setCtxMenu(null);
                              }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              {otherTitle}
                            </button>
                          );
                        })}
                      </>
                    );
                  })()}
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

          {/* Linking mode banner */}
          {linkingFrom && (
            <div className="graph-link-banner">
              <div className="graph-link-banner-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <strong>{linkingFrom.title.length > 18 ? linkingFrom.title.slice(0, 18) + "..." : linkingFrom.title}</strong>
                {"\uC5D0\uC11C"} {"\uC5F0\uACB0\uD560"} {"\uB178\uD2B8\uB97C"} {"\uD074\uB9AD\uD558\uC138\uC694"}
              </div>
              <div className="graph-link-banner-actions">
                <button
                  className="graph-link-search-btn"
                  onClick={() => setLinkSearchOpen(!linkSearchOpen)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  {"\uAC80\uC0C9"}
                </button>
                <button
                  className="graph-link-cancel-btn"
                  onClick={() => setLinkingFrom(null)}
                >
                  {"\uCDE8\uC18C"}
                </button>
              </div>
              {linkSearchOpen && (
                <div className="graph-link-search-panel">
                  <input
                    className="graph-link-search-input"
                    placeholder={"\uB178\uD2B8"}
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    autoFocus
                  />
                  <div className="graph-link-search-results">
                    {gd.nodes
                      .filter((n) => n.id !== linkingFrom.id && n.title.toLowerCase().includes(linkSearch.toLowerCase()))
                      .slice(0, 8)
                      .map((n) => (
                        <button
                          key={n.id}
                          className="graph-link-search-item"
                          onClick={() => {
                            api.post(`/courses/${courseId}/notes/manual-link`, {
                              source_note_id: linkingFrom.id,
                              target_note_id: n.id,
                            }).then(() => {
                              setGraphData((prev) => {
                                if (!prev) return prev;
                                const newEdge = { source: linkingFrom.id, target: n.id, type: "link" as const };
                                return { ...prev, edges: [...prev.edges, newEdge] };
                              });
                            }).catch(() => {});
                            setLinkingFrom(null);
                            setLinkSearchOpen(false);
                          }}
                        >
                          <span className="graph-link-search-dot" style={{ background: scoreColor(n.score) }} />
                          <span className="graph-link-search-title">{n.title}</span>
                          {n.score != null && <span className="graph-link-search-score">{n.score}%</span>}
                        </button>
                      ))}
                    {gd.nodes.filter((n) => n.id !== linkingFrom.id && n.title.toLowerCase().includes(linkSearch.toLowerCase())).length === 0 && (
                      <div className="graph-link-search-empty">{"\uACB0\uACFC"} {"\uC5C6\uC74C"}</div>
                    )}
                  </div>
                </div>
              )}
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
