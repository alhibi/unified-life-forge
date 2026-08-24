import { Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { MIND_TOKENS } from '../lib/mindTokens';
import {
  buildNeuralGraph,
  type GraphInputNote,
  sampleArc,
} from '../lib/neuralGraph';

const ARC_SEGMENTS = 36;

/**
 * The living constellation: one glowing node per real note, arcs for every
 * real wiki-link between notes. Nodes pulse; selected nodes ring; a light
 * packet travels along each arc of the active subgraph.
 */
export default function NeuralConstellation({
  mind,
  surfaceRadius,
  selectedId,
  onSelect,
}: {
  /** Minimal shape — the full MindState satisfies it structurally. */
  mind: {
    notes: Array<{
      id: string;
      hemisphere: 'organic' | 'mechanical';
      wordCount: number;
      backlinkCount: number;
    }>;
    links: Array<[string, string]>;
  };
  surfaceRadius: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const graph = useMemo(() => {
    const maxMass = Math.max(
      1e-9,
      ...mind.notes.map((n) => Math.log(1 + n.wordCount) * (1 + 0.25 * n.backlinkCount)),
    );
    const inputs: GraphInputNote[] = mind.notes.map((n) => ({
      id: n.id,
      hemisphere: n.hemisphere,
      weight: Math.min(1, (Math.log(1 + n.wordCount) * (1 + 0.25 * n.backlinkCount)) / maxMass),
    }));
    return buildNeuralGraph(inputs, mind.links, surfaceRadius);
  }, [mind.notes, mind.links, surfaceRadius]);

  // Pre-sample every arc once per graph.
  const arcData = useMemo(() => {
    return graph.arcs.map((arc) => {
      const a = graph.nodeById.get(arc.sourceId)!;
      const b = graph.nodeById.get(arc.targetId)!;
      const pts = sampleArc(a.position, b.position, surfaceRadius, ARC_SEGMENTS);
      const arr: Array<[number, number, number]> = [];
      for (let i = 0; i < pts.length; i += 3) arr.push([pts[i], pts[i + 1], pts[i + 2]]);
      return { key: `${arc.sourceId}->${arc.targetId}`, sourceId: arc.sourceId, targetId: arc.targetId, crossHemisphere: arc.crossHemisphere, points: arr };
    });
  }, [graph, surfaceRadius]);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeIds = useMemo(() => {
    const s = new Set<string>();
    if (selectedId) s.add(selectedId);
    if (hoveredId) s.add(hoveredId);
    return s;
  }, [selectedId, hoveredId]);

  const nodeColor = (hemi: 'organic' | 'mechanical') =>
    hemi === 'organic' ? MIND_TOKENS.organicGlow : MIND_TOKENS.mechGlow;

  // --- shared animation -----------------------------------------------------
  const packetRefs = useRef<Array<THREE.Mesh | null>>([]);
  const nodeRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;

    // Node breathing: gentle scale oscillation, stronger when active.
    let idx = 0;
    nodeRefs.current.forEach((mesh) => {
      const base = mesh.userData.baseSize as number;
      const isActive = mesh.userData.isActive as boolean;
      const wobble = Math.sin(t * 2.2 + idx * 1.7) * 0.12 + 1;
      const target = isActive ? base * 1.9 : base * wobble;
      mesh.scale.setScalar(mesh.scale.x + (target - mesh.scale.x) * Math.min(1, dt * 10));
      idx++;
    });

    // Light packets riding the active arcs.
    for (const mesh of packetRefs.current) {
      if (!mesh) continue;
      const data = mesh.userData as { points: Array<[number, number, number]>; offset: number; speed: number };
      data.offset = (data.offset + dt * data.speed) % 1;
      const f = data.offset * (data.points.length - 1);
      const i0 = Math.floor(f);
      const i1 = Math.min(data.points.length - 1, i0 + 1);
      const k = f - i0;
      const p0 = data.points[i0];
      const p1 = data.points[i1];
      mesh.position.set(
        p0[0] + (p1[0] - p0[0]) * k,
        p0[1] + (p1[1] - p0[1]) * k,
        p0[2] + (p1[2] - p0[2]) * k,
      );
      mesh.visible = true;
    }
  });

  const activeArcs = arcData.filter((a) => activeIds.has(a.sourceId) || activeIds.has(a.targetId));
  const idleArcs = arcData.filter((a) => !activeIds.has(a.sourceId) && !activeIds.has(a.targetId));

  if (!graph.nodes.length) return null;

  return (
    <group>
      {/* --- idle arcs (dim gold threads) --- */}
      {idleArcs.map((arc) => (
        <Line
          key={arc.key}
          points={arc.points}
          color={arc.crossHemisphere ? MIND_TOKENS.seam : MIND_TOKENS.thread}
          lineWidth={arc.crossHemisphere ? 1.4 : 1}
          transparent
          opacity={0.28}
          toneMapped={false}
        />
      ))}

      {/* --- active arcs (bright, with traveling light packets) --- */}
      {activeArcs.map((arc, i) => (
        <group key={`act-${arc.key}`}>
          <Line
            points={arc.points}
            color={MIND_TOKENS.seam}
            lineWidth={2}
            transparent
            opacity={0.95}
            toneMapped={false}
          />
          <mesh
            ref={(m) => {
              packetRefs.current[i] = m;
              if (m) {
                m.userData.points = arc.points;
                m.userData.offset = (i * 0.37) % 1;
                m.userData.speed = 0.35 + (i % 5) * 0.12;
              }
            }}
          >
            <sphereGeometry args={[0.014, 10, 8]} />
            <meshBasicMaterial color={MIND_TOKENS.seam} toneMapped={false} blending={THREE.AdditiveBlending} transparent opacity={0.95} />
          </mesh>
        </group>
      ))}

      {/* --- nodes --- */}
      {graph.nodes.map((node) => {
        const isActive = activeIds.has(node.id);
        const isSelected = selectedId === node.id;
        return (
          <group key={node.id} position={node.position}>
            {/* Hit proxy: slightly larger invisible sphere for easy picking. */}
            <mesh
              visible={false}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                setHoveredId(node.id);
              }}
              onPointerOut={() => setHoveredId(null)}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelect(node.id);
              }}
            >
              <sphereGeometry args={[Math.max(0.03, node.size * 2.4), 10, 8]} />
            </mesh>

            <mesh
              ref={(m) => {
                if (m) {
                  nodeRefs.current.set(node.id, m);
                  m.userData.baseSize = node.size;
                  m.userData.isActive = isActive;
                } else {
                  nodeRefs.current.delete(node.id);
                }
              }}
            >
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial
                color={nodeColor(node.hemisphere)}
                toneMapped={false}
              />
            </mesh>

            {/* Selection halo ring, billboarded to the camera. */}
            {isSelected && (
              <BillboardHalo radius={node.size * 3.4} color={nodeColor(node.hemisphere)} />
            )}
          </group>
        );
      })}
    </group>
  );
}

/** Thin billboard ring used as the selection marker. */
function BillboardHalo({ radius, color }: { radius: number; color: string }) {
  const ref = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }, [color]);

  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.SpriteMaterial;
    const pulse = 0.75 + Math.sin(state.clock.elapsedTime * 4) * 0.25;
    mat.opacity = pulse;
    ref.current.scale.setScalar(radius * (1.8 + Math.sin(state.clock.elapsedTime * 4) * 0.15));
  });

  return (
    <sprite ref={ref}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
