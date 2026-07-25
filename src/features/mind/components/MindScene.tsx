import { OrbitControls, QuadraticBezierLine } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense,useMemo, useRef } from 'react';
import * as THREE from 'three';

import { anchorFor, type Hemisphere } from '../hooks/useMemoryAnchor';
import type { MindState } from '../hooks/useMindState';
import { renderParams } from '../lib/growth';

const MIND_TOKENS = {
  void: '#0A0A0A',
  organicBase: '#8B5A4A',
  organicGlow: '#FFC9A0',
  mechBase: '#2A2A2A',
  mechGlow: '#C9A84C',
  seam: '#F2E7C9',
  thread: '#C9A84C',
};

const BASE_RADIUS = 1.0;

function OrganicHemisphere({ radius, glow }: { radius: number; glow: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const geom = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 96, 64, 0, Math.PI);
    // Displace vertices with pseudo-noise for organic folding.
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n =
        Math.sin(x * 4.2) * Math.cos(y * 3.7) * 0.06 +
        Math.sin(y * 5.1 + z * 2.3) * 0.045 +
        Math.cos(z * 6.4 + x * 1.9) * 0.03;
      pos.setXYZ(i, x * (1 + n), y * (1 + n), z * (1 + n));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshStandardMaterial;
    // Gentle breathing.
    const t = performance.now() * 0.0005;
    m.emissiveIntensity = glow * (0.6 + Math.sin(t) * 0.15);
  });
  return (
    <mesh ref={ref} geometry={geom} scale={radius} rotation={[0, -Math.PI / 2, 0]}>
      <meshStandardMaterial
        color={MIND_TOKENS.organicBase}
        emissive={MIND_TOKENS.organicGlow}
        emissiveIntensity={glow}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  );
}

function MechHemisphere({ radius, glow }: { radius: number; glow: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const geom = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 20, 16, 0, Math.PI);
    // Low-poly panel look; toggle flat shading via normals reset.
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame(() => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshStandardMaterial;
    const t = performance.now() * 0.001;
    m.emissiveIntensity = glow * (0.55 + Math.sin(t * 1.3) * 0.1);
  });
  return (
    <mesh ref={ref} geometry={geom} scale={radius} rotation={[0, Math.PI / 2, 0]}>
      <meshStandardMaterial
        color={MIND_TOKENS.mechBase}
        emissive={MIND_TOKENS.mechGlow}
        emissiveIntensity={glow}
        roughness={0.35}
        metalness={0.75}
        flatShading
      />
    </mesh>
  );
}

function CorpusSeam({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius * 1.005, 0.012, 12, 96]} />
      <meshBasicMaterial color={MIND_TOKENS.seam} toneMapped={false} />
    </mesh>
  );
}

function Filaments({ hemisphere, count, radius, color }: {
  hemisphere: Hemisphere; count: number; radius: number; color: string;
}) {
  const positions = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < count; i++) {
      const seed = `${hemisphere}:${i}`;
      const a = anchorFor(seed, hemisphere, radius);
      const b = anchorFor(seed + '#', hemisphere, radius);
      arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
    return new Float32Array(arr);
  }, [hemisphere, count, radius]);
  if (!count) return null;
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.35} />
    </lineSegments>
  );
}

function FillingCore({ radius }: { radius: number }) {
  const count = Math.max(200, Math.floor(radius * 2000));
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Uniform in-sphere sampling.
      const u = Math.random();
      const r = radius * Math.cbrt(u) * 0.96;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, radius]);
  const ref = useRef<THREE.Points>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.0005;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial size={0.008} color={MIND_TOKENS.seam} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function AutoRotator({ enabled }: { enabled: boolean }) {
  useFrame((state, dt) => {
    if (!enabled) return;
    // ~4° per second.
    state.scene.rotation.y += dt * (4 * Math.PI / 180);
  });
  return null;
}

function Threads({ activeIds, mind, radius }: {
  activeIds: string[]; mind: MindState; radius: number;
}) {
  if (!activeIds.length) return null;
  const byId = new Map(mind.notes.map((n) => [n.id, n]));
  return (
    <>
      {activeIds.map((id) => {
        const n = byId.get(id);
        if (!n) return null;
        const target = anchorFor(id, n.hemisphere, radius);
        const color = n.hemisphere === 'organic' ? MIND_TOKENS.organicGlow : MIND_TOKENS.mechGlow;
        // Start from a fixed off-scene anchor to the right (RTL trailing edge).
        return (
          <QuadraticBezierLine
            key={id}
            start={[radius * 2.4, 0, 0]}
            mid={[radius * 1.4, target[1] * 0.6, 0]}
            end={[target[0], target[1], target[2]]}
            color={color}
            lineWidth={1.5}
            transparent
            opacity={0.85}
          />
        );
      })}
    </>
  );
}

export default function MindScene({
  mind,
  activeIds,
  reducedMotion,
}: {
  mind: MindState;
  activeIds: string[];
  reducedMotion: boolean;
}) {
  const { fullness, vitalityOrganic, vitalityMechanical } = mind;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const maxFilaments = isMobile ? 220 : 800;
  const params = renderParams(fullness, vitalityOrganic, vitalityMechanical, {
    baseRadius: BASE_RADIUS,
    maxFilaments,
  });

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 3.2], fov: 45 }}
      style={{ background: MIND_TOKENS.void }}
    >
      <color attach="background" args={[MIND_TOKENS.void]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[3, 2, 3]} intensity={1.2} color={MIND_TOKENS.organicGlow} />
      <pointLight position={[-3, 2, 3]} intensity={1.0} color={MIND_TOKENS.mechGlow} />
      <pointLight position={[0, -3, 2]} intensity={0.35} color={MIND_TOKENS.seam} />

      <Suspense fallback={null}>
        <group>
          <OrganicHemisphere radius={BASE_RADIUS} glow={params.organic.glowIntensity} />
          <MechHemisphere    radius={BASE_RADIUS} glow={params.mechanical.glowIntensity} />
          <CorpusSeam radius={BASE_RADIUS} />
          <Filaments hemisphere="organic"    count={params.organic.filamentCount}    radius={BASE_RADIUS} color={MIND_TOKENS.organicGlow} />
          <Filaments hemisphere="mechanical" count={params.mechanical.filamentCount} radius={BASE_RADIUS} color={MIND_TOKENS.mechGlow} />
          <FillingCore radius={params.coreRadius} />
          <Threads activeIds={activeIds} mind={mind} radius={BASE_RADIUS} />
        </group>
        <AutoRotator enabled={!reducedMotion} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={1.8}
        maxDistance={5}
        rotateSpeed={0.6}
      />
    </Canvas>
  );
}