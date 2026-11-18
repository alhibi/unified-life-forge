import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { type InspectorEntry, TokenInspector } from '@/features/appearance';
import { RefreshCcw } from '@/lib/icons';

/**
 * Motion token inspector — developer surface, not user settings.
 *
 * It used to live at the bottom of /settings/motion, where it added thousands of
 * pixels of token tables to a preferences screen. It belongs on the system
 * gallery (/dev/design-system) next to the other token documentation; the
 * gallery owner mounts this component there.
 */
export default function MotionInspector() {
  const {
    motionSpeed,
    motionAmplitude,
    springBounce,
    fpsCap,
    navStyle,
    scrollProfile,
    overlayStyle,
    navDuration,
    listStagger,
    pressFeedback,
    reduceMotion,
    compositorHints,
    resetMotionPreferences,
  } = useApp();

  const entries: readonly InspectorEntry[] = useMemo(
    () => [
      { token: '--motion-scale', label: 'مضاعف المدد', value: (1 / motionSpeed).toFixed(3) },
      { token: '--motion-nav-scale', label: 'مضاعف الانتقال', value: navDuration.toFixed(2) },
      { token: '--motion-amp', label: 'مضاعف المسافة', value: motionAmplitude.toFixed(2) },
      { token: '--motion-bounce', label: 'نسبة الارتداد', value: springBounce.toFixed(2) },
      { token: '--motion-stagger', label: 'إيقاع القوائم', value: listStagger.toFixed(2) },
      { token: '--motion-press-strength', label: 'قوة الضغط', value: pressFeedback.toFixed(2) },
      { token: 'data-nav-style', label: 'نمط الانتقال', value: navStyle },
      { token: 'data-overlay-style', label: 'نمط الطبقات', value: overlayStyle },
      { token: 'data-scroll-profile', label: 'طابع التمرير', value: scrollProfile },
      {
        token: 'data-reduced-motion',
        label: 'تقليل الحركة',
        value: reduceMotion ? 'true (app)' : 'يتبع النظام',
      },
      {
        token: 'data-compositor-hints',
        label: 'تلميحات المُركّب',
        value: String(compositorHints),
      },
      {
        token: 'requestAnimationFrame',
        label: 'حد الإطارات',
        value: fpsCap === 'auto' ? 'غير مقيّد' : `${fpsCap} Hz`,
      },
    ],
    [
      motionSpeed,
      motionAmplitude,
      springBounce,
      fpsCap,
      navStyle,
      scrollProfile,
      overlayStyle,
      navDuration,
      listStagger,
      pressFeedback,
      reduceMotion,
      compositorHints,
    ],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-mini text-muted-foreground">
          كل قيمة هنا مكتوبة على جذر المستند الآن، ويقرأها framer-motion و CSS معاً.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={resetMotionPreferences}>
          <RefreshCcw aria-hidden />
          إعادة ضبط قيم الحركة
        </Button>
      </div>
      <TokenInspector entries={entries} />
    </div>
  );
}
