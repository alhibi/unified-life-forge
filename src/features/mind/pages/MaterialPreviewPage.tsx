import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  ORGANIC_PALETTE,
  PREVIEW_STAGE,
  STUDIO_RIG,
  TECHNO_PALETTE,
} from '../lib/three/materials/livingMindPalette';
import { createOrganicMaterial } from '../lib/three/materials/organicMaterial';
import { createTechnoMaterial } from '../lib/three/materials/technoMaterial';

/**
 * Stage-1 material preview — isolated route (/dev/material-preview).
 * Two plain spheres, one per hemisphere material, under a shared three-point
 * studio rig. Zero geometry detail on purpose: if the materials don't look
 * expensive here, no amount of brain folding will save them later.
 */

function MaterialSphere({
  positionX,
  material,
}: {
  positionX: number;
  material: THREE.Material;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.18;
  });
  return (
    <mesh ref={ref} material={material} position={[positionX, 0, 0]}>
      <sphereGeometry args={[1, 96, 64]} />
    </mesh>
  );
}

/** Shared three-point studio rig — identical logic lights both natures. */
function StudioRig() {
  return (
    <>
      {/* Key: warm tungsten upper-right. */}
      <directionalLight position={[3.6, 3.2, 2.6]} intensity={2.1} color={STUDIO_RIG.key} />
      {/* Fill: cool north-window opposite, low. */}
      <directionalLight position={[-3.8, -0.4, 2.2]} intensity={0.5} color={STUDIO_RIG.fill} />
      {/* Back: pure separation behind. */}
      <directionalLight position={[0, 1.4, -3.6]} intensity={1.3} color={STUDIO_RIG.back} />

      {/* In-memory softbox environment — no network fetch, baked once. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} color={STUDIO_RIG.key} position={[3, 3, 2]} scale={[5, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.9} color={STUDIO_RIG.fill} position={[-4, 0.5, 1]} scale={[5, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="circle" intensity={1.6} color={STUDIO_RIG.back} position={[0, 2, -4]} scale={[4, 4, 1]} target={[0, 0, 0]} />
        {/* A dim floor bounce so undersides never go dead black. */}
        <Lightformer form="rect" intensity={0.35} color={PREVIEW_STAGE.void} position={[0, -3.4, 0]} scale={[8, 8, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}

function ChipRow({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-micro tracking-[0.2em] text-[color:#F2E7C9]/45"
        style={{ fontFamily: '"IBM Plex Mono", monospace' }}
      >
        {title}
      </span>
      <div className="flex gap-1">
        {values.map((hex) => (
          <div key={hex} className="flex flex-col items-center gap-0.5">
            <span className="h-4 w-4 rounded-[4px] border border-white/15" style={{ background: hex }} />
            <span
              className="text-micro leading-none text-[color:#F2E7C9]/35 tabular-nums"
              style={{ fontFamily: '"IBM Plex Mono", monospace' }}
            >
              {hex}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MaterialPreviewPage() {
  const organic = useMemo(() => createOrganicMaterial(), []);
  const techno = useMemo(() => createTechnoMaterial(), []);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden" style={{ background: PREVIEW_STAGE.void }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0.15, 4.7], fov: 40 }}
      >
        <color attach="background" args={[PREVIEW_STAGE.void]} />
        <Suspense fallback={null}>
          <StudioRig />
          <group position={[0, 0.1, 0]}>
            <MaterialSphere positionX={-1.42} material={organic} />
            <MaterialSphere positionX={1.42} material={techno} />
          </group>
          <ContactShadows
            position={[0, -1.32, 0]}
            opacity={0.62}
            scale={9}
            blur={2.6}
            far={2.6}
            color={PREVIEW_STAGE.groundShadow}
          />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={3.2}
          maxDistance={7}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>

      {/* Judging overlay — RTL, chrome kept to hairlines. */}
      <div className="absolute top-0 inset-x-0 flex justify-center pt-[max(env(safe-area-inset-top),16px)] pointer-events-none">
        <div
          className="text-micro tracking-[0.4em] text-[color:#F2E7C9]/40 uppercase"
          style={{ fontFamily: '"IBM Plex Mono", monospace' }}
        >
          {'العقل الحيّ — لوحة المواد · المرحلة ١'}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-2 pb-[max(env(safe-area-inset-bottom),14px)] pointer-events-none">
        <div className="flex items-center gap-6">
          <ChipRow title="عضوي" values={[ORGANIC_PALETTE.base, ORGANIC_PALETTE.shadowTone, ORGANIC_PALETTE.lightTone, ORGANIC_PALETTE.glow, ORGANIC_PALETTE.rim]} />
          <ChipRow title="تكنولوجي" values={[TECHNO_PALETTE.base, TECHNO_PALETTE.shadowTone, TECHNO_PALETTE.lightTone, TECHNO_PALETTE.glow, TECHNO_PALETTE.rim]} />
        </div>
        <div
          className="text-micro text-[color:#F2E7C9]/30"
          style={{ fontFamily: '"IBM Plex Mono", monospace' }}
        >
          {'يمينًا عضوي · يسارًا تكنولوجي — اسحب للفحص'}
        </div>
      </div>
    </div>
  );
}
