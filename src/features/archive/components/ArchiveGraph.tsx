import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { ArrowUpSquare, Hash, Search, X } from '@/lib/icons';

import type { ArchiveDocumentSummary } from '../types';

interface GraphNode {
  id: string; // "doc-[id]" or "tag-[tag]"
  type: 'doc' | 'tag';
  label: string;
  count?: number; // for tag nodes
  docId?: string; // back-ref
  tags?: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null; // drag anchor
  fy?: number | null;
}

interface GraphLink {
  source: string;
  target: string;
}

interface ArchiveGraphProps {
  items: ArchiveDocumentSummary[];
  onOpenDoc: (id: string) => void;
}

export default function ArchiveGraph({ items, onOpenDoc }: ArchiveGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dragNodeRef = useRef<GraphNode | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);

  // Transform items into a clean Tag <-> Document graph model
  const { nodes, links } = useMemo(() => {
    const docNodes: GraphNode[] = items.map((doc, idx) => {
      // Circle layout initial positions to avoid overlap
      const angle = (idx / items.length) * Math.PI * 2;
      const radius = 150 + Math.random() * 80;
      return {
        id: `doc-${doc.id}`,
        type: 'doc',
        label: doc.title,
        docId: doc.id,
        tags: doc.tags,
        x: 400 + Math.cos(angle) * radius,
        y: 350 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    // Extract all unique tags
    const tagToDocIds: Record<string, string[]> = {};
    items.forEach((doc) => {
      doc.tags.forEach((t) => {
        if (!tagToDocIds[t]) tagToDocIds[t] = [];
        tagToDocIds[t].push(doc.id);
      });
    });

    const tagNodes: GraphNode[] = Object.keys(tagToDocIds).map((tag, idx) => {
      const angle = (idx / Object.keys(tagToDocIds).length) * Math.PI * 2;
      const radius = 60 + Math.random() * 40;
      return {
        id: `tag-${tag}`,
        type: 'tag',
        label: tag,
        count: tagToDocIds[tag].length,
        x: 400 + Math.cos(angle) * radius,
        y: 350 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    const links: GraphLink[] = [];
    items.forEach((doc) => {
      doc.tags.forEach((t) => {
        links.push({
          source: `doc-${doc.id}`,
          target: `tag-${t}`,
        });
      });
    });

    return { nodes: [...tagNodes, ...docNodes], links };
  }, [items]);

  // Sync state nodes with simulation reference
  useEffect(() => {
    // Keep positions if the node was already in the simulation to prevent jumps
    const map = new Map(nodesRef.current.map((n) => [n.id, n]));
    nodesRef.current = nodes.map((n) => {
      const prev = map.get(n.id);
      if (prev) {
        return { ...n, x: prev.x, y: prev.y, vx: prev.vx, vy: prev.vy, fx: prev.fx, fy: prev.fy };
      }
      return n;
    });
  }, [nodes]);

  // Run customized high-fidelity force-directed spring simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = containerRef.current?.clientWidth || 800;
    const height = 500;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const simulationLoop = () => {
      const currentNodes = nodesRef.current;
      const kRepulsion = 1200; // Push strength
      const kAttraction = 0.04; // Spring tightness
      const springRestLength = 90;
      const centerPull = 0.015; // Gravity pull to center
      const damping = 0.85; // Air resistance

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Calculate repulsion forces between all node pairs
      for (let i = 0; i < currentNodes.length; i++) {
        const n1 = currentNodes[i];
        for (let j = i + 1; j < currentNodes.length; j++) {
          const n2 = currentNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy || 0.01;
          const dist = Math.sqrt(distSq);

          if (dist < 280) {
            // Strong push when close
            const force = kRepulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Calculate attraction forces for all active link pairs
      links.forEach((link) => {
        const sourceNode = currentNodes.find((n) => n.id === link.source);
        const targetNode = currentNodes.find((n) => n.id === link.target);
        if (!sourceNode || !targetNode) return;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

        const force = kAttraction * (dist - springRestLength);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        sourceNode.vx += fx;
        sourceNode.vy += fy;
        targetNode.vx -= fx;
        targetNode.vy -= fy;
      });

      // 3. Apply center gravity, limit boundaries and update positions
      currentNodes.forEach((node) => {
        if (node.fx !== undefined && node.fx !== null) {
          node.x = node.fx;
          node.y = node.fy!;
          node.vx = 0;
          node.vy = 0;
          return;
        }

        // Pull to center
        node.vx += (centerX - node.x) * centerPull;
        node.vy += (centerY - node.y) * centerPull;

        node.x += node.vx;
        node.y += node.vy;

        node.vx *= damping;
        node.vy *= damping;

        // Keep inside bounds
        const padding = 24;
        if (node.x < padding) {
          node.x = padding;
          node.vx = 0;
        }
        if (node.x > width - padding) {
          node.x = width - padding;
          node.vx = 0;
        }
        if (node.y < padding) {
          node.y = padding;
          node.vy = 0;
        }
        if (node.y > height - padding) {
          node.y = height - padding;
          node.vy = 0;
        }
      });

      // 4. Paint the canvas
      ctx.clearRect(0, 0, width, height);

      // Render links
      links.forEach((link) => {
        const sourceNode = currentNodes.find((n) => n.id === link.source);
        const targetNode = currentNodes.find((n) => n.id === link.target);
        if (!sourceNode || !targetNode) return;

        // Highlight link if connected to hovered node
        const isHighlighted = hoveredNodeId === sourceNode.id || hoveredNodeId === targetNode.id;

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.lineWidth = isHighlighted ? 1.5 : 0.6;
        ctx.strokeStyle = isHighlighted ? 'rgba(200, 169, 110, 0.45)' : 'rgba(255, 255, 255, 0.07)';
        ctx.stroke();
      });

      // Render nodes
      currentNodes.forEach((node) => {
        const isHovered = hoveredNodeId === node.id;
        const isMatched = searchQuery
          ? node.label.toLowerCase().includes(searchQuery.toLowerCase())
          : false;

        // Base sizes
        const size = node.type === 'tag' ? 8 : 5;
        const outerRing = size + (isHovered ? 6 : 4);

        // Ambient glow around active tags/matched nodes
        if (isMatched || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, outerRing + 8, 0, Math.PI * 2);
          ctx.fillStyle =
            node.type === 'tag' ? 'rgba(200, 169, 110, 0.06)' : 'rgba(212, 165, 201, 0.06)';
          ctx.fill();
        }

        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, outerRing, 0, Math.PI * 2);
        ctx.fillStyle =
          node.type === 'tag' ? 'rgba(200, 169, 110, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = isMatched
          ? '#C8A96E'
          : node.type === 'tag'
            ? '#C8A96E'
            : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = isMatched || isHovered ? 2 : 1;
        ctx.fill();
        ctx.stroke();

        // Draw core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fillStyle = node.type === 'tag' ? '#C8A96E' : '#7EB8C9';
        ctx.fill();

        // Text Labels
        ctx.font =
          node.type === 'tag' ? 'bold 10px Tajawal, sans-serif' : '9px Tajawal, sans-serif';
        ctx.fillStyle = isHovered
          ? '#C8A96E'
          : node.type === 'tag'
            ? 'rgba(255, 255, 255, 0.8)'
            : 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'center';

        // Draw abbreviated or full text slightly shifted below
        const labelText =
          node.type === 'doc' && node.label.length > 20
            ? node.label.slice(0, 18) + '…'
            : node.label;
        ctx.fillText(labelText, node.x, node.y + outerRing + 12);
      });

      animationFrameRef.current = requestAnimationFrame(simulationLoop);
    };

    simulationLoop();

    // Responsive canvas resizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = entry.contentRect.width;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [links, hoveredNodeId, searchQuery]);

  // Drag and hover event handlers
  const getMousePos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Support mouse and touch coordinate extraction
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const findNodeAt = (x: number, y: number) => {
    return (
      nodesRef.current.find((node) => {
        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        return dist < 24; // Grab radius
      }) || null
    );
  };

  const handlePointerDown = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const pos = getMousePos(e);
    const node = findNodeAt(pos.x, pos.y);
    if (node) {
      dragNodeRef.current = node;
      node.fx = pos.x;
      node.fy = pos.y;
    }
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const pos = getMousePos(e);

    // Hover checking
    if (!dragNodeRef.current) {
      const node = findNodeAt(pos.x, pos.y);
      setHoveredNodeId(node ? node.id : null);
    } else {
      const node = dragNodeRef.current;
      node.fx = pos.x;
      node.fy = pos.y;
    }
  };

  const handlePointerUp = (
    _e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (dragNodeRef.current) {
      dragNodeRef.current.fx = null;
      dragNodeRef.current.fy = null;

      // Tap/click triggers selection if mouse didn't drag far
      setSelectedNode(dragNodeRef.current);
      dragNodeRef.current = null;
    }
  };

  const docSummary = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'doc') return null;
    return items.find((d) => d.id === selectedNode.docId) || null;
  }, [selectedNode, items]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search Node bar */}
      <AppCard compact className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث في فروع شبكة المعرفة دلالياً…"
          className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground/60"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} aria-label="مسح">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </AppCard>

      {/* Graph Area */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl border border-border bg-card overflow-hidden h-[340px] md:h-[400px] cursor-grab active:cursor-grabbing"
      >
        <div className="absolute top-3 end-3 z-raised flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>وسوم وتصنيفات</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[#7EB8C9]" />
            <span>مونوغرافات معرفية</span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="absolute inset-0 block"
        />
      </div>

      {/* Details drawer/card on node select */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          >
            <AppCard className="relative overflow-hidden border-primary/25 bg-primary/[0.02]">
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-3 start-3 w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center active:scale-90 transition-transform"
                aria-label="إغلاق"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {selectedNode.type === 'tag' ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-1 text-primary">
                    <Hash className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      تصنيف معرفي
                    </span>
                  </div>
                  <h4 className="text-[16px] font-bold text-foreground">
                    الوسم: #{selectedNode.label}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    مرتبط بـ {selectedNode.count} مونوغرافات في الأرشيف المعرفي الخاص بك.
                  </p>
                </div>
              ) : (
                docSummary && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-primary/70">
                        № {String(docSummary.accession_number).padStart(6, '0')}
                      </span>
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted/60">
                        {docSummary.depth === 'standard'
                          ? 'قياسي'
                          : docSummary.depth === 'deep'
                            ? 'متعمّق'
                            : 'أقصى'}
                      </span>
                    </div>

                    <h4 className="text-[15px] font-bold text-foreground leading-snug line-clamp-2">
                      {docSummary.title}
                    </h4>

                    {docSummary.abstract && (
                      <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">
                        {docSummary.abstract}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border/10">
                      <div className="flex flex-wrap gap-1">
                        {docSummary.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => onOpenDoc(docSummary.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-primary active:scale-95 transition-transform"
                      >
                        <span>قراءة</span>
                        <ArrowUpSquare className="w-3.5 h-3.5 rotate-90" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </AppCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
