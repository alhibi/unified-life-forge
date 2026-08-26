/**
 * SceneFx — تأثيرات لحظية: غبار الهبوط، عمود الترقية، سهم التلميح،
 * ومنارة الدور. كلها مكوّنات صغيرة قائمة ذاتياً داخل useFrame.
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { squareToWorld } from '@/features/games/lib/three/boardLayout';
import { CHESS_PALETTE } from '@/features/games/lib/three/chessPalette';
import { DUR_LAND_FX, easeOutCubic } from '@/features/games/lib/three/tween';

const hex = (k: keyof typeof CHESS_PALETTE) => `#${CHESS_PALETTE[k]}`;

/** انفجار غبار ذهبي عند هبوط قطعة. */
export function LandBurst({ x, z, born }: { x: number; z: number; born: number }) {
  const group = useRef<THREE.Group>(null);
  // 10 شظايا بمتجهات حتمية (بلا عشوائية أثناء الرسم).
  const shards = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.35;
        return { dx: Math.cos(a) * 0.3, dz: Math.sin(a) * 0.3, dy: 0.5 + (i % 3) * 0.12 };
      }),
    [],
  );
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = performance.now() - born;
    const p = t / DUR_LAND_FX;
    if (p >= 1 || p < 0) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const e = easeOutCubic(p);
    g.children.forEach((child, i) => {
      const s = shards[i % shards.length];
      child.position.set(s.dx * e, Math.max(0.01, s.dy * (1 - p) - 0.03), s.dz * e);
      const sc = Math.max(0.001, 1 - p);
      child.scale.setScalar(sc);
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - p);
    });
  });
  return (
    <group ref={group} position={[x, 0.05, z]}>
      {shards.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshBasicMaterial color={hex('dustMote')} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** عمود شرارات ذهبي عند الترقية — يصعد ويتلاشى. */
export function PromoteColumn({ x, z, born }: { x: number; z: number; born: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = performance.now() - born;
    const DUR = 900;
    const p = t / DUR;
    if (p >= 1 || p < 0) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const rise = easeOutCubic(p);
    g.position.y = rise * 1.1;
    g.children.forEach((child, i) => {
      child.rotation.y += 0.15 + i * 0.02;
      const sc = 1 - p * 0.7;
      child.scale.set(sc, 1 + p * 1.6, sc);
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - p);
    });
  });
  return (
    <group ref={group} position={[x, 0.1, z]}>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[Math.sin(i * 2.4) * 0.08, i * 0.13, Math.cos(i * 2.4) * 0.08]}>
          <octahedronGeometry args={[0.055]} />
          <meshBasicMaterial
            color={hex('promote')}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/** سهم تلميح يحوم فوق القطعة ويشير نحو الوجهة. */
export function HintArrow({ from, to }: { from: [number, number]; to: [number, number] }) {
  const group = useRef<THREE.Group>(null);
  const [fx, fz] = squareToWorld(from[0], from[1]);
  const [tx, tz] = squareToWorld(to[0], to[1]);
  const angle = Math.atan2(tx - fx, -(tz - fz)); // اتجاه العالم → دوران Y
  const len = Math.min(0.9, Math.hypot(tx - fx, tz - fz));
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.position.y = 0.95 + Math.sin(clock.elapsedTime * 4) * 0.06;
    g.rotation.y = angle;
    const m1 = g.children[0] as THREE.Mesh | undefined;
    if (m1) ((m1 as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
      0.65 + Math.sin(clock.elapsedTime * 6) * 0.25;
  });
  return (
    <group>
      <group ref={group} position={[fx, 1.05, fz]}>
        {/* جسم السهم */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, len / 2 - 0.12]}>
          <coneGeometry args={[0.07, len, 10]} />
          <meshBasicMaterial
            color={hex('hint')}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* رأس السهم */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, len + 0.02]}>
          <coneGeometry args={[0.15, 0.32, 12]} />
          <meshBasicMaterial
            color={hex('hint')}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
      {/* حلقة نبض على مربع الوجهة — مقروءة من كل الزوايا */}
      <DestPulse x={tx} z={tz} />
    </group>
  );
}

/** حلقة ذهبية نابضة على مربع وجهة التلميح. */
function DestPulse({ x, z }: { x: number; z: number }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ring.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const p = (t % 1.4) / 1.4;
    m.scale.setScalar(0.7 + p * 0.55);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - p);
  });
  return (
    <mesh ref={ring} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.42, 32, 1]} />
      <meshBasicMaterial
        color={hex('hint')}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** منارة الدور: كرة متوهجة على زاوية جهة اللاعب صاحب النقل. */
export function TurnBeacon({ side }: { side: 'near' | 'far' }) {
  const mesh = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const z = side === 'near' ? 4.62 : -4.62;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mesh.current) mesh.current.scale.setScalar(1 + Math.sin(t * 2.6) * 0.16);
    if (light.current) light.current.intensity = 2.2 + Math.sin(t * 2.6) * 0.9;
  });
  return (
    <group position={[0, 0.32, z]}>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.075, 18, 14]} />
        <meshStandardMaterial
          color={hex('bronzeGlow')}
          emissive={new THREE.Color(hex('bronzeGlow'))}
          emissiveIntensity={1.6}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <pointLight ref={light} color={hex('bronzeGlow')} distance={3.4} decay={2} />
    </group>
  );
}
