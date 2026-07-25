import { MeshDistortMaterial,OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense,useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { JournalMoodBalance } from '../types';

/**
 * BrainScene — the hero of "مذكرتي".
 *
 * Two hemispheres, hard-cut down the middle:
 *   - Left  (organic)    : soft distorted sphere, warm copper glow, breathing.
 *   - Right (analytical) : low-poly faceted sphere, cooler cyan wireframe.
 *
 * The two sides scale/dim with the mood balance of the user's journal, and
 * the whole assembly grows a little as the entry count climbs (v1 growth arc).
 */

const COPPER = '#C8A96E';        // warm — matches Knowledge accent
const ORGANIC_CORE = '#3A2418';  // deep organic base
const COOL = '#7EB8C9';          // cool cyan — matches Watches accent
const MECH_CORE = '#1A1F26';     // gunmetal base

function useGrowth(total: number) {
  // Base 1.0 → grows toward ~1.35 as entries accumulate (asymptotic).
  return useMemo(() => 1 + 0.35 * (1 - 1 / (1 + total / 24)), [total]);
}

function OrganicHemisphere({ radius, intensity }: { radius: number; intensity: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.05;
  });
  return (
    <mesh
      ref={ref}
      scale={radius}
      // Rotate so the flat cut faces +X (the seam), organic half fills -X.
      rotation={[0, -Math.PI / 2, 0]}
    >
      <sphereGeometry args={[1, 96, 64, 0, Math.PI]} />
      <MeshDistortMaterial
        color={ORGANIC_CORE}
        emissive={COPPER}
        emissiveIntensity={0.35 + 0.5 * intensity}
        distort={0.32}
        speed={1.1}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  );
}

function MechHemisphere({ radius, intensity }: { radius: number; intensity: number }) {
  const geom = useMemo(() => {
    // Very low segment count → faceted low-poly panels.
    const g = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI);
    g.computeVertexNormals();
    return g;
  }, []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y -= dt * 0.05;
  });
  return (
    <group>
      <mesh ref={ref} geometry={geom} scale={radius} rotation={[0, Math.PI / 2, 0]}>
        <meshStandardMaterial
          color={MECH_CORE}
          emissive={COOL}
          emissiveIntensity={0.2 + 0.35 * intensity}
          roughness={0.4}
          metalness={0.75}
          flatShading
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh geometry={geom} scale={radius * 1.001} rotation={[0, Math.PI / 2, 0]}>
        <meshBasicMaterial color={COOL} wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function Seam({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius * 1.003, 0.008, 12, 128]} />
      <meshBasicMaterial color="#F2E7C9" toneMapped={false} />
    </mesh>
  );
}

function BreathingAssembly({ balance }: { balance: JournalMoodBalance }) {
  const groupRef = useRef<THREE.Group>(null);
  const growth = useGrowth(balance.total);
  // Organic gets more room when the ratio > 0.5; analytical gets more < 0.5.
  // Clamp so a single entry doesn't collapse the other side.
  const organicScale = 0.85 + 0.3 * balance.organicRatio;
  const mechScale = 0.85 + 0.3 * (1 - balance.organicRatio);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Idle drift — very slow horizontal rotation.
    groupRef.current.rotation.y = Math.sin(t * 0.08) * 0.12;
    // Breath — subtle scale pulse (~4s cycle).
    const breath = 1 + Math.sin(t * 1.6) * 0.012;
    groupRef.current.scale.setScalar(growth * breath);
  });

  return (
    <group ref={groupRef}>
      <OrganicHemisphere radius={organicScale} intensity={balance.organicRatio} />
      <MechHemisphere    radius={mechScale}    intensity={1 - balance.organicRatio} />
      <Seam radius={Math.max(organicScale, mechScale)} />
    </group>
  );
}

export default function BrainScene({
  balance,
  reducedMotion = false,
}: {
  balance: JournalMoodBalance;
  reducedMotion?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 3.1], fov: 45 }}
      style={{ background: '#080808' }}
    >
      <color attach="background" args={['#080808']} />
      <ambientLight intensity={0.25} />
      {/* Copper key on the organic side */}
      <pointLight position={[-2.6, 1.6, 2.4]} intensity={1.15} color={COPPER} />
      {/* Cool rim on the mechanical side */}
      <pointLight position={[2.6, 1.4, 2.4]} intensity={0.95} color={COOL} />
      {/* Soft under-fill */}
      <pointLight position={[0, -2.5, 1.5]} intensity={0.3} color="#F2E7C9" />

      <Suspense fallback={null}>
        <BreathingAssembly balance={balance} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate={!reducedMotion}
        rotateSpeed={0.5}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}