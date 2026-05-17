import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Maximize2, Filter, Sparkles } from 'lucide-react';
import {
  poetNodes,
  literaryRelations,
  eraColors,
  relationLabels,
  relationColors,
  type PoetNode,
  type LiteraryRelation,
  type RelationType,
} from '@/data/literaryConnections';

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

// ─── Force simulation ────────────────────────────────────────────────
const REPULSION = 4200;
const ATTRACTION = 0.005;
const DAMPING = 0.86;
const CENTER_GRAVITY = 0.012;
const LINK_DISTANCE = 180;
const ITERATIONS = 220;

function simulate(nodes: SimNode[], links: SimLink[], w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = REPULSION / (d * d);
        const fx = (dx / d) * f, fy = (dy / d) * f;
        nodes[i].vx += fx; nodes[i].vy += fy;
        nodes[j].vx -= fx; nodes[j].vy -= fy;
      }
    }
    for (const l of links) {
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - LINK_DISTANCE) * ATTRACTION;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      l.source.vx += fx; l.source.vy += fy;
      l.target.vx -= fx; l.target.vy -= fy;
    }
    for (const n of nodes) {
      n.vx += (cx - n.x) * CENTER_GRAVITY;
      n.vy += (cy - n.y) * CENTER_GRAVITY;
      n.vx *= DAMPING; n.vy *= DAMPING;
      n.x += n.vx; n.y += n.vy;
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
  const cx1 = mx - dy * offset / dist;
  const cy1 = my + dx * offset / dist;
  return `M${x1},${y1} Q${cx1},${cy1} ${x2},${y2}`;
}

// ─── Component ───────────────────────────────────────────────────────
interface Props {
  onSelectPoet?: (poetId: string) => void;
  initialPoetId?: string;
}

export default function LiteraryGraph({ onSelectPoet, initialPoetId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [transform, setTransform] = useState({ x: 0, y: 0, s: 1 });
  const [selected, setSelected] = useState<SimNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filters, setFilters] = useState<Set<RelationType>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPinch, setLastPinch] = useState<number | null>(null);

  // Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setDims({ w: e.contentRect.width || 800, h: e.contentRect.height || 600 }));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Build graph
  const { nodes, links } = useMemo(() => {
    const { w, h } = dims;
    const simNodes: SimNode[] = poetNodes.map((p, i) => ({
      ...p,
      x: w / 2 + Math.cos((i / poetNodes.length) * Math.PI * 2) * (w * 0.32),
      y: h / 2 + Math.sin((i / poetNodes.length) * Math.PI * 2) * (h * 0.32),
      vx: 0, vy: 0,
    }));
    const map = new Map(simNodes.map(n => [n.id, n]));
    const simLinks: SimLink[] = literaryRelations
      .filter(r => map.has(r.source) && map.has(r.target))
      .map(r => ({ source: map.get(r.source)!, target: map.get(r.target)!, relation: r }));
    simulate(simNodes, simLinks, w, h);
    return { nodes: simNodes, links: simLinks };
  }, [dims]);

  // Connection count per node
  const connectionCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of links) {
      counts[l.source.id] = (counts[l.source.id] || 0) + 1;
      counts[l.target.id] = (counts[l.target.id] || 0) + 1;
    }
    return counts;
  }, [links]);

  const visibleLinks = useMemo(() => filters.size === 0 ? links : links.filter(l => filters.has(l.relation.type)), [links, filters]);

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
    return visibleLinks.filter(l => l.source.id === selected.id || l.target.id === selected.id);
  }, [selected, visibleLinks]);

  // Interactions
  const handleDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.ui-panel, .graph-node')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);
  const handleMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setTransform(t => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }, [dragging, dragStart]);
  const handleUp = useCallback(() => setDragging(false), []);
  const doZoom = useCallback((d: number) => setTransform(t => ({ ...t, s: Math.max(0.3, Math.min(3, t.s + d)) })), []);
  const handleWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); doZoom(e.deltaY > 0 ? -0.12 : 0.12); }, [doZoom]);
  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastPinch !== null) doZoom((d - lastPinch) * 0.004);
      setLastPinch(d);
    }
  }, [doZoom, lastPinch]);

  // Initial focus
  useEffect(() => {
    if (initialPoetId) {
      const n = nodes.find(nd => nd.id === initialPoetId);
      if (n) { setSelected(n); setTransform({ x: dims.w / 2 - n.x, y: dims.h / 2 - n.y, s: 1.3 }); }
    }
  }, [initialPoetId, nodes, dims]);

  return (
    <div ref={containerRef} className="relative w-full h-[72vh] min-h-[420px] rounded-3xl overflow-hidden border border-border/30 bg-gradient-to-br from-slate-950/5 via-background to-slate-950/5 dark:from-slate-900/30 dark:via-background dark:to-slate-900/30">
      {/* Canvas */}
      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
        onWheel={handleWheel}
        onTouchMove={handleTouch}
        onTouchEnd={() => setLastPinch(null)}
        style={{ touchAction: 'none' }}
      >
        <defs>
          <filter id="node-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="center-glow">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.s})`}>
          {/* Ambient center glow */}
          <circle cx={dims.w / 2} cy={dims.h / 2} r={dims.w * 0.4} fill="url(#center-glow)" />

          {/* Links — curved bezier paths */}
          {visibleLinks.map((l, i) => {
            const active = focusIds.size === 0 || (focusIds.has(l.source.id) && focusIds.has(l.target.id));
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
                className="transition-all duration-500 ease-out"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, idx) => {
            const active = focusIds.size === 0 || focusIds.has(node.id);
            const isSel = selected?.id === node.id;
            const conns = connectionCount[node.id] || 0;
            const radius = 22 + Math.min(conns * 2, 10);

            return (
              <g
                key={node.id}
                className="graph-node cursor-pointer"
                transform={`translate(${node.x},${node.y})`}
                onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : node); }}
                onPointerEnter={() => setHovered(node.id)}
                onPointerLeave={() => setHovered(null)}
                style={{ opacity: active ? 1 : 0.15, transition: 'opacity 0.4s ease' }}
              >
                {/* Pulse ring for selected */}
                {isSel && (
                  <>
                    <circle r={radius + 12} fill="none" stroke={node.color} strokeWidth="1.5" opacity="0.3">
                      <animate attributeName="r" from={radius + 8} to={radius + 20} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle r={radius + 6} fill="none" stroke={node.color} strokeWidth="2" strokeDasharray="3 4" opacity="0.5">
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="12s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}

                {/* Main node body */}
                <circle
                  r={radius}
                  fill={`${node.color}${isSel ? '30' : '14'}`}
                  stroke={node.color}
                  strokeWidth={isSel ? 2.5 : 1.2}
                  filter="url(#node-shadow)"
                  className="transition-all duration-300"
                />

                {/* Inner gradient circle */}
                <circle
                  r={radius * 0.45}
                  fill={node.color}
                  opacity={isSel ? 1 : 0.85}
                  className="transition-all duration-300"
                />

                {/* Connection count badge */}
                {conns > 2 && (
                  <g transform={`translate(${radius * 0.7}, ${-radius * 0.7})`}>
                    <circle r="8" fill={node.color} opacity="0.9" />
                    <text textAnchor="middle" y="3.5" className="fill-white text-[8px] font-bold pointer-events-none">{conns}</text>
                  </g>
                )}

                {/* Name */}
                <text
                  y={radius + 14}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-bold pointer-events-none select-none"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {node.name}
                </text>

                {/* Era label */}
                <text
                  y={radius + 26}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px] pointer-events-none select-none"
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
      <div className="ui-panel absolute top-4 start-4 flex flex-col gap-1.5 z-10">
        <button onClick={() => doZoom(0.25)} className="w-10 h-10 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-card">
          <ZoomIn className="w-4.5 h-4.5 text-foreground" />
        </button>
        <button onClick={() => doZoom(-0.25)} className="w-10 h-10 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-card">
          <ZoomOut className="w-4.5 h-4.5 text-foreground" />
        </button>
        <button onClick={() => setTransform({ x: 0, y: 0, s: 1 })} className="w-10 h-10 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-card">
          <Maximize2 className="w-4.5 h-4.5 text-foreground" />
        </button>
        <button onClick={() => setShowFilters(!showFilters)} className={`w-10 h-10 rounded-2xl backdrop-blur-xl border border-border/30 flex items-center justify-center shadow-lg active:scale-90 transition-all ${showFilters ? 'bg-primary/15 border-primary/30' : 'bg-card/80 hover:bg-card'}`}>
          <Filter className={`w-4.5 h-4.5 ${showFilters ? 'text-primary' : 'text-foreground'}`} />
        </button>
      </div>

      {/* Era legend — top end */}
      <div className="ui-panel absolute top-4 end-4 bg-card/80 backdrop-blur-xl border border-border/30 rounded-2xl px-3 py-2.5 shadow-lg z-10">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-bold text-foreground">العصور</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {Object.entries(eraColors).map(([era, color]) => (
            <div key={era} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-muted-foreground">
                {era === 'jahili' ? 'الجاهلي' : era === 'mukhadram' ? 'المخضرم' : era === 'islami' ? 'الإسلامي' : era === 'umawi' ? 'الأموي' : era === 'abbasi' ? 'العباسي' : 'الأندلسي'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="ui-panel absolute top-[200px] start-4 bg-card/90 backdrop-blur-xl border border-border/30 rounded-2xl p-3.5 shadow-xl z-10 w-[170px]"
          >
            <p className="text-[11px] font-bold text-foreground mb-2.5">نوع العلاقة</p>
            <div className="space-y-1">
              {(Object.entries(relationLabels) as [RelationType, string][]).map(([type, label]) => {
                const isActive = filters.size === 0 || filters.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setFilters(prev => {
                        const next = new Set(prev);
                        if (next.has(type)) next.delete(type); else next.add(type);
                        return next;
                      });
                    }}
                    className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-[11px] font-medium transition-all ${isActive ? 'bg-muted/60 text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
                  >
                    <span className="w-3 h-3 rounded-full shadow-sm ring-1 ring-black/5" style={{ backgroundColor: relationColors[type], opacity: isActive ? 1 : 0.3 }} />
                    {label}
                  </button>
                );
              })}
            </div>
            {filters.size > 0 && (
              <button onClick={() => setFilters(new Set())} className="mt-3 w-full text-[10px] text-primary font-bold hover:underline">
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
            className="ui-panel absolute bottom-4 start-4 end-4 max-h-[42%] overflow-y-auto bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl p-5 shadow-2xl z-20"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ background: `linear-gradient(135deg, ${selected.color}30, ${selected.color}10)`, border: `2px solid ${selected.color}40` }}>
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: selected.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-foreground leading-tight" style={{ fontFamily: "'Amiri', serif" }}>
                    {selected.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {selected.title && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">{selected.title}</span>}
                    <span className="text-[10px] text-muted-foreground">{selected.eraAr}</span>
                    {selected.birth && <span className="text-[10px] text-muted-foreground">· {selected.birth}{selected.death && ` – ${selected.death}`}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Relations */}
            {selectedLinks.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-muted-foreground mb-2">علاقاته الأدبية · {selectedLinks.length}</p>
                <div className="space-y-1.5">
                  {selectedLinks.map((l, i) => {
                    const other = l.source.id === selected.id ? l.target : l.source;
                    return (
                      <button
                        key={i}
                        onClick={() => { const n = nodes.find(nd => nd.id === other.id); if (n) setSelected(n); }}
                        className="w-full flex items-start gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 active:scale-[0.98] transition-all text-start"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${relationColors[l.relation.type]}15` }}>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: relationColors[l.relation.type] }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[13px] font-bold text-foreground" style={{ fontFamily: "'Amiri', serif" }}>{other.name}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">{relationLabels[l.relation.type]}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{l.relation.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigate button */}
            {onSelectPoet && (
              <button
                onClick={() => onSelectPoet(selected.id)}
                className="mt-4 w-full py-3 rounded-2xl bg-primary/10 hover:bg-primary/15 text-primary text-[13px] font-bold active:scale-[0.98] transition-all border border-primary/20"
              >
                عرض قصائد {selected.name}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state hint */}
      {!selected && !showFilters && (
        <div className="ui-panel absolute bottom-4 start-1/2 -translate-x-1/2 bg-card/70 backdrop-blur-lg border border-border/20 rounded-full px-4 py-2 shadow-md z-10">
          <p className="text-[10px] text-muted-foreground text-center">اضغط على شاعر لاستكشاف علاقاته الأدبية</p>
        </div>
      )}
    </div>
  );
}
