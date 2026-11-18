import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useApp } from '@/contexts/AppContext';
import { useMotionRuntimeRevision } from '@/hooks/useMotionRuntime';
import { ChevronDown, Sparkles } from '@/lib/icons';
import { buildNavVariants, MOTION, type NavStyleId } from '@/lib/motion';

interface LiveMotionPreviewProps {
  /** Changes whenever any motion setting changes, to remount the demo. */
  revision: string;
  navStyle: NavStyleId;
}

const SCREENS = [
  { title: 'الشاشة الأولى', body: 'اضغط «انتقل» لتشاهد الدخول والخروج بالنمط الحالي' },
  { title: 'الشاشة الثانية', body: 'المدّة والمنحنى والاتجاه كلها من إعداداتك الحالية' },
] as const;

/**
 * A working miniature of the app's own navigation.
 *
 * This is not a decorative loop: it mounts the SAME `buildNavVariants` factory
 * that `PageTransition` uses, inside the same `AnimatePresence mode="popLayout"`
 * arrangement, with the same `custom` nav-mode plumbing. So what the user sees
 * here is literally what a route change will do — including the RTL mirroring
 * of the slide style and the complete absence of an enter delay in silk.
 *
 * Three more demonstrations sit under it, because the brief covers more than
 * screens: a press target, a disclosure that expands, and a scroll strip.
 */
export default function LiveMotionPreview({ revision, navStyle }: LiveMotionPreviewProps) {
  const { dir, reduceMotion } = useApp();
  const rtl = dir === 'rtl';
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'push' | 'pop'>('push');
  const [open, setOpen] = useState(false);

  // The runtime mutates MOTION from an effect, so reading it during render is one
  // commit behind unless we subscribe. Without this the coefficients printed
  // below reported the PREVIOUS setting — a readout that lies is worse than none.
  useMotionRuntimeRevision();

  const variants = buildNavVariants(navStyle, rtl);
  const screen = SCREENS[index];

  const go = () => {
    setMode(index === 0 ? 'push' : 'pop');
    setIndex((current) => (current === 0 ? 1 : 0));
  };

  return (
    <div className="space-y-2">
      {/* ── Navigation ── */}
      <div className="relative h-24 overflow-hidden rounded-md bg-background">
        <AnimatePresence mode="popLayout" initial={false} custom={mode}>
          <motion.div
            key={`${revision}-${index}`}
            custom={mode}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex flex-col justify-center gap-1 px-4"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-body font-semibold text-foreground">{screen.title}</span>
            <span className="text-mini text-muted-foreground">{screen.body}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={go}
          className="flex min-h-[var(--ui-control-h)] items-center justify-center rounded-md bg-primary px-3 text-meta font-semibold text-primary-foreground"
        >
          {index === 0 ? 'انتقل' : 'ارجع'}
        </button>
        <button
          type="button"
          className="flex min-h-[var(--ui-control-h)] items-center justify-center gap-2 rounded-md bg-secondary px-3 text-meta font-semibold text-secondary-foreground"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          هدف للضغط
        </button>
      </div>

      {/* ── Disclosure: the non-bouncy expand ── */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex min-h-[var(--ui-touch-min)] w-full items-center justify-between gap-3 rounded-md bg-secondary px-3 text-start text-meta font-medium text-foreground">
          <span>خانة قابلة للانسدال</span>
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 text-muted-foreground transition-transform duration-normal ease-enter ${
              open ? 'rotate-180' : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pt-2 text-mini text-muted-foreground">
          الارتفاع يتحرّك بمنحنى واحد بلا نابض، فلا يرتدّ المحتوى أسفل الخانة ولا يهتزّ.
        </CollapsibleContent>
      </Collapsible>

      {/* ── Scroll strip ── */}
      <div
        className="native-carousel gap-2 rounded-md bg-background p-2"
        aria-label="شريط للتمرير الأفقي"
      >
        {Array.from({ length: 14 }, (_, cell) => (
          <div
            key={cell}
            className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-secondary text-mini tabular-nums text-secondary-muted"
          >
            {cell + 1}
          </div>
        ))}
      </div>

      {reduceMotion && (
        <p className="rounded-md bg-secondary px-3 py-2 text-micro text-muted-foreground">
          تقليل الحركة مفعّل: الانتقالات تُختصر إلى تلاشٍ شبه فوري، ويبقى تغيّر اللون والتركيز.
        </p>
      )}

      <p className="font-mono text-micro tabular-nums text-muted-foreground-subtle">
        spring k={Math.round(Number((MOTION.spring as { stiffness?: number }).stiffness ?? 0))} · c=
        {Number((MOTION.spring as { damping?: number }).damping ?? 0).toFixed(1)} · nav=
        {Number((MOTION.navSilkEnter as { duration?: number }).duration ?? 0).toFixed(3)}s
      </p>
    </div>
  );
}

/**
 * The transistor-surface preview: a real overlay surface with the same
 * `data-ui-surface="menu"` key the CSS overlay character reads, so switching
 * fade / lift / scale visibly changes what happens when it opens.
 *
 * It is deliberately a real DOM toggle rather than a looping animation: the
 * preview must stop when the user stops asking for it, and reduced motion must
 * make it a plain appearance.
 */
export function OverlayMotionPreview({ revision }: { revision: string }) {
  const [open, setOpen] = useState(true);
  const { reduceMotion } = useApp();

  return (
    <div className="rounded-md bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-micro text-muted-foreground">معاينة الطبقات العائمة</p>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-[var(--ui-touch-min)] items-center rounded-full bg-secondary px-3 text-mini font-semibold text-secondary-foreground"
        >
          {open ? 'أخفِ الطبقة' : 'أظهر الطبقة'}
        </button>
      </div>
      <div className="relative mt-2 grid h-24 place-items-center overflow-hidden rounded-md border border-dashed border-border">
        {open ? (
          <div
            key={revision}
            data-ui-surface="menu"
            className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 w-40 rounded-md border border-border bg-popover p-2 text-center text-mini text-popover-foreground shadow-[var(--shadow-2)]"
          >
            طبقة عائمة — {reduceMotion ? 'بلا حركة' : 'بالنمط المختار'}
          </div>
        ) : (
          <span className="text-micro text-muted-foreground">الطبقة مغلقة</span>
        )}
      </div>
    </div>
  );
}