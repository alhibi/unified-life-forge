/**
 * The motion feature — every control that changes how the app moves.
 *
 * One screen consumes these: `الحركة والأداء` (/settings/motion). The sections
 * are built from the shared atoms in `@/features/appearance` so the motion
 * screen and the interface screen read as one product.
 */

export { default as LiveMotionPreview } from './components/LiveMotionPreview';
export { default as MotionSection } from './components/MotionSection';
export { default as PerformancePanel } from './components/PerformancePanel';
