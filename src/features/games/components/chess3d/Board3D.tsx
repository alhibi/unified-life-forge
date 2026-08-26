/**
 * Board3D — مشهد الشطرنج ثلاثي الأبعاد: رقعة أوبسيديان وعاج تحت مسرح ضوئي.
 *
 * يستقبل حالة اللعبة من الصفحة (مصدر الحقيقة الوحيد) ويترجمها إلى:
 *  - قطع بهويات مستقرة تطير بأقواس، ترتجف عند الالتقاط، وتتوهج عند الترقية.
 *  - مؤشرات حية: هالة التحديد، نقاط النقلات، حلقات الالتقاط، أثر آخر نقلة،
 *    جمر الكش، ووميض التلميح.
 *  - دوران منظور سينمائي عند قلب الرقعة + تنفّس خافت دائم.
 */

import { ContactShadows, Environment, Lightformer, Sparkles } from '@react-three/drei';
import { Canvas, type ThreeEvent,useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import {
  type Board2,
  deriveMove,
  needsSnapSync,
  squareToWorld,
  worldToSquare,
} from '@/features/games/lib/three/boardLayout';
import { buildPieceGeometry } from '@/features/games/lib/three/buildPieceGeometry';
import { buildChessMaterials } from '@/features/games/lib/three/chessMaterials';
import {
  assertPaletteIntegrity,
  CHESS_PALETTE,
} from '@/features/games/lib/three/chessPalette';
import {
  buildEntities,
  type EntityId,
  type PieceEntity,
  reconcileEntities,
} from '@/features/games/lib/three/entities';
import type { PieceType3D as Type2 } from '@/features/games/lib/three/pieceGeometry';
import {
  DUR_CHECK_PULSE,
  DUR_LEGAL_POP,
  DUR_STAGGER_STEP,
  easeOutCubic,
  pulseDecay,
} from '@/features/games/lib/three/tween';

import CameraRig from './CameraRig';
import Graveyard3D from './Graveyard3D';
import PieceMesh, { FallingKing, type FlightSpec } from './PieceMesh';
import { HintArrow, LandBurst, PromoteColumn, TurnBeacon } from './SceneFx';

// ── أنواع بنائية مطابقة هيكلياً لأنواع الصفحة ──────────────────────
export type Sq = [number, number];

export interface Board3DProps {
  board: ({ type: Type2; color: 'w' | 'b' } | null)[][];
  flipped: boolean;
  selected: Sq | null;
  legalMoves: Sq[];
  lastMove: { from: Sq; to: Sq } | null;
  checkedKing: Sq | null;
  hintMove: { from: Sq; to: Sq } | null;
  /** هل يُسمح بالنقر (ليس دور الذكاء الاصطناعي ولا انتهت اللعبة)؟ */
  interactive: boolean;
  onSquareTap: (r: number, c: number) => void;
  /** ما أسره الأبيض/الأسود من رموز (من حالة الصفحة) — يقود المقبرة ثلاثية الأبعاد. */
  capturedW?: string[];
  capturedB?: string[];
  /** صاحب الدور الحالي — يقود منارة الدور. */
  turn?: 'w' | 'b';
  /** انتهت اللعبة بلون مهزوم: ملكه يسقط ارتداديّاً. */
  defeatedColor?: 'w' | 'b' | null;
}

/** تحويل رمز يونيكود إلى نوع قطعة. */
const GLYPH_TO_TYPE: Record<string, Type2> = {
  '♙': 'P', '♘': 'N', '♗': 'B', '♖': 'R', '♕': 'Q',
  '♟': 'P', '♞': 'N', '♝': 'B', '♜': 'R', '♛': 'Q',
};

if (!assertPaletteIntegrity().ok) throw new Error('لوحة ألوان الشطرنج تالفة');

const hex = (k: keyof typeof CHESS_PALETTE) => `#${CHESS_PALETTE[k]}`;

// ── ذاكرة هندسات القطع المشتركة ────────────────────────────────────
function usePieceGeometries(): Map<Type2, THREE.BufferGeometry> {
  const cache = useMemo(() => {
    const m = new Map<Type2, THREE.BufferGeometry>();
    (['K', 'Q', 'R', 'B', 'N', 'P'] as Type2[]).forEach((t) => m.set(t, buildPieceGeometry(t)));
    return m;
  }, []);
  useEffect(() => () => cache.forEach((g) => g.dispose()), [cache]);
  return cache;
}

// ── الرقعة الساكنة: مربعات مدمجة + إطار برونزي + قاعدة ─────────────
function StaticBoard({ mats }: { mats: ReturnType<typeof buildChessMaterials> }) {
  const geos = useMemo(() => {
    const lightParts: THREE.BufferGeometry[] = [];
    const darkParts: THREE.BufferGeometry[] = [];
    const box = new THREE.BoxGeometry(0.985, 0.07, 0.985);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const g = box.clone();
        const [x, z] = squareToWorld(r, c);
        g.translate(x, -0.035, z);
        ((r + c) % 2 === 0 ? lightParts : darkParts).push(g);
      }
    }
    const merged = (parts: THREE.BufferGeometry[]) => {
      const g = mergeGeos(parts);
      parts.forEach((p) => p.dispose());
      return g;
    };
    box.dispose();

    // إطار خشبي محيط (أربعة قضبان)
    const frameBars: THREE.BufferGeometry[] = [];
    const L = 9.15;
    const W = 0.62;
    const H = 0.17;
    const barGeo = new THREE.BoxGeometry(1, 1, 1);
    const mkBar = (sx: number, sz: number, px: number, pz: number) => {
      const b = barGeo.clone();
      b.scale(sx, H, sz);
      b.translate(px, -0.035, pz);
      frameBars.push(b);
    };
    mkBar(L, W, 0, -(4.0 + W / 2 + 0.02));
    mkBar(L, W, 0, 4.0 + W / 2 + 0.02);
    mkBar(W, L, -(4.0 + W / 2 + 0.02), 0);
    mkBar(W, L, 4.0 + W / 2 + 0.02, 0);
    barGeo.dispose();

    // شريط برونزي رفيع يفصل المربعات عن الخشب
    const trimBars: THREE.BufferGeometry[] = [];
    const trimGeo = new THREE.BoxGeometry(1, 1, 1);
    const TL = 8.3;
    const TW = 0.075;
    const TH = 0.028;
    const mkTrim = (sx: number, sz: number, px: number, pz: number) => {
      const b = trimGeo.clone();
      b.scale(sx, TH, sz);
      b.translate(px, 0.0, pz);
      trimBars.push(b);
    };
    mkTrim(TL, TW, 0, -4.062);
    mkTrim(TL, TW, 0, 4.062);
    mkTrim(TW, TL, -4.062, 0);
    mkTrim(TW, TL, 4.062, 0);
    trimGeo.dispose();

    // القاعدة المتدرجة
    const plinthTop = new THREE.BoxGeometry(9.9, 0.16, 9.9);
    plinthTop.translate(0, -0.19, 0);
    const plinthBase = new THREE.BoxGeometry(9.35, 0.14, 9.35);
    plinthBase.translate(0, -0.33, 0);

    return {
      light: merged(lightParts),
      dark: merged(darkParts),
      frame: mergeGeos(frameBars),
      trim: mergeGeos(trimBars),
      plinthTop,
      plinthBase,
    };
  }, []);

  useEffect(
    () => () =>
      Object.values(geos).forEach((g) => {
        if (g && 'dispose' in g) (g as THREE.BufferGeometry).dispose();
      }),
    [geos],
  );

  return (
    <group>
      {/* سطح داكن أسفل الفجوات الشعرية بين المربعات */}
      <mesh position={[0, -0.072, 0]} receiveShadow>
        <boxGeometry args={[8.06, 0.012, 8.06]} />
        <meshStandardMaterial color={hex('plinth')} roughness={0.7} />
      </mesh>
      <mesh geometry={geos.light} material={mats.squareLight} receiveShadow />
      <mesh geometry={geos.dark} material={mats.squareDark} receiveShadow />
      <mesh geometry={geos.trim} material={mats.bronze} />
      <mesh geometry={geos.frame} material={mats.boardBody} receiveShadow castShadow />
      <mesh geometry={geos.plinthTop} material={mats.frameBronze} />
      <mesh geometry={geos.plinthBase} material={mats.boardBody} />
    </group>
  );
}

/** دمج قائمة هندسات بواحدة. */
function mergeGeos(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = mergeGeometries(parts, false);
  if (!out) throw new Error('mergeGeometries فشل');
  return out;
}

// ── مؤشرات النقلات ─────────────────────────────────────────────────

/** قرص نابض تحت القطعة المحددة. */
function SelectGlow({ sq }: { sq: Sq }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const mesh = useRef<THREE.Group>(null);
  const [x, z] = squareToWorld(sq[0], sq[1]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mat.current) mat.current.opacity = 0.5 + Math.sin(t * 3.4) * 0.18;
    if (mesh.current) mesh.current.scale.setScalar(1 + Math.sin(t * 3.4) * 0.04);
  });
  return (
    <group ref={mesh} position={[x, 0.012, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.44, 40]} />
        <meshBasicMaterial ref={mat} color={hex('select')} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

/** نقطة نقلات قانونية على مربع فارغ — تنبض للداخل بتتابع. */
function LegalDot({ sq, delay }: { sq: Sq; delay: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const born = useRef<number | null>(null);
  const [x, z] = squareToWorld(sq[0], sq[1]);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    if (born.current === null) born.current = performance.now() + delay;
    const t = performance.now() - born.current;
    const p = Math.max(0, Math.min(1, t / DUR_LEGAL_POP));
    const e = easeOutCubic(p);
    m.scale.setScalar(0.001 + e);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.62 * e + Math.sin(performance.now() * 0.004 + delay) * 0.08;
  });
  return (
    <mesh ref={ref} position={[x, 0.014, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.105, 26]} />
      <meshBasicMaterial color={hex('legal')} transparent depthWrite={false} />
    </mesh>
  );
}

/** حلقة حول قطعة عدو قابلة للالتقاط — تدور ببطء مهيب. */
function CaptureRing({ sq }: { sq: Sq }) {
  const ref = useRef<THREE.Mesh>(null);
  const [x, z] = squareToWorld(sq[0], sq[1]);
  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    ref.current.rotation.z += dt * 0.9;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = 0.66 + Math.sin(clock.elapsedTime * 4.2) * 0.16;
  });
  return (
    <mesh ref={ref} position={[x, 0.016, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.31, 0.385, 40, 1]} />
      <meshBasicMaterial color={hex('capture')} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** لوح مضيء رقيق لمربع آخر نقلة (المصدر والوجهة). */
function LastMoveTile({ sq }: { sq: Sq }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const [x, z] = squareToWorld(sq[0], sq[1]);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.opacity = 0.16 + 0.07 * (0.5 + 0.5 * Math.sin((clock.elapsedTime * 1000 % 2400) / 2400 * Math.PI * 2));
  });
  return (
    <mesh position={[x, 0.009, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.97, 0.97]} />
      <meshBasicMaterial ref={mat} color={hex('lastMove')} transparent depthWrite={false} />
    </mesh>
  );
}

/** جمرة كش: وهج نابض تحت الملك المهدَّد + ضوء أحمر خافت. */
function CheckEmber({ sq }: { sq: Sq }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  // طور عشوائي يُقرع أول إطار (لا نستدعي Math.random أثناء الرسم).
  const phase = useRef<number | null>(null);
  const [x, z] = squareToWorld(sq[0], sq[1]);
  useFrame(({ clock }) => {
    if (phase.current === null) phase.current = Math.random();
    const t = ((clock.elapsedTime * 1000 + phase.current * 1000) % DUR_CHECK_PULSE) / DUR_CHECK_PULSE;
    const k = pulseDecay(t);
    if (mat.current) mat.current.opacity = 0.42 + k * 0.4;
    if (light.current) light.current.intensity = 1.6 + k * 3.2;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.47, 36]} />
        <meshBasicMaterial ref={mat} color={hex('check')} transparent depthWrite={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.5, 0]} color={hex('check')} distance={3.2} decay={2} />
    </group>
  );
}

// ── الدوّار: قلب المنظور + تنفّس ───────────────────────────────────
function Turntable({
  flipped,
  reducedMotion,
  children,
}: {
  flipped: boolean;
  reducedMotion: boolean;
  children: React.ReactNode;
}) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (outer.current) {
      const target = flipped ? Math.PI : 0;
      if (reducedMotion) outer.current.rotation.y = target;
      else {
        const cur = outer.current.rotation.y;
        const delta = ((target - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        outer.current.rotation.y = cur + delta * Math.min(1, dt * 3.4);
      }
    }
    if (inner.current && !reducedMotion) {
      inner.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.012;
    }
  });
  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  );
}

// ── المستوى النقر ──────────────────────────────────────────────────
function TapPlane({
  interactive,
  onTap,
  onHover,
}: {
  interactive: boolean;
  onTap: (r: number, c: number) => void;
  onHover: (sq: Sq | null) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const handle = useCallback(
    (e: ThreeEvent<PointerEvent>, report: boolean) => {
      if (!mesh.current || !interactive) return;
      e.stopPropagation();
      const local = mesh.current.worldToLocal(e.point.clone());
      const [r, c] = worldToSquare(local.x, local.z);
      if (r < 0 || r > 7 || c < 0 || c > 7) {
        if (report) onHover(null);
        return;
      }
      if (report) onHover([r, c]);
      else onTap(r, c);
    },
    [interactive, onTap, onHover],
  );
  return (
    <mesh
      ref={mesh}
      position={[0, 0.002, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e) => handle(e, false)}
      onPointerMove={(e) => handle(e, true)}
      onPointerOut={() => onHover(null)}
    >
      <planeGeometry args={[8, 8]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

// ── المكوّن الجذري ─────────────────────────────────────────────────

interface DyingPiece {
  key: string;
  ent: PieceEntity;
}

export default function Board3D({
  board,
  flipped,
  selected,
  legalMoves,
  lastMove,
  checkedKing,
  hintMove,
  interactive,
  onSquareTap,
  capturedW = [],
  capturedB = [],
  turn = 'w',
  defeatedColor = null,
}: Board3DProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const materials = useMemo(() => buildChessMaterials(), []);
  useEffect(() => () => materials.dispose(), [materials]);
  const geoms = usePieceGeometries();

  // ── كيانات القطع + مزامنة الحركة ──
  const [entities, setEntities] = useState<PieceEntity[]>(() => buildEntities(board));
  const prevBoardRef = useRef<Board2>(board);
  // خريطة الرحلات الجارية كحالة: تُكتب من التأثير (نسخة جديدة) وتُقرأ في الرسم.
  const [flights, setFlights] = useState<Map<EntityId, FlightSpec>>(() => new Map());
  // خريطة أزمنة الظهور المتدرج (حالة حتى لا نلمس refs أثناء الرسم).
  const [spawnMap, setSpawnMap] = useState<Map<EntityId, number>>(() => {
    const m = new Map<EntityId, number>();
    const now = performance.now() + 140;
    buildEntities(board).forEach((ent, i) => m.set(ent.id, now + i * DUR_STAGGER_STEP));
    return m;
  });
  const [dying, setDying] = useState<DyingPiece[]>([]);
  const dyingSeq = useRef(0);

  // ── المقبرة: غنائم الالتقاط — `capturedW` = ما أسره الأبيض (قطع سوداء) ──
  const graves = useMemo(() => {
    const toSpecs = (glyphs: string[], capturer: 'w' | 'b') => {
      const counters = new Map<string, number>();
      return glyphs
        .map((g) => GLYPH_TO_TYPE[g])
        .filter((t): t is Type2 => Boolean(t))
        .map((type) => {
          const pieceColor: 'w' | 'b' = capturer === 'w' ? 'b' : 'w';
          const key0 = `${capturer}:${type}`;
          const seq = counters.get(key0) ?? 0;
          counters.set(key0, seq + 1);
          return {
            key: `${key0}:${seq}`,
            ent: { id: `grave-${key0}-${seq}`, color: pieceColor, type, r: 0, c: 0 },
            pieceColor,
            capturer,
            type,
            seq,
          };
        });
    };
    return [...toSpecs(capturedW, 'w'), ...toSpecs(capturedB, 'b')];
  }, [capturedW, capturedB]);

  // ── تأثيرات لحظية: غبار الهبوط وعمود الترقية ──
  const [fx, setFx] = useState<{ x: number; z: number; born: number; kind: 'land' | 'promote' }[]>([]);
  const pushFx = useCallback((x: number, z: number, kind: 'land' | 'promote') => {
    const item = { x, z, born: performance.now(), kind };
    setFx((f) => [...f.slice(-6), item]);
    window.setTimeout(() => setFx((f) => f.filter((g) => g !== item)), 1000);
  }, []);

  useEffect(() => {
    const prev = prevBoardRef.current;
    if (prev === board) return;
    prevBoardRef.current = board;

    const derived = deriveMove(prev, board);
    if (!derived || needsSnapSync(prev, board)) {
      // مزامنة صامتة: تراجع/إعادة ضبط/تحميل — إعادة بناء بظهور متدرج خفيف.
      const fresh = buildEntities(board);
      const now = performance.now() + 90;
      const spawn = new Map<EntityId, number>();
      fresh.forEach((ent, i) => spawn.set(ent.id, now + i * DUR_STAGGER_STEP));
      setFlights(new Map());
      setSpawnMap(spawn);
      setEntities(fresh);
      return;
    }

    const movers: { entId: EntityId; spec: FlightSpec }[] = [];

    // قطعة المسرحية الأساسية
    const moverEnt = entities.find((e) => e.r === derived.from[0] && e.c === derived.from[1]);
    if (moverEnt) {
      const [fx, fz] = squareToWorld(derived.from[0], derived.from[1]);
      const [tx, tz] = squareToWorld(derived.to[0], derived.to[1]);
      const isPromo = derived.kind === 'promotion';
      movers.push({
        entId: moverEnt.id,
        spec: {
          fromW: [fx, fz],
          toW: [tx, tz],
          t0: performance.now() + 30,
          promoteFlash: isPromo,
          onLand: () => pushFx(tx, tz, isPromo ? 'promote' : 'land'),
        },
      });
    }

    // رخّ التبييت
    if (derived.kind === 'castle' && derived.rook) {
      const rk = entities.find((e) => e.r === derived.rook!.from[0] && e.c === derived.rook!.from[1]);
      if (rk) {
        const [fx, fz] = squareToWorld(derived.rook.from[0], derived.rook.from[1]);
        const [tx, tz] = squareToWorld(derived.rook.to[0], derived.rook.to[1]);
        movers.push({
          entId: rk.id,
          spec: { fromW: [fx, fz], toW: [tx, tz], t0: performance.now() + 110 },
        });
      }
    }

    // الضحية: مسرحية خروج
    const victimSq =
      derived.kind === 'capture' || derived.kind === 'promotion'
        ? derived.to
        : derived.kind === 'enpassant'
          ? derived.epVictim?.square
          : undefined;
    if (victimSq) {
      const victim = entities.find((e) => e.r === victimSq[0] && e.c === victimSq[1]);
      if (victim) {
        const key = `${victim.id}-dy-${dyingSeq.current++}`;
        setDying((d) => [...d.slice(-3), { key, ent: victim }]);
        window.setTimeout(() => setDying((d) => d.filter((x) => x.key !== key)), 750);
      }
    }

    // نسخة جديدة من خريطة الرحلات حتى تلتقطها القطع كمواصفات جديدة.
    const nextFlights = new Map(flights);
    movers.forEach((m) => nextFlights.set(m.entId, m.spec));
    setFlights(nextFlights);
    setEntities((prevEnts) => reconcileEntities(prevEnts, board));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  // مؤشر التحويم
  const [hovered, setHovered] = useState<Sq | null>(null);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.cursor = interactive && hovered ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered, interactive]);

  const handleTap = useCallback(
    (r: number, c: number) => {
      if (interactive) onSquareTap(r, c);
    },
    [interactive, onSquareTap],
  );

  const selectedKey = selected ? `${selected[0]}:${selected[1]}` : null;

  return (
    <Canvas
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={{ antialias: !isMobile, powerPreference: 'high-performance' }}
      camera={{ position: [0, 7.3, 7.9], fov: 42, near: 0.1, far: 60 }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#05060A']} />
      <fog attach="fog" args={['#05060A', 13.5, 21]} />

      {/* كاميرا حرة: دخول سينمائي + سحب/عصر (النقرة تمر للمربعات) */}
      <CameraRig />

      {/* ── المسرح الضوئي: مفتاح دافئ + حافة قمرية باردة + ملء خافت ── */}
      <ambientLight intensity={0.3} color="#cfd3e0" />
      <directionalLight position={[5.5, 9, 4]} intensity={1.25} color="#ffd9a3" />
      <directionalLight position={[-6, 6.5, -6.5]} intensity={0.85} color="#8fa3c8" />
      {/* ملء أمامي يرفع وجوه القطع الداكنة نحو الكاميرا */}
      <directionalLight position={[0, 4.5, 11]} intensity={0.55} color="#aab4c8" />
      <pointLight position={[-3.5, 3, -4]} intensity={14} distance={12} decay={2} color="#4a4e5a" />
      <spotLight
        position={[0, 11.5, 1.5]}
        angle={0.52}
        penumbra={0.95}
        intensity={95}
        distance={22}
        decay={2}
        color="#ffe7c4"
      />

      {/* بيئة انعكاسات داخلية بلا أصول خارجية */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2.4} position={[0, 6, 0]} scale={[9, 9, 1]} rotation-x={Math.PI / 2} color="#ffe7c4" />
        <Lightformer intensity={1.1} position={[-6, 3, -4]} scale={[5, 5, 1]} color="#8fa3c8" />
        <Lightformer intensity={0.7} position={[6, 2.5, 5]} scale={[4, 4, 1]} color="#c9974c" />
      </Environment>

      <Turntable flipped={flipped} reducedMotion={reducedMotion}>
        <StaticBoard mats={materials} />
        <TapPlane interactive={interactive} onTap={handleTap} onHover={setHovered} />

        {/* ظلال تلامس ناعمة تحت القطع */}
        <ContactShadows position={[0, 0.004, 0]} scale={10.5} blur={2.6} far={1.6} opacity={0.62} frames={isMobile ? 1 : Infinity} resolution={isMobile ? 256 : 512} color="#000000" />

        {/* القطع الحية — يختفي الملك المهزوم لأن FallingKing يتولى مشهده */}
        {entities.map((ent) => {
          const isSel = selectedKey === `${ent.r}:${ent.c}`;
          if (defeatedColor && ent.type === 'K' && ent.color === defeatedColor) return null;
          return (
            <PieceMesh
              key={ent.id}
              ent={ent}
              geom={geoms.get(ent.type)!}
              mat={ent.color === 'w' ? materials.ivory : materials.obsidian}
              flight={flights.get(ent.id) ?? null}
              exiting={false}
              spawnAt={spawnMap.get(ent.id) ?? null}
              selected={isSel}
            />
          );
        })}

        {/* الضحايا في مسرحية الخروج */}
        {dying.map((d) => (
          <PieceMesh
            key={d.key}
            ent={d.ent}
            geom={geoms.get(d.ent.type)!}
            mat={d.ent.color === 'w' ? materials.ivory : materials.obsidian}
            flight={null}
            exiting
            spawnAt={null}
            selected={false}
          />
        ))}

        {/* المؤشرات */}
        {selected && <SelectGlow sq={selected} />}
        {legalMoves.map((sq, i) => {
          const occupied = entities.some((e) => e.r === sq[0] && e.c === sq[1]);
          return occupied ? (
            <CaptureRing key={`${sq[0]}:${sq[1]}`} sq={sq} />
          ) : (
            <LegalDot key={`${sq[0]}:${sq[1]}`} sq={sq} delay={(i % 8) * 22} />
          );
        })}
        {lastMove && <LastMoveTile sq={lastMove.from} />}
        {lastMove && <LastMoveTile sq={lastMove.to} />}
        {checkedKing && <CheckEmber sq={checkedKing} />}
        {hintMove && <HintArrow from={hintMove.from} to={hintMove.to} />}

        {/* غبار جوي خافت */}
        {!isMobile && (
          <Sparkles count={54} scale={[9.5, 2.6, 9.5]} position={[0, 1.7, 0]} size={2.4} speed={0.22} opacity={0.4} color={hex('dustMote')} />
        )}

        {/* المقبرة: غنائم الالتقاط على سكة الإطار */}
        <Graveyard3D graves={graves} geoms={geoms} mats={materials} />

        {/* تأثيرات لحظية */}
        {fx.map((f) =>
          f.kind === 'land' ? (
            <LandBurst key={`${f.born}`} x={f.x} z={f.z} born={f.born} />
          ) : (
            <PromoteColumn key={`${f.born}`} x={f.x} z={f.z} born={f.born} />
          ),
        )}

        {/* منارة الدور على جهة صاحب النقل */}
        <TurnBeacon side={turn === 'w' ? 'near' : 'far'} />

        {/* سقوط الملك الخاسر — سينما النهاية */}
        {defeatedColor && (() => {
          const kingEnt = entities.find((e) => e.type === 'K' && e.color === defeatedColor);
          if (!kingEnt) return null;
          return (
            <FallingKing
              key={`fall-${kingEnt.id}`}
              ent={kingEnt}
              geom={geoms.get('K')!}
              mat={kingEnt.color === 'w' ? materials.ivory : materials.obsidian}
            />
          );
        })()}

        {/* هالة تحويم خافتة على المربع تحت المؤشر */}
        {hovered &&
          interactive &&
          !(selectedKey === `${hovered[0]}:${hovered[1]}`) &&
          (() => {
            const [hx, hz] = squareToWorld(hovered[0], hovered[1]);
            return (
              <mesh position={[hx, 0.008, hz]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.96, 0.96]} />
                <meshBasicMaterial color={hex('bronzeGlow')} transparent opacity={0.1} depthWrite={false} />
              </mesh>
            );
          })()}
      </Turntable>

      {!isMobile && !reducedMotion && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.65} luminanceThreshold={0.58} luminanceSmoothing={0.3} mipmapBlur radius={0.72} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
