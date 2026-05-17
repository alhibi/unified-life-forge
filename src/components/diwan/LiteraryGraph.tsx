import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Maximize2, Filter, Info } from 'lucide-react';
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

// ─── Force-directed simulation types ─────────────────────────────────
interface SimNode extends PoetNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
  relation: LiteraryRelation;
}

// ─── Force simulation parameters ─────────────────────────────────────
const REPULSION = 3500;
const ATTRACTION = 0.006;
const DAMPING = 0.88;
const CENTER_GRAVITY = 0.01;
const LINK_DISTANCE = 160;
const MAX_ITERATIONS = 200;

function forceSimulation(nodes: SimNode[], links: SimLink[], width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx += fx;
        nodes[i].vy += fy;
        nodes[j].vx -= fx;
        nodes[j].vy -= fy;
      }
    }

    // Attraction along links
    for (const link of links) {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - LINK_DISTANCE) * ATTRACTION;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      link.source.vx += fx;
      link.source.vy += fy;
      link.target.vx -= fx;
      link.target.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (cx - node.x) * CENTER_GRAVITY;
      node.vy += (cy - node.y) * CENTER_GRAVITY;
    }

    // Apply velocities with damping
    for (const node of nodes) {
      if (node.fx !== undefined) { node.x = node.fx; node.vx = 0; }
      else { node.vx *= DAMPING; node.x += node.vx; }
      if (node.fy !== undefined) { node.y = node.fy; node.vy = 0; }
      else { node.vy *= DAMPING; node.y += node.vy; }
      // Clamp within bounds
      node.x = Math.max(50, Math.min(width - 50, node.x));
      node.y = Math.max(50, Math.min(height - 50, node.y));
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────
interface LiteraryGraphProps {
  onSelectPoet?: (poetId: string) => void;
  initialPoetId?: string;
}

export default function LiteraryGraph({ onSelectPoet, initialPoetId }: LiteraryGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<RelationType>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(false);
  const [lastTouchDist, setLastTouchDist] = useState<number | null>(null);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width || 800,
        height: entry.contentRect.height || 600,
      });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Build simulation
  const { nodes, links } = useMemo(() => {
    const { width, height } = dimensions;
    const simNodes: SimNode[] = poetNodes.map((p, i) => ({
      ...p,
      x: width / 2 + Math.cos((i / poetNodes.length) * Math.PI * 2) * (width * 0.35),
      y: height / 2 + Math.sin((i / poetNodes.length) * Math.PI * 2) * (height * 0.35),
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(simNodes.map(n => [n.id, n]));

    const simLinks: SimLink[] = literaryRelations
      .filter(r => nodeMap.has(r.source) && nodeMap.has(r.target))
      .map(r => ({
        source: nodeMap.get(r.source)!,
        target: nodeMap.get(r.target)!,
        relation: r,
      }));

    forceSimulation(simNodes, simLinks, width, height);
    return { nodes: simNodes, links: simLinks };
  }, [dimensions]);

  // Filter links
  const filteredLinks = useMemo(() => {
    if (activeFilters.size === 0) return links;
    return links.filter(l => activeFilters.has(l.relation.type));
  }, [links, activeFilters]);

  // Highlighted connections for selected/hovered node
  const highlightedIds = useMemo(() => {
    const focusId = selectedNode?.id || hoveredNode;
    if (!focusId) return new Set<string>();
    const ids = new Set<string>([focusId]);
    for (const link of filteredLinks) {
      if (link.source.id === focusId) ids.add(link.target.id);
      if (link.target.id === focusId) ids.add(link.source.id);
    }
    return ids;
  }, [selectedNode, hoveredNode, filteredLinks]);

  // Pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.graph-node, .graph-ui')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setTransform(t => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }, [isDragging, dragStart]);

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  // Zoom
  const zoom = useCallback((delta: number) => {
    setTransform(t => ({ ...t, scale: Math.max(0.3, Math.min(3, t.scale + delta)) }));
  }, []);

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY > 0 ? -0.1 : 0.1);
  }, [zoom]);

  // Touch pinch-to-zoom
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist !== null) {
        const delta = (dist - lastTouchDist) * 0.005;
        zoom(delta);
      }
      setLastTouchDist(dist);
    }
  }, [zoom, lastTouchDist]);

  const handleTouchEnd = useCallback(() => {
    setLastTouchDist(null);
  }, []);

  const toggleFilter = (type: RelationType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Find connected relations for selected node
  const selectedRelations = useMemo(() => {
    if (!selectedNode) return [];
    return filteredLinks.filter(
      l => l.source.id === selectedNode.id || l.target.id === selectedNode.id
    );
  }, [selectedNode, filteredLinks]);

  // Focus on initial poet
  useEffect(() => {
    if (initialPoetId) {
      const node = nodes.find(n => n.id === initialPoetId);
      if (node) {
        setSelectedNode(node);
        setTransform({
          x: dimensions.width / 2 - node.x,
          y: dimensions.height / 2 - node.y,
          scale: 1.2,
        });
      }
    }
  }, [initialPoetId, nodes, dimensions]);

  return (
    <div ref={containerRef} className="relative w-full h-[70vh] min-h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-background via-card to-background border border-border/40">
      {/* SVG Graph */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <defs>
          {/* Background dot pattern */}
          <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="0.8" fill="currentColor" opacity="0.08" />
          </pattern>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Arrow markers for each relation type */}
          {Object.entries(relationColors).map(([type, color]) => (
            <marker
              key={type}
              id={`arrow-${type}`}
              viewBox="0 0 10 10"
              refX="28"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} opacity="0.7" />
            </marker>
          ))}
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Background pattern */}
          <rect x="-2000" y="-2000" width="4000" height="4000" fill="url(#dot-grid)" />
          {/* Links */}
          {filteredLinks.map((link, i) => {
            const isHighlighted = highlightedIds.size === 0 || (highlightedIds.has(link.source.id) && highlightedIds.has(link.target.id));
            const color = relationColors[link.relation.type];
            return (
              <g key={i}>
                <line
                  x1={link.source.x}
                  y1={link.source.y}
                  x2={link.target.x}
                  y2={link.target.y}
                  stroke={color}
                  strokeWidth={isHighlighted ? 2.5 : 1}
                  strokeOpacity={isHighlighted ? 0.8 : 0.15}
                  markerEnd={link.relation.type === 'influenced' || link.relation.type === 'teacher_student' ? `url(#arrow-${link.relation.type})` : undefined}
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isHighlighted = highlightedIds.size === 0 || highlightedIds.has(node.id);
            const isSelected = selectedNode?.id === node.id;
            return (
              <g
                key={node.id}
                className="graph-node cursor-pointer"
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(isSelected ? null : node);
                }}
                onPointerEnter={() => setHoveredNode(node.id)}
                onPointerLeave={() => setHoveredNode(null)}
                style={{ opacity: isHighlighted ? 1 : 0.2, transition: 'opacity 0.3s ease' }}
              >
                {/* Outer ring for selected */}
                {isSelected && (
                  <circle r="26" fill="none" stroke={node.color} strokeWidth="2" strokeDasharray="4 2" opacity="0.6">
                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Node circle */}
                <circle
                  r="20"
                  fill={node.color}
                  fillOpacity={isSelected ? 0.25 : 0.12}
                  stroke={node.color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  filter={isSelected ? 'url(#glow)' : undefined}
                  className="transition-all duration-300"
                />
                {/* Inner dot */}
                <circle r="6" fill={node.color} opacity="0.9" />
                {/* Name label */}
                <text
                  y="32"
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-semibold pointer-events-none select-none"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {node.name}
                </text>
                {/* Era badge */}
                <text
                  y="44"
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

      {/* Controls */}
      <div className="graph-ui absolute top-3 start-3 flex flex-col gap-2 z-10">
        <button onClick={() => zoom(0.2)} className="w-9 h-9 rounded-xl bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          <ZoomIn className="w-4 h-4 text-foreground" />
        </button>
        <button onClick={() => zoom(-0.2)} className="w-9 h-9 rounded-xl bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          <ZoomOut className="w-4 h-4 text-foreground" />
        </button>
        <button onClick={resetView} className="w-9 h-9 rounded-xl bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          <Maximize2 className="w-4 h-4 text-foreground" />
        </button>
        <button onClick={() => setShowFilters(!showFilters)} className="w-9 h-9 rounded-xl bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          <Filter className="w-4 h-4 text-foreground" />
        </button>
        <button onClick={() => setShowInfo(!showInfo)} className="w-9 h-9 rounded-xl bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
          <Info className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="graph-ui absolute top-3 start-14 bg-card/95 backdrop-blur-md border border-border/40 rounded-xl p-3 shadow-lg z-10"
          >
            <p className="text-[11px] font-semibold text-foreground mb-2">تصفية العلاقات</p>
            <div className="space-y-1.5">
              {(Object.entries(relationLabels) as [RelationType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[11px] transition-colors ${
                    activeFilters.size === 0 || activeFilters.has(type)
                      ? 'bg-muted/50 text-foreground'
                      : 'text-muted-foreground opacity-50'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: relationColors[type] }} />
                  {label}
                </button>
              ))}
            </div>
            {activeFilters.size > 0 && (
              <button
                onClick={() => setActiveFilters(new Set())}
                className="mt-2 w-full text-[10px] text-primary font-medium"
              >
                إظهار الكل
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="graph-ui absolute bottom-14 start-3 end-3 bg-card/95 backdrop-blur-md border border-border/40 rounded-xl p-3 shadow-lg z-10"
          >
            <p className="text-[12px] font-semibold text-foreground mb-1">دليل الشجرة الأدبية</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              • اضغط على شاعر لرؤية علاقاته الأدبية
              <br />• اسحب لتحريك الخريطة، وقرّب/بعّد بالعجلة
              <br />• الخطوط تمثّل العلاقات: تأثير، تتلمذ، نقائض، معاصرة
              <br />• استخدم الفلتر لعرض نوع محدد من العلاقات
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Node Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="graph-ui absolute bottom-3 start-3 end-3 max-h-[40%] overflow-y-auto bg-card/95 backdrop-blur-md border border-border/40 rounded-2xl p-4 shadow-xl z-20"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedNode.color}20` }}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] text-foreground" style={{ fontFamily: "'Amiri', serif" }}>
                    {selectedNode.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedNode.title && <span className="text-primary">{selectedNode.title}</span>}
                    {selectedNode.title && ' · '}
                    {selectedNode.eraAr}
                    {selectedNode.birth && ` · ${selectedNode.birth}`}
                    {selectedNode.death && ` – ${selectedNode.death}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Relations list */}
            {selectedRelations.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground">العلاقات الأدبية ({selectedRelations.length})</p>
                {selectedRelations.map((link, i) => {
                  const other = link.source.id === selectedNode.id ? link.target : link.source;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const otherNode = nodes.find(n => n.id === other.id);
                        if (otherNode) setSelectedNode(otherNode);
                      }}
                      className="w-full flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-start"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: relationColors[link.relation.type] }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-semibold text-foreground">{other.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {relationLabels[link.relation.type]}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                          {link.relation.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigate to poet button */}
            {onSelectPoet && (
              <button
                onClick={() => onSelectPoet(selectedNode.id)}
                className="mt-3 w-full py-2 rounded-xl bg-primary/10 text-primary text-[12px] font-semibold active:bg-primary/20 transition-colors"
              >
                عرض قصائد {selectedNode.name}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Era Legend */}
      <div className="graph-ui absolute top-3 end-3 bg-card/90 backdrop-blur-sm border border-border/40 rounded-xl p-2.5 z-10">
        <p className="text-[9px] font-semibold text-muted-foreground mb-1.5">العصور</p>
        <div className="space-y-1">
          {Object.entries(eraColors).map(([era, color]) => (
            <div key={era} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-muted-foreground">
                {era === 'jahili' ? 'الجاهلي' :
                 era === 'mukhadram' ? 'المخضرم' :
                 era === 'islami' ? 'الإسلامي' :
                 era === 'umawi' ? 'الأموي' :
                 era === 'abbasi' ? 'العباسي' : 'الأندلسي'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
