import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  buildCircuitTraces,
  buildMechDome,
  buildPlateLayout,
  buildPlatesGeometry,
} from '../lib/brainGeometry';
import { FOLD_OPTIONS, MIND_TOKENS } from '../lib/mindTokens';

/**
 * Mechanical hemisphere: faceted gunmetal dome under floating hexagonal
 * armor plates, glowing circuit traces with via-dots, twin counter-rotating
 * gyro rings, a blinking antenna mast, and a holographic status arc.
 */
export default function MechanicalHemisphere({
  radius,
  glow,
}: {
  radius: number;
  glow: number;
}) {
  // --- geometry (built once) ----------------------------------------------
  const dome = useMemo(() => buildMechDome(radius), [radius]);

  const plates = useMemo(() => {
    const layout = buildPlateLayout(4, FOLD_OPTIONS.seed ^ 0x51ce);
    return buildPlatesGeometry(layout, radius);
  }, [radius]);

  const circuitLines = useMemo(
    () => buildCircuitTraces(14, FOLD_OPTIONS.seed ^ 0xc17c),
    [],
  );

  const circuitPoints = useMemo(
    () =>
      circuitLines.map((flat) => {
        const pts: Array<[number, number, number]> = [];
        for (let i = 0; i < flat.length; i += 3) {
          pts.push([flat[i] * radius * 1.03, flat[i + 1] * radius * 1.03, flat[i + 2] * radius * 1.03]);
        }
        return pts;
      }),
    [circuitLines, radius],
  );

  const viaPositions = useMemo(() => {
    const arr: number[] = [];
    for (const pts of circuitPoints) {
      const last = pts[pts.length - 1];
      arr.push(last[0], last[1], last[2]);
    }
    return new Float32Array(arr);
  }, [circuitPoints]);

  // --- animation refs -------------------------------------------------------
  const coreRef = useRef<THREE.Mesh>(null);
  const platesRef = useRef<THREE.Mesh>(null);
  const tracesRef = useRef<THREE.Group>(null);
  const gyroARef = useRef<THREE.Mesh>(null);
  const gyroBRef = useRef<THREE.Mesh>(null);
  const antennaTipRef = useRef<THREE.Mesh>(null);
  const holoRef = useRef<THREE.Mesh>(null);

  const time = useRef(0);

  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;

    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      // Data-core flicker: fast subtle noise over a slow breath.
      m.opacity =
        (0.3 + 0.4 * glow) *
        (0.85 + Math.sin(t * 2.1) * 0.08 + Math.sin(t * 9.7) * 0.05);
    }
    if (platesRef.current) {
      // Armor breathing: imperceptible hover, like suspended plates.
      platesRef.current.position.x = -Math.sin(t * 0.8) * 0.006 * radius;
      const m = platesRef.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.12 + 0.3 * glow;
    }
    if (tracesRef.current) {
      tracesRef.current.visible = glow > 0.05;
    }
    if (gyroARef.current) gyroARef.current.rotation.z = t * 0.45;
    if (gyroBRef.current) gyroBRef.current.rotation.y = -t * 0.32;

    if (antennaTipRef.current) {
      const m = antennaTipRef.current.material as THREE.MeshBasicMaterial;
      // Beacon blink: sharp on, long off.
      const blink = Math.sin(t * 2.4) > 0.86 ? 1 : 0.12;
      m.opacity = blink;
    }
    if (holoRef.current) {
      holoRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.18;
      const m = holoRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.16 + 0.22 * glow * (0.8 + Math.sin(t * 3.3) * 0.2);
    }
  });

  const gyroPole: [number, number, number] = [(-radius * 2) / 3, 0, 0];

  return (
    <group>
      {/* Inner data-core membrane. */}
      <mesh ref={coreRef} geometry={dome.geometry}>
        <meshBasicMaterial
          color={MIND_TOKENS.mechGlow}
          transparent
          opacity={0.35}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>

      {/* Faceted dome shell. */}
      <mesh geometry={dome.geometry}>
        <meshStandardMaterial
          color={MIND_TOKENS.mechBase}
          roughness={0.38}
          metalness={0.82}
          flatShading
          emissive={MIND_TOKENS.mechEdge}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Floating armor plates. */}
      <mesh ref={platesRef} geometry={plates.geometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.42}
          metalness={0.78}
          flatShading
          emissive={MIND_TOKENS.mechEdge}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Circuit traces + via dots. */}
      <group ref={tracesRef}>
        {circuitPoints.map((pts, i) => (
          <Line
            key={`trace-${i}`}
            points={pts}
            color={MIND_TOKENS.mechGlow}
            lineWidth={1.2}
            transparent
            opacity={0.5}
            toneMapped={false}
          />
        ))}
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[viaPositions, 3]} count={viaPositions.length / 3} />
          </bufferGeometry>
          <pointsMaterial
            color={MIND_TOKENS.seam}
            size={0.014}
            transparent
            opacity={0.8}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      </group>

      {/* Twin gyro rings around the mechanical pole. */}
      <group position={gyroPole}>
        <mesh ref={gyroARef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 0.52, 0.006, 8, 72]} />
          <meshStandardMaterial color={MIND_TOKENS.brass} metalness={0.9} roughness={0.3} emissive={MIND_TOKENS.mechGlow} emissiveIntensity={0.35} />
        </mesh>
        <mesh ref={gyroBRef}>
          <torusGeometry args={[radius * 0.68, 0.004, 8, 72]} />
          <meshStandardMaterial color={MIND_TOKENS.brass} metalness={0.9} roughness={0.35} emissive={MIND_TOKENS.mechGlow} emissiveIntensity={0.25} />
        </mesh>
      </group>

      {/* Antenna mast + blinking beacon on the mechanical pole. */}
      <mesh position={[(-radius * 19) / 20, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.01, radius * 0.16, 6]} />
        <meshStandardMaterial color={MIND_TOKENS.mechEdge} metalness={0.85} roughness={0.4} />
      </mesh>
      <mesh ref={antennaTipRef} position={[-radius * 1.06, 0, 0]}>
        <sphereGeometry args={[0.016, 12, 10]} />
        <meshBasicMaterial color={MIND_TOKENS.mechGlow} transparent opacity={0.8} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Holographic status arc sweeping near the seam face. */}
      <mesh ref={holoRef} position={[(-radius * 3) / 4, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.62, 0.004, 6, 64, Math.PI * 0.75]} />
        <meshBasicMaterial color={MIND_TOKENS.seam} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
