import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { makeRng } from '../lib/brainGeometry';
import { MIND_TOKENS } from '../lib/mindTokens';

const CLAMP_COUNT = 6;

/**
 * Docking hardware binding the two hemispheres along the x = 0 seam:
 * a glowing light slit inside the seam ring, plus heavy mechanical clamps
 * pinching the rim at regular angles with hex bolts and under-rim hooks.
 */
export default function SeamHardware({ radius }: { radius: number }) {
  const slitRef = useRef<THREE.Mesh>(null);
  const clampsRef = useRef<THREE.Group>(null);
  const time = useRef(0);

  const clampAngles = useMemo(() => {
    const rng = makeRng(0x51a7e);
    return Array.from({ length: CLAMP_COUNT }, (_, i) => {
      // Even spacing + small deterministic jitter.
      return (i / CLAMP_COUNT) * Math.PI * 2 + (rng() - 0.5) * 0.18;
    });
  }, []);

  useFrame((_, dt) => {
    time.current += dt;
    if (slitRef.current) {
      const m = slitRef.current.material as THREE.MeshBasicMaterial;
      // Data interchange pulse: bright wave sweeping the seam slit.
      m.opacity = 0.55 + Math.sin(time.current * 2.4) * 0.25;
    }
    if (clampsRef.current) {
      clampsRef.current.rotation.x = time.current * 0.02; // near-imperceptible creep
    }
  });

  return (
    <group>
      {/* Light slit: thin emissive disc buried in the seam plane. */}
      <mesh ref={slitRef} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.995, 96]} />
        <meshBasicMaterial
          color={MIND_TOKENS.seam}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Mechanical clamps around the rim. */}
      <group ref={clampsRef}>
        {clampAngles.map((a, i) => (
          <group key={`clamp-${i}`} rotation={[0, 0, a]}>
            {/* Clamp body straddling the rim: y ≈ ±radius in local frame. */}
            <group position={[0, radius * 1.005, 0]}>
              {/* Bridge over the rim. */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[radius * 0.16, radius * 0.05, radius * 0.075]} />
                <meshStandardMaterial
                  color={MIND_TOKENS.mechBase}
                  metalness={0.85}
                  roughness={0.35}
                  emissive={MIND_TOKENS.mechEdge}
                  emissiveIntensity={0.12}
                />
              </mesh>
              {/* Hex bolt heads clamping from both hemisphere faces. */}
              <mesh position={[radius * 0.045, -radius * 0.01, 0]} rotation={[0, Math.PI / 2, 0]}>
                <cylinderGeometry args={[radius * 0.022, radius * 0.022, radius * 0.02, 6]} />
                <meshStandardMaterial color={MIND_TOKENS.brass} metalness={0.9} roughness={0.28} />
              </mesh>
              <mesh position={[-radius * 0.045, -radius * 0.01, 0]} rotation={[0, Math.PI / 2, 0]}>
                <cylinderGeometry args={[radius * 0.022, radius * 0.022, radius * 0.02, 6]} />
                <meshStandardMaterial color={MIND_TOKENS.brass} metalness={0.9} roughness={0.28} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
