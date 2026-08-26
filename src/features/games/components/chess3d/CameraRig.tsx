/**
 * CameraRig — كاميرا حرة (سحب للتدوير، عصر للتكبير) بدخول سينمائي.
 *
 * التمييز بين النقرة والسحب يُدار عبر عتبة مسافة: إن تحرك المؤشر أقل
 * من DRAG_THRESHOLD بين pointerdown وup فهي نقرة تُمرَّر للمربعات.
 * الدخول الأول: انزلاق من علٍ بعيد إلى الموضع المسرحي.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const HOME = new THREE.Vector3(0, 7.3, 7.9);
const ENTRY_FROM = new THREE.Vector3(0.5, 12.5, 12.5);
const TARGET = new THREE.Vector3(0, 0, 0);

const PHI_HOME = Math.acos(HOME.y / HOME.length());
const THETA_HOME = Math.atan2(HOME.x, HOME.z);
const R_HOME = HOME.length();

const PHI_MIN = 0.32;
const PHI_MAX = 1.25;
const R_MIN = 6.2;
const R_MAX = 13.5;
/** أقل حركة بالبكسل تُعتبر سحباً (تحتها = نقرة). */
const DRAG_THRESHOLD_PX = 7;

export interface CameraRigProps {
  /** يُرفع true عند أول إطار مكتمل — لتأجيل ستارة البدء حتى استقرار المشهد. */
  onReady?: () => void;
}

export default function CameraRig({ onReady }: CameraRigProps) {
  const { camera, gl } = useThree();
  const spherical = useRef({ r: ENTRY_FROM.length(), phi: Math.acos(ENTRY_FROM.y / ENTRY_FROM.length()), theta: Math.atan2(ENTRY_FROM.x, ENTRY_FROM.z) });
  const entryStart = useRef<number | null>(null);
  const dragging = useRef(false);
  const moved = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const pinchDist = useRef<number | null>(null);
  const readyFired = useRef(false);

  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      dragging.current = true;
      moved.current = 0;
      last.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !last.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      moved.current += Math.abs(dx) + Math.abs(dy);
      if (moved.current <= DRAG_THRESHOLD_PX) return;
      // سحب: تدوير كروي
      spherical.current.theta -= dx * 0.0052;
      spherical.current.phi = Math.min(PHI_MAX, Math.max(PHI_MIN, spherical.current.phi - dy * 0.0042));
    };
    const onUp = (e: PointerEvent) => {
      dragging.current = false;
      last.current = null;
      el.releasePointerCapture?.(e.pointerId);
      void e;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.current.r = Math.min(R_MAX, Math.max(R_MIN, spherical.current.r + e.deltaY * 0.004));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        if (pinchDist.current !== null) {
          const delta = pinchDist.current - d;
          spherical.current.r = Math.min(R_MAX, Math.max(R_MIN, spherical.current.r + delta * 0.02));
        }
        pinchDist.current = d;
      }
    };
    const onTouchEnd = () => {
      pinchDist.current = null;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl]);

  useFrame(() => {
    const now = performance.now();
    if (entryStart.current === null) entryStart.current = now;
    const t = Math.min(1, (now - entryStart.current) / 2200);
    const e = 1 - Math.pow(1 - t, 3); // easeOutCubic

    // مزج الدخول: نصف القطر والزاوية تنزلقان من وضعية الدخول إلى البيت.
    const blend = (from: number, to: number) => from + (to - from) * e;
    const r = blend(spherical.current.r, R_HOME);
    const phi = blend(spherical.current.phi, PHI_HOME);
    const theta = blend(spherical.current.theta, THETA_HOME);

    camera.position.set(
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(TARGET);

    if (!readyFired.current && t > 0.35) {
      readyFired.current = true;
      onReady?.();
    }
  });

  return null;
}
