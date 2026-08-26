/**
 * buildPieceGeometry — يبني هندسة مدمجة واحدة لكل نوع قطعة.
 *
 * الدوّار (الملف الجانبي) والأجزاء الملحقة تُدمج في BufferGeometry واحدة،
 * فتُرسم كل قطعة بدعوة رسم واحدة وبمادة واحدة. صافي بمعناه الوظيفي:
 * يعتمد على three فقط، ويُختبر عبر صناديق الإحاطة والعدادات.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { type ExtraPart, getPieceSpec, PIECE_HEIGHTS, type PieceType3D } from './pieceGeometry';

/** اتجاه مواجهة الحصان: الأبيض نحو الأسود (-z) والعكس. */
export const KNIGHT_FACING: Record<'w' | 'b', number> = { w: Math.PI / 2, b: -Math.PI / 2 };

function latheFromProfile(profile: { r: number; y: number }[]): THREE.BufferGeometry {
  const pts = profile.map((p) => new THREE.Vector2(Math.max(0.0005, p.r), p.y));
  const geo = new THREE.LatheGeometry(pts, 48);
  return geo;
}

function partGeometry(part: ExtraPart): THREE.BufferGeometry {
  if (part.kind === 'box') {
    const g = new THREE.BoxGeometry(...part.size);
    g.rotateY(part.rotY ?? 0);
    g.translate(...part.pos);
    return g;
  }
  if (part.kind === 'sphere') {
    const g = new THREE.SphereGeometry(part.r, 20, 14);
    g.translate(...part.pos);
    return g;
  }
  // extrude: صورة ظلية في XY مبثوقة على Z ثم توضع وتدار.
  const shape = new THREE.Shape(part.outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: part.depth,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 2,
    curveSegments: 8,
  });
  g.translate(0, 0, -part.depth / 2);
  g.rotateY(part.rotY ?? 0);
  g.translate(...part.pos);
  return g;
}

/**
 * يبني هندسة القطعة كاملة عند قاعدتها y=0.
 * تُعيد هندسة جديدة كل استدعاء (غير مشتركة) — المشهد يخزّنها مؤقتاً بنفسه.
 */
export function buildPieceGeometry(type: PieceType3D): THREE.BufferGeometry {
  const spec = getPieceSpec(type);
  // الدمج يتطلب اتساق الصيغة: نحوّل الكل إلى غير مفهرس (Lathe مفهرسة،
  // Extrude غير مفهرسة — خلطهما يعيد null من mergeGeometries).
  const parts: THREE.BufferGeometry[] = [latheFromProfile(spec.profile).toNonIndexed()];
  for (const extra of spec.extras) {
    const g = partGeometry(extra);
    parts.push(g.index ? g.toNonIndexed() : g);
  }

  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (!merged) throw new Error(`فشل دمج هندسة القطعة ${type}`);
  merged.computeVertexNormals();
  return merged;
}

/** ارتفاع صندوق الإحاطة الفعلي للهندسة المبنية (للاختبارات والمقاييس). */
export function measuredHeight(type: PieceType3D): number {
  const g = buildPieceGeometry(type);
  g.computeBoundingBox();
  const h = g.boundingBox ? g.boundingBox.max.y : 0;
  g.dispose();
  return h;
}

/** تحقق سريع أن الارتفاع المقاس قريب من الاسمي. */
export function heightMatchesSpec(type: PieceType3D, tolerance = 0.09): boolean {
  return Math.abs(measuredHeight(type) - PIECE_HEIGHTS[type]) <= tolerance;
}
