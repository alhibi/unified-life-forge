import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { AppList, AppRow, IconButton } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  eraColors,
  type LiteraryRelation,
  literaryRelations,
  type PoetNode,
  poetNodes,
  relationColors,
  relationLabels,
  type RelationType,
} from '@/features/diwan/data/literaryConnections';
import { Filter, Maximize2, X, ZoomIn, ZoomOut } from '@/lib/icons';

// ─── Types ───────────────────────────────────────────────────────────
interface SimNode extends PoetNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
  relation: LiteraryRelation;
}

// ─── Stable simulation viewport ──────────────────────────────────────
// كانت المحاكاة سابقاً تعمل بأبعاد container الفعلية (w/h) فتتأثّر
// بكل resize، فتُعيد 220 iter × O(N²) باستمرار. نُحسّبها الآن في فضاء
// ثابت (SIM_W × SIM_H) ونتركة SVG viewBox يُسقطه على الـ container.
// النتيجة: المحاكاة تعمل مرّة واحدة في عمر الجلسة، والـ resize يصبح
// مجرد scale CSS بلا حساب فيزيائي.
const SIM_W = 800;
const SIM_H = 600;

// ─── Force simulation ────────────────────────────────────────────────
const REPULSION = 4200;
const ATTRACTION = 0.005;
const DAMPING = 0.86;
const CENTER_GRAVITY = 0.012;
const LINK_DISTANCE = 180;
const ITERATIONS = 220;

function simulate(nodes: SimNode[], links: SimLink[], w: number, h: number) {
  const cx = w / 2,
    cy = h / 2;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = REPULSION / (d * d);
        const fx = (dx / d) * f,
          fy = (dy / d) * f;
        nodes[i].vx += fx;
        nodes[i].vy += fy;
        nodes[j].vx -= fx;
        nodes[j].vy -= fy;
      }
    }
    for (const l of links) {
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - LINK_DISTANCE) * ATTRACTION;
      const fx = (dx / d) * f,
        fy = (dy / d) * f;
      l.source.vx += fx;
      l.source.vy += fy;
      l.target.vx -= fx;
      l.target.vy -= fy;
    }
    for (const n of nodes) {
      n.vx += (cx - n.x) * CENTER_GRAVITY;
      n.vy += (cy - n.y) * CENTER_GRAVITY;
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(60, Math.min(w - 60, n.x));
      n.y = Math.max(60, Math.min(h - 60, n.y));
    }
  }
}

// Curved path between two points
function curvedPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = dist * 0.15;
  const cx1 = mx - (dy * offset) / dist;
  const cy1 = my + (dx * offset) / dist;
  return `M${x1},${y1} Q${cx1},${cy1} ${x2},${y2}`;
}

// ─── Component ───────────────────────────────────────────────────────
interface Props {
  onSelectPoet?: (poetId: string) => void;
  initialPoetId?: string;
}

/**
 * شجرة العلاقات الأدبية — بيانات فعلية (عُقد بألوان العصور وأوزان
 * الاتصالات، ووصلات بألوان نوع العلاقة) فتبقى ألوانها وحركتها.
 * أُزيلت حولها الزخرفة لا البيانات: ظلّ العُقد (feDropShadow)، هالة
 * المركز (radialGradient)، وفلاتر النصوع غير المستخدمة؛ والأصناف
 * الميتة أُبدلت بطبقة النظام — الأسطح العائمة بـ .app-overlay-surface
 * وأزرار الأدوات بـ IconButton الموحّد.
 */
export default function LiteraryGraph({ onSelectPoet, initialPoetId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, s: 1 });
  const [selected, setSelected] = useState<SimNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filters, setFilters] = useState<Set<RelationType>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPinch, setLastPinch] = useState<number | null>(null);

  // Build graph — يحدث مرّة واحدة فقط (deps فارغ) لأنّ poetNodes/
  // literaryRelations ثابتة وفضاء المحاكاة (SIM_W × SIM_H) مستقلّ عن
  // أبعاد الـ container. ResizeObserver لم يعد ضرورياً.
  const { nodes, links } = useMemo(() => {
    const simNodes: SimNode[] = poetNodes.map((p, i) => ({
      ...p,
      x: SIM_W / 2 + Math.cos((i / poetNodes.length) * Math.PI * 2) * (SIM_W * 0.32),
      y: SIM_H / 2 + Math.sin((i / poetNodes.length) * Math.PI * 2) * (SIM_H * 0.32),
      vx: 0,
      vy: 0,
    }));
    const map = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: SimLink[] = literaryRelations
      .filter((r) => map.has(r.source) && map.has(r.target))
      .map((r) => ({ source: map.get(r.source)!, target: map.get(r.target)!, relation: r }));
    simulate(simNodes, simLinks, SIM_W, SIM_H);
    return { nodes: simNodes, links: simLinks };
  }, []);

  // التركيز الابتدائي — ضبط أثناء العرض (النمط الموصى به لاشتقاق حالة
  // من prop) بدل effect يكتب الحالة بعد الإرسال.
  const [prevInitialPoet, setPrevInitialPoet] = useState<string | undefined>(initialPoetId);
  if (initialPoetId !== prevInitialPoet) {
    setPrevInitialPoet(initialPoetId);
    if (initialPoetId) {
      const n = nodes.find((nd) => nd.id === initialPoetId);
      if (n) {
        setSelected(n);
        setTransform({ x: SIM_W / 2 - n.x, y: SIM_H / 2 - n.y, s: 1.3 });
      }
    }
  }

  // Connection count per node
  const connectionCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of links) {
      counts[l.source.id] = (counts[l.source.id] || 0) + 1;
      counts[l.target.id] = (counts[l.target.id] || 0) + 1;
    }
    return counts;
  }, [links]);

  const visibleLinks = useMemo(
    () => (filters.size === 0 ? links : links.filter((l) => filters.has(l.relation.type))),
    [links, filters],
  );

  const focusIds = useMemo(() => {
    const id = selected?.id || hovered;
    if (!id) return new Set<string>();
    const s = new Set<string>([id]);
    for (const l of visibleLinks) {
      if (l.source.id === id) s.add(l.target.id);
      if (l.target.id === id) s.add(l.source.id);
    }
    return s;
  }, [selected, hovered, visibleLinks]);

  const selectedLinks = useMemo(() => {
    if (!selected) return [];
    return visibleLinks.filter((l) => l.source.id === selected.id || l.target.id === selected.id);
  }, [selected, visibleLinks]);

  // Interactions
  // ملاحظة: viewBox الثابت (SIM_W × SIM_H) يجعل SVG-user-units مختلفة
  // عن screen-pixels. لذا نُحوِّل pointer deltas من screen-space إلى
  // user-space بقسمة على نسبة container/SIM، وإلا يبدو الـ drag أسرع
  // أو أبطأ من المتوقّع على شاشات لا تطابق 800×600.
  const screenToUserScale = useCallback((): number => {
    const el = containerRef.current;
    if (!el) return 1;
    const cw = el.clientWidth || SIM_W;
    return cw / SIM_W;
  }, []);

  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('.graph-node')) return;
      setDragging(true);
      const k = screenToUserScale();
      setDragStart({ x: e.clientX - transform.x * k, y: e.clientY - transform.y * k });
    },
    [transform, screenToUserScale],
  );
  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const k = screenToUserScale();
      setTransform((t) => ({
        ...t,
        x: (e.clientX - dragStart.x) / k,
        y: (e.clientY - dragStart.y) / k,
      }));
    },
    [dragging, dragStart, screenToUserScale],
  );
  const handleUp = useCallback(() => setDragging(false), []);
  const doZoom = useCallback(
    (d: number) => setTransform((t) => ({ ...t, s: Math.max(0.3, Math.min(3, t.s + d)) })),
    [],
  );
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      doZoom(e.deltaY > 0 ? -0.12 : 0.12);
    },
    [doZoom],
  );
  const handleTouch = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        if (lastPinch !== null) doZoom((d - lastPinch) * 0.004);
        setLastPinch(d);
      }
    },
    [doZoom, lastPinch],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-[72vh] min-h-[420px] w-full overflow-hidden rounded-3xl border border-border/30"
    >
      {/* Canvas */}
      <svg
        className="h-full w-full cursor-grab select-none active:cursor-grabbing"
        viewBox={`0 0 ${SIM_W} ${SIM_H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
        onWheel={handleWheel}
        onTouchMove={handleTouch}
        onTouchEnd={() => setLastPinch(null)}
        style={{ touchAction: 'none' }}
        role="img"
        aria-labelledby="literary-graph-title literary-graph-desc"
      >
        <title id="literary-graph-title">شجرة العلاقات الأدبية بين الشعراء العرب</title>
        <desc id="literary-graph-desc">
          مخطّط تفاعلي يعرض {nodes.length} شاعراً موزّعين على عصور أدبية، مع {visibleLinks.length}{' '}
          علاقة بينهم (أستاذ-تلميذ، نقائض، تأثّر، قرابة، عشق). اضغط Tab للتنقّل بلوحة المفاتيح بين
          النقاط، ثم Enter لتحديد شاعر وعرض علاقاته.
        </desc>

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.s})`}>
          {/* Links — curved bezier paths */}
          {visibleLinks.map((l, i) => {
            const active =
              focusIds.size === 0 || (focusIds.has(l.source.id) && focusIds.has(l.target.id));
            const color = relationColors[l.relation.type];
            return (
              <path
                key={i}
                d={curvedPath(l.source.x, l.source.y, l.target.x, l.target.y)}
                fill="none"
                stroke={color}
                strokeWidth={active ? 2.2 : 0.8}
                strokeOpacity={active ? 0.7 : 0.1}
                strokeLinecap="round"
                className="transition-motion duration-slow ease-enter"
              />
            );
          })}

          {/* ─── Animated particles on highlighted links ─── */}
          {(selected || hovered) &&
            visibleLinks
              .filter((l) => focusIds.has(l.source.id) && focusIds.has(l.target.id))
              .map((l, i) => {
                const color = relationColors[l.relation.type];
                const path = curvedPath(l.source.x, l.source.y, l.target.x, l.target.y);
                return (
                  <g key={`particle-${i}`}>
                    <circle r="3" fill={color} opacity="0.9">
                      <animateMotion dur={`${2 + i * 0.3}s`} repeatCount="indefinite" path={path} />
                      <animate
                        attributeName="opacity"
                        values="0;0.9;0.9;0"
                        dur={`${2 + i * 0.3}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle r="2" fill={color} opacity="0.6">
                      <animateMotion
                        dur={`${2 + i * 0.3}s`}
                        repeatCount="indefinite"
                        path={path}
                        begin={`${0.8 + i * 0.1}s`}
                      />
                      <animate
                        attributeName="opacity"
                        values="0;0.6;0.6;0"
                        dur={`${2 + i * 0.3}s`}
                        repeatCount="indefinite"
                        begin={`${0.8 + i * 0.1}s`}
                      />
                    </circle>
                  </g>
                );
              })}

          {/* ─── Nodes with depth/parallax effect ─── */}
          {nodes.map((node) => {
            const active = focusIds.size === 0 || focusIds.has(node.id);
            const isSel = selected?.id === node.id;
            const conns = connectionCount[node.id] || 0;
            // DEPTH: nodes with more connections are bigger and more prominent
            const maxConns = Math.max(...Object.values(connectionCount), 1);
            const importance = conns / maxConns; // 0..1
            const radius = 18 + importance * 18; // 18..36
            const depthOpacity = active ? 1 : 0.08 + importance * 0.12; // dimmer if unconnected AND unimportant

            // a11y: نضيف tabIndex و role + onKeyDown على كل عقدة
            // ليتمكّن مستخدمو لوحة المفاتيح من التنقّل وتحديد الشعراء.
            // تعطّل التركيز للعُقد المُعتَمة (active=false) لأن المستخدم
            // لا يستطيع رؤيتها أصلاً، فإدراجها في tab order مشوّش.
            const onNodeKeyDown = (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelected(isSel ? null : node);
              } else if (e.key === 'Escape' && isSel) {
                e.preventDefault();
                setSelected(null);
              }
            };

            return (
              <g
                key={node.id}
                className="graph-node cursor-pointer focus:outline-none"
                transform={`translate(${node.x},${node.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(isSel ? null : node);
                }}
                onPointerEnter={() => setHovered(node.id)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(node.id)}
                onBlur={() => setHovered(null)}
                onKeyDown={onNodeKeyDown}
                tabIndex={active ? 0 : -1}
                role="button"
                aria-label={`${node.name} — ${node.eraAr}${node.title ? ' — ' + node.title : ''} — ${conns} ${
                  conns === 1 ? 'علاقة' : 'علاقات'
                }`}
                aria-pressed={isSel}
                style={{ opacity: depthOpacity, transition: 'opacity 0.4s ease, transform 0.3s ease' }}
              >
                {/* Pulse ring for selected */}
                {isSel && (
                  <>
                    <circle r={radius + 12} fill="none" stroke={node.color} strokeWidth="1.5" opacity="0.3">
                      <animate
                        attributeName="r"
                        from={radius + 8}
                        to={radius + 20}
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle
                      r={radius + 6}
                      fill="none"
                      stroke={node.color}
                      strokeWidth="2"
                      strokeDasharray="3 4"
                      opacity="0.5"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0"
                        to="360"
                        dur="12s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}

                {/* Main node body */}
                <circle
                  r={radius}
                  fill={`${node.color}${isSel ? '30' : '14'}`}
                  stroke={node.color}
                  strokeWidth={isSel ? 2.5 : 1.2}
                  className="transition-motion duration-normal"
                />

                {/* Inner gradient circle */}
                <circle
                  r={radius * 0.45}
                  fill={node.color}
                  opacity={isSel ? 1 : 0.85}
                  className="transition-motion duration-normal"
                />

                {/* Connection count badge */}
                {conns > 2 && (
                  <g transform={`translate(${radius * 0.7}, ${-radius * 0.7})`}>
                    <circle r="8" fill={node.color} opacity="0.9" />
                    <text
                      textAnchor="middle"
                      y="3.5"
                      className="pointer-events-none fill-white text-micro font-bold"
                    >
                      {conns}
                    </text>
                  </g>
                )}

                {/* Name */}
                <text
                  y={radius + 14}
                  textAnchor="middle"
                  className="pointer-events-none select-none fill-foreground text-micro font-bold"
                  style={{ fontFamily: 'var(--font-amiri)' }}
                >
                  {node.name}
                </text>

                {/* Era label */}
                <text
                  y={radius + 26}
                  textAnchor="middle"
                  className="pointer-events-none select-none fill-muted-foreground text-micro"
                >
                  {node.eraAr}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ─── UI Panels ─── */}

      {/* Zoom controls */}
      <div className="absolute top-4 start-4 z-raised flex flex-col gap-1.5">
        <IconButton onClick={() => doZoom(0.25)} aria-label="تكبير">
          <ZoomIn className="h-4.5 w-4.5 text-foreground" aria-hidden />
        </IconButton>
        <IconButton onClick={() => doZoom(-0.25)} aria-label="تصغير">
          <ZoomOut className="h-4.5 w-4.5 text-foreground" aria-hidden />
        </IconButton>
        <IconButton
          onClick={() => setTransform({ x: 0, y: 0, s: 1 })}
          aria-label="إعادة ضبط العرض"
        >
          <Maximize2 className="h-4.5 w-4.5 text-foreground" aria-hidden />
        </IconButton>
        <IconButton
          onClick={() => setShowFilters(!showFilters)}
          aria-label="تصفية العلاقات"
          aria-expanded={showFilters}
          className={showFilters ? 'bg-primary/15 text-primary' : undefined}
        >
          <Filter className="h-4.5 w-4.5" aria-hidden />
        </IconButton>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="app-overlay-surface absolute top-[200px] start-4 z-raised w-[170px] p-3.5"
          >
            <p className="mb-2.5 text-micro font-bold text-foreground">نوع العلاقة</p>
            <div className="space-y-1">
              {(Object.entries(relationLabels) as [RelationType, string][]).map(([type, label]) => {
                const isActive = filters.size === 0 || filters.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setFilters((prev) => {
                        const next = new Set(prev);
                        if (next.has(type)) next.delete(type);
                        else next.add(type);
                        return next;
                      });
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-micro font-medium transition-motion ${
                      isActive
                        ? 'bg-muted/60 text-foreground'
                        : 'text-muted-foreground-subtle hover:text-muted-foreground'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: relationColors[type], opacity: isActive ? 1 : 0.3 }}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
            {filters.size > 0 && (
              <button
                onClick={() => setFilters(new Set())}
                className="mt-3 w-full text-micro font-bold text-primary hover:underline"
              >
                عرض الكل
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected node detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="app-overlay-surface absolute bottom-[85px] start-4 end-4 z-sticky max-h-[38%] overflow-y-auto p-5"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg"
                  style={{ border: `2px solid ${selected.color}40` }}
                >
                  <div className="h-5 w-5 rounded-full" style={{ backgroundColor: selected.color }} />
                </div>
                <div>
                  <h3 className="font-amiri text-body font-bold leading-tight text-foreground">
                    {selected.name}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {selected.title && (
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-micro font-semibold text-primary">
                        {selected.title}
                      </span>
                    )}
                    <span className="text-micro text-muted-foreground">{selected.eraAr}</span>
                    {selected.birth && (
                      <span className="text-micro text-muted-foreground">
                        · {selected.birth}
                        {selected.death && ` – ${selected.death}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <IconButton onClick={() => setSelected(null)} aria-label="إغلاق تفاصيل الشاعر">
                <X className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>

            {/* Relations */}
            {selectedLinks.length > 0 && (
              <div>
                <p className="mb-2 text-micro font-bold text-muted-foreground">
                  علاقاته الأدبية · {selectedLinks.length}
                </p>
                <AppList>
                  {selectedLinks.map((l, i) => {
                    const other = l.source.id === selected.id ? l.target : l.source;
                    return (
                      <AppRow
                        key={i}
                        onClick={() => {
                          const n = nodes.find((nd) => nd.id === other.id);
                          if (n) setSelected(n);
                        }}
                        leading={
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-md"
                            style={{ backgroundColor: `${relationColors[l.relation.type]}15` }}
                          >
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: relationColors[l.relation.type] }}
                            />
                          </span>
                        }
                        title={
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-amiri">{other.name}</span>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-micro font-medium text-muted-foreground">
                              {relationLabels[l.relation.type]}
                            </span>
                          </span>
                        }
                        subtitle={l.relation.description}
                      />
                    );
                  })}
                </AppList>
              </div>
            )}

            {/* Navigate button */}
            {onSelectPoet && (
              <Button onClick={() => onSelectPoet(selected.id)} className="mt-4 w-full">
                عرض قصائد {selected.name}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Mini Timeline Bar ─── */}
      <div className="absolute bottom-4 start-4 end-4 z-raised">
        <div className="app-overlay-surface px-3 py-2.5">
          <div className="flex items-center gap-1">
            {(['jahili', 'mukhadram', 'islami', 'umawi', 'abbasi', 'andalusi'] as const).map(
              (eraId) => {
                const color = eraColors[eraId];
                const label =
                  eraId === 'jahili'
                    ? 'الجاهلي'
                    : eraId === 'mukhadram'
                      ? 'المخضرم'
                      : eraId === 'islami'
                        ? 'الإسلامي'
                        : eraId === 'umawi'
                          ? 'الأموي'
                          : eraId === 'abbasi'
                            ? 'العباسي'
                            : 'الأندلسي';
                const eraNodeIds = nodes.filter((n) => n.era === eraId).map((n) => n.id);
                const isHighlighted =
                  focusIds.size === 0 || eraNodeIds.some((id) => focusIds.has(id));
                return (
                  <button
                    key={eraId}
                    onClick={() => {
                      // Focus on first poet of this era
                      const firstNode = nodes.find((n) => n.era === eraId);
                      if (firstNode) {
                        setSelected(firstNode);
                        setTransform({
                          x: SIM_W / 2 - firstNode.x,
                          y: SIM_H / 2 - firstNode.y,
                          s: 1.2,
                        });
                      }
                    }}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-1 transition-motion hover:opacity-100 ${
                      isHighlighted ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <div
                      className="h-1.5 w-full rounded-full transition-motion"
                      style={{ backgroundColor: color, opacity: isHighlighted ? 0.9 : 0.3 }}
                    />
                    <span className="text-micro font-medium leading-none text-muted-foreground">
                      {label}
                    </span>
                  </button>
                );
              },
            )}
          </div>
          {/* Hint text */}
          {!selected && (
            <p className="mt-1.5 text-center text-micro text-muted-foreground-subtle">
              اضغط على عصر للاستكشاف · أو على شاعر لرؤية علاقاته
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
