import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  buildCortexHemisphere,
  buildInnerCore,
  buildVesselTree,
} from '../lib/brainGeometry';
import { FOLD_OPTIONS, MIND_TOKENS } from '../lib/mindTokens';

/** Shared shader uniforms — single instance per page, rebound every frame. */
const UNIFORMS = {
  uTime: { value: 0 },
  uPulseSpeed: { value: 1.15 },
  uVitality: { value: 0 },
  uColorArtery: { value: new THREE.Color('#E86A4A') },
  uColorPulse: { value: new THREE.Color(MIND_TOKENS.organicGlow) },
};

/**
 * Organic hemisphere: folded cortex with vertex-color sulci shading, an
 * emissive inner membrane that backlights the folds, a branching vessel tree
 * with traveling pulse waves, and synapse spark-points at branch tips.
 */
export default function OrganicHemisphere({
  radius,
  glow,
}: {
  radius: number;
  glow: number;
}) {
  // --- geometry (built once) ----------------------------------------------
  const cortex = useMemo(() => buildCortexHemisphere(radius, FOLD_OPTIONS), [radius]);
  const core = useMemo(() => buildInnerCore(radius), [radius]);
  const vessels = useMemo(
    () =>
      buildVesselTree(radius, FOLD_OPTIONS, {
        branchCount: 30,
        seed: FOLD_OPTIONS.seed ^ 0xbeef,
      }),
    [radius],
  );

  const vesselGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(vessels.positions, 3));
    g.setAttribute('aRadius', new THREE.BufferAttribute(vessels.radii, 1));
    g.setAttribute('aT', new THREE.BufferAttribute(vessels.tAlong, 1));
    g.setAttribute('aBranch', new THREE.BufferAttribute(vessels.branchOf, 1));
    return g;
  }, [vessels]);

  // --- animation refs -------------------------------------------------------
  const coreRef = useRef<THREE.Mesh>(null);
  const vesselsRef = useRef<THREE.LineSegments>(null);
  const sparksRef = useRef<THREE.Points>(null);

  // Synapse sparks at the branch tips.
  const sparkGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(vessels.tipPositions, 3));
    return g;
  }, [vessels]);

  // Module-scope uniform store: this component renders once per page, and
  // vitality is re-bound every frame anyway.
  const uniforms = UNIFORMS;

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    uniforms.uVitality.value = glow;

    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.28 + 0.45 * glow * (0.85 + Math.sin(uniforms.uTime.value * 1.4) * 0.15);
    }
    if (sparksRef.current) {
      const m = sparksRef.current.material as THREE.PointsMaterial;
      m.opacity = 0.25 + 0.75 * glow;
      sparksRef.current.rotation.y = uniforms.uTime.value * 0.01;
    }
    if (vesselsRef.current) {
      vesselsRef.current.visible = glow > 0.04;
    }
  });

  return (
    <group>
      {/* Inner backlit membrane — gives the folds their living glow. */}
      <mesh ref={coreRef} geometry={core.geometry}>
        <meshBasicMaterial
          color={MIND_TOKENS.organicGlow}
          transparent
          opacity={0.35}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>

      {/* Folded cortex shell with baked sulci shading. */}
      <mesh geometry={cortex.geometry}>
        <meshStandardMaterial
          vertexColors
          color={MIND_TOKENS.organicBase}
          roughness={0.72}
          metalness={0.04}
          emissive={MIND_TOKENS.organicDeep}
          emissiveIntensity={0.22 + 0.5 * glow}
        />
      </mesh>

      {/* Vascular system — shader-driven pulse waves along each branch. */}
      <lineSegments ref={vesselsRef} geometry={vesselGeometry}>
        <shaderMaterial
          uniforms={UNIFORMS}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={/* glsl */ `
            attribute float aRadius;
            attribute float aT;
            attribute float aBranch;
            uniform float uTime;
            uniform float uPulseSpeed;
            varying float vPulse;
            varying float vThin;

            float hash(float n) { return fract(sin(n) * 43758.5453123); }

            void main() {
              // Traveling pulse: a bright band sweeping t ∈ [0,1] per branch.
              float speed = uPulseSpeed * (0.8 + 0.4 * hash(aBranch + 7.0));
              float phase = fract(uTime * speed + hash(aBranch) * 3.17);
              float d = abs(aT - phase);
              vPulse = smoothstep(0.18, 0.0, d);
              vThin = aRadius;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            uniform vec3 uColorArtery;
            uniform vec3 uColorPulse;
            uniform float uVitality;
            varying float vPulse;
            varying float vThin;

            void main() {
              // Thicker near the trunk, fading to hair-thin at the tips.
              float thicknessFade = clamp(vThin / 0.012, 0.25, 1.0);
              vec3 base = uColorArtery * (0.32 * thicknessFade);
              vec3 col = base + uColorPulse * vPulse * (0.55 + 0.85 * uVitality);
              float alpha = (0.16 + 0.84 * vPulse) * thicknessFade;
              gl_FragColor = vec4(col, alpha);
            }
          `}
        />
      </lineSegments>

      {/* Synapse sparks at vessel tips. */}
      <points ref={sparksRef} geometry={sparkGeometry}>
        <pointsMaterial
          color={MIND_TOKENS.organicGlow}
          size={0.02}
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
