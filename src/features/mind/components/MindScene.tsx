import { OrbitControls, Sparkles } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { MindState } from '../hooks/useMindState';
import { renderParams } from '../lib/growth';
import { MIND_TOKENS } from '../lib/mindTokens';
import MechanicalHemisphere from './MechanicalHemisphere';
import NeuralConstellation from './NeuralConstellation';
import OrganicHemisphere from './OrganicHemisphere';
import SeamHardware from './SeamHardware';

const BASE_RADIUS = 1.0;

/** Slow ceremonial turn of the whole mind, plus an almost-invisible bob. */
function AutoRotator({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!ref.current) return;
    if (enabled) ref.current.rotation.y += dt * 0.055; // ≈ 3.2°/s
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.28) * 0.012;
  });
  return <group ref={ref}>{children}</group>;
}

export interface MindSceneProps {
  mind: MindState;
  selectedId: string | null;
  onSelectNote: (id: string | null) => void;
  reducedMotion: boolean;
}

export default function MindScene({ mind, selectedId, onSelectNote, reducedMotion }: MindSceneProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const params = useMemo(
    () =>
      renderParams(mind.fullness, mind.vitalityOrganic, mind.vitalityMechanical, {
        baseRadius: BASE_RADIUS,
        maxFilaments: isMobile ? 220 : 800,
      }),
    [mind.fullness, mind.vitalityOrganic, mind.vitalityMechanical, isMobile],
  );

  return (
    <Canvas
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0.15, 0.3, 3.15], fov: 45 }}
      style={{ background: MIND_TOKENS.void }}
      onPointerMissed={() => onSelectNote(null)}
    >
      <color attach="background" args={[MIND_TOKENS.void]} />
      <fog attach="fog" args={['#0A0A0A', 4.6, 8.5]} />

      {/* Cinematic three-point rig: warm key over the cortex, cool rim on the
          chassis, soft fill under the seam. */}
      <ambientLight intensity={0.24} />
      <pointLight position={[3.4, 2.2, 2.6]} intensity={16} color={MIND_TOKENS.organicGlow} />
      <pointLight position={[-3.4, 1.8, -2.4]} intensity={13} color="#7FB4FF" />
      <pointLight position={[0, -2.6, 2.2]} intensity={5} color={MIND_TOKENS.seam} />

      <Suspense fallback={null}>
        <AutoRotator enabled={!reducedMotion}>
          <OrganicHemisphere radius={BASE_RADIUS} glow={params.organic.glowIntensity} />
          <MechanicalHemisphere radius={BASE_RADIUS} glow={params.mechanical.glowIntensity} />
          <SeamHardware radius={BASE_RADIUS} />
          <NeuralConstellation
            mind={mind}
            surfaceRadius={BASE_RADIUS * 1.03}
            selectedId={selectedId}
            onSelect={(id) => onSelectNote(selectedId === id ? null : id)}
          />
        </AutoRotator>

        {/* Ambient thought-dust drifting around the mind. */}
        <Sparkles
          count={isMobile ? 70 : 150}
          scale={[4.6, 4.6, 4.6]}
          size={2.2}
          speed={0.22}
          opacity={0.32}
          color={MIND_TOKENS.seam}
        />
      </Suspense>

      {!isMobile && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={1.05} luminanceThreshold={0.24} luminanceSmoothing={0.34} mipmapBlur radius={0.72} />
        </EffectComposer>
      )}

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={1.65}
        maxDistance={5.2}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
