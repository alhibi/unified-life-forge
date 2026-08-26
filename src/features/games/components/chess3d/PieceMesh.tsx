/**
 * PieceMesh — قطعة شطرنج حية: تُولد بهبوط متدرج، تطير بأقواس عند النقل،
 * ترتجف وتغوص عند الالتقاط، وتتحول بوميض ذهبي عند الترقية.
 *
 * كل الحركة تُقاد أمراً عبر refs داخل useFrame (بلا إعادة رسم لكل إطار).
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { squareToWorld } from '@/features/games/lib/three/boardLayout';
import { KNIGHT_FACING } from '@/features/games/lib/three/buildPieceGeometry';
import type { PieceEntity } from '@/features/games/lib/three/entities';
import {
  arcLift,
  DUR_CAPTURE_SHUDDER,
  DUR_CAPTURE_SINK,
  DUR_LAND_SETTLE,
  DUR_TOPPLE,
  easeOutBack,
  easeOutBounce,
  easeOutCubic,
  progress,
  slideDuration,
} from '@/features/games/lib/three/tween';

/** مواصفة رحلة نقلة (بوحدات عالم محلية للرقعة). */
export interface FlightSpec {
  fromW: [number, number];
  toW: [number, number];
  t0: number;
  /** ترقية: وميض وهبوط مبهر عند الهبوط. */
  promoteFlash?: boolean;
  /** يُنادى مرة واحدة لحظة اكتمال الرحلة (تأثيرات الغبار/العمود). */
  onLand?: () => void;
}

interface PieceMeshProps {
  ent: PieceEntity;
  geom: THREE.BufferGeometry;
  mat: THREE.Material;
  flight: FlightSpec | null;
  /** قطعة مأسورة: تبدأ مسرحية الخروج. */
  exiting: boolean;
  spawnAt: number | null;
  selected: boolean;
  /**
   * وضعية ثابتة (للمقبرة): لا يعيد المكون كتابة موضعه المحلي كل إطار،
   * فتتولى المجموعة الأم تحديد الموضع والميلان.
   */
  staticPose?: boolean;
}

export default function PieceMesh({
  ent,
  geom,
  mat,
  flight,
  exiting,
  spawnAt,
  selected,
  staticPose = false,
}: PieceMeshProps) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);

  // حالة الرحلة الجارية (مرجع حتى لا يعيد الأب التمرير إعادة تشغيلها).
  const flightRef = useRef<FlightSpec | null>(null);
  const flightDoneRef = useRef(true);
  const landedAtRef = useRef<number | null>(null);
  const exitStartRef = useRef<number | null>(null);
  const removedRef = useRef(false);

  const restPos = useMemo<[number, number]>(() => squareToWorld(ent.r, ent.c), [ent.r, ent.c]);
  const facing = useMemo(() => (ent.type === 'N' ? KNIGHT_FACING[ent.color] : 0), [ent.type, ent.color]);

  const spawnBase = useRef(spawnAt);

  useFrame(() => {
    const g = group.current;
    const body = inner.current;
    if (!g || !body || removedRef.current) return;

    const now = performance.now();

    // بدء رحلة جديدة عند تغيّر مواصفتها (يُكتشف هنا لا أثناء الرسم).
    if (flight && flight !== flightRef.current) {
      flightRef.current = flight;
      flightDoneRef.current = false;
      landedAtRef.current = null;
    }

    // بدء مسرحية الخروج.
    if (exiting && exitStartRef.current === null) {
      exitStartRef.current = now;
    }

    // ── الظهور المتدرج ──
    if (spawnBase.current !== null) {
      const t = now - spawnBase.current;
      if (t < 0) {
        g.visible = false;
        return;
      }
      g.visible = true;
      const DROP = 340;
      const p = Math.min(1, t / DROP);
      const e = easeOutBack(p);
      g.position.y = (1 - e) * 0.55;
      const s = 0.8 + 0.2 * easeOutCubic(p);
      body.scale.setScalar(s);
      if (p >= 1) {
        spawnBase.current = null;
        g.position.y = 0;
        body.scale.setScalar(1);
      }
      return;
    }

    // ── مسرحية الالتقاط: ارتجاف ثم غوص وتلاشٍ حجمي ──
    if (exitStartRef.current !== null) {
      const te = now - exitStartRef.current;
      if (te < DUR_CAPTURE_SHUDDER) {
        const k = 1 - te / DUR_CAPTURE_SHUDDER;
        body.rotation.z = Math.sin(te * 0.09) * 0.09 * k;
        body.rotation.x = Math.cos(te * 0.11) * 0.05 * k;
      } else {
        body.rotation.set(0, facing, 0);
        const ts = te - DUR_CAPTURE_SHUDDER;
        const p = Math.min(1, ts / DUR_CAPTURE_SINK);
        const e = p * p;
        g.position.y = -e * 0.34;
        g.position.x = restPos[0] + e * 0.18; // ينزلق جانباً وهو يغوص
        const s = Math.max(0.001, 1 - e);
        body.scale.setScalar(s);
        body.rotation.y = facing + e * 1.4; // يدور وهو يختفي
        if (p >= 1) {
          g.visible = false;
          removedRef.current = true;
        }
      }
      return;
    }

    // ── الرحلة: انزلاق بقوس ──
    const f = flightRef.current;
    if (f && !flightDoneRef.current) {
      const dist = Math.hypot(f.toW[0] - f.fromW[0], f.toW[1] - f.fromW[1]);
      const dur = slideDuration(dist);
      const p = progress(now - f.t0, dur);
      if (p === null) {
        // اكتملت الرحلة — هبوط مرن قصير
        flightDoneRef.current = true;
        g.position.set(f.toW[0], 0, f.toW[1]);
        landedAtRef.current = now;
        f.onLand?.();
        if (f.promoteFlash) {
          // وميض الترقية: نبضة تكبير سريعة تخفت
          body.scale.setScalar(1.22);
        }
      } else {
        const e = easeOutCubic(p);
        // مزج ناعم: تسارع مبكر ووصول هادئ
        const x = f.fromW[0] + (f.toW[0] - f.fromW[0]) * e;
        const z = f.fromW[1] + (f.toW[1] - f.fromW[1]) * e;
        const arcH = 0.14 + Math.min(0.42, Math.sqrt(Math.max(0, dist - 1)) * 0.09);
        g.position.set(x, arcLift(p, arcH), z);
        // ميلان باتجاه الحركة (بنك خفيف)
        const dirX = f.toW[0] - f.fromW[0];
        const dirZ = f.toW[1] - f.fromW[1];
        const len = Math.hypot(dirX, dirZ) || 1;
        const bank = Math.sin(Math.PI * p) * 0.07;
        body.rotation.z = (dirX / len) * bank;
        body.rotation.x = (-dirZ / len) * bank;
        return;
      }
    }

    // ── استقرار ما بعد الهبوط (squash صغير يخفت) ──
    if (landedAtRef.current !== null) {
      const tl = now - landedAtRef.current;
      const p = Math.min(1, tl / DUR_LAND_SETTLE);
      const squash = 1 - Math.sin(Math.PI * p) * 0.06;
      body.scale.set(flashScaleX(body.scale.x, p), squash * flashScaleX(body.scale.x, p), flashScaleX(body.scale.x, p));
      if (p >= 1) {
        landedAtRef.current = null;
        body.scale.setScalar(1);
        body.rotation.set(0, facing, 0);
      }
      return;
    }

    // ── التحديد: تحويم ودوران حي ──
    if (staticPose) return; // المقبرة: الوضع ثابت، الأم يتحكم بالموضع
    if (selected) {
      const t = now * 0.003;
      g.position.y = 0.07 + Math.sin(t * 2.4) * 0.018;
      body.rotation.y = facing + Math.sin(t * 1.1) * 0.22;
    } else {
      g.position.set(restPos[0], 0, restPos[1]);
      body.rotation.set(0, facing, 0);
    }
  });

  return (
    <group position={staticPose ? [0, 0, 0] : [restPos[0], 0, restPos[1]]}>
      <group ref={inner} rotation={[0, facing, 0]}>
        <mesh geometry={geom} material={mat} castShadow receiveShadow />
      </group>
    </group>
  );
}

/** عودة معامل الفلاش إلى 1 عبر زمن الهبوط (مساعد داخلي). */
function flashScaleX(current: number, _p: number): number {
  return current > 1 ? Math.max(1, current - 0.03) : 1;
}

/**
 * FallingKing — الملك الخاسر: يتردد لحظة، ثم يسقط بارتجاف مرتد
 * على جبهته باتجاه مركز الرقعة. يُركَّب بدل القطعة الحية عند النهاية.
 */
export function FallingKing({
  ent,
  geom,
  mat,
}: {
  ent: PieceEntity;
  geom: THREE.BufferGeometry;
  mat: THREE.Material;
}) {
  const inner = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const [rx, rz] = squareToWorld(ent.r, ent.c);
  // اتجاه السقوط: نحو مركز الرقعة (حتمي).
  const towardCenterX = Math.abs(rx) >= 1 ? -Math.sign(rx) : 0;
  const towardCenterZ = towardCenterX === 0 ? -Math.sign(rz) : 0;

  useFrame(() => {
    const b = inner.current;
    if (!b) return;
    if (start.current === null) start.current = performance.now() + 380; // مهلة درامية
    const t = performance.now() - start.current;
    if (t < 0) return;
    const p = Math.min(1, t / DUR_TOPPLE);
    // تردد قصير ثم سقوط بارتداد
    const wobble = p < 0.18 ? Math.sin((p / 0.18) * Math.PI) * 0.14 : 0;
    const fallP = p < 0.18 ? 0 : (p - 0.18) / 0.82;
    const fall = easeOutBounce(fallP);
    if (towardCenterX !== 0) {
      b.rotation.z = towardCenterX * (Math.PI / 2 - 0.05) * fall + wobble * 0.5;
      b.rotation.x = 0;
    } else {
      b.rotation.x = towardCenterZ * (Math.PI / 2 - 0.05) * fall + wobble * 0.5;
      b.rotation.z = 0;
    }
    b.position.y = Math.sin(Math.PI * Math.min(1, fallP)) * 0.04;
  });

  return (
    <group position={[rx, 0, rz]}>
      <group ref={inner}>
        <mesh geometry={geom} material={mat} castShadow />
      </group>
    </group>
  );
}
