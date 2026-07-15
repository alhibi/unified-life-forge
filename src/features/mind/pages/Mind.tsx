import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useMindState } from '../hooks/useMindState';
import MemoryTimelineRail from '../components/MemoryTimelineRail';
import MindFallback2D from '../components/MindFallback2D';
import { formatAge } from '../lib/growth';
import { ArrowLeft, ArrowRight } from '@/lib/icons';

const MindScene = lazy(() => import('../components/MindScene'));

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export default function MindPage() {
  const navigate = useNavigate();
  const { language } = useApp();
  const isAr = language === 'ar';
  const reduced = !!useReducedMotion();
  const mind = useMindState();
  const [webgl] = useState(() => (typeof window !== 'undefined' ? hasWebGL() : true));
  const [activeIds, setActiveIds] = useState<string[]>([]);

  // Auto-flash the newest note on mount so the mind feels alive immediately.
  useEffect(() => {
    if (!mind.notes.length) return;
    const id = mind.notes[0].id;
    setActiveIds([id]);
    const t = setTimeout(() => setActiveIds([]), 1400);
    return () => clearTimeout(t);
  }, [mind.notes.length]);

  const useFallback = !webgl || reduced;

  const stat = useMemo(() => {
    const v = ((mind.vitalityOrganic + mind.vitalityMechanical) / 2).toFixed(2);
    return `${formatAge(mind.firstNoteAt)} · vitality ${v}`;
  }, [mind]);

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="fixed inset-0 z-40 bg-[#0A0A0A] text-[color:#F2E7C9] overflow-hidden">
      <SEO
        title={isAr ? 'العقل الحيّ — الأرشيف العصبي' : 'Living Mind — Neural Archive'}
        description={isAr
          ? 'مساحة تأمّلية تجسّد ملاحظاتك عقلًا ثنائي النصفين ينمو مع الوقت.'
          : 'Ein kontemplativer Raum, in dem Ihre Notizen zu einem lebendigen Zwei-Hemisphären-Geist werden.'}
        path="/pkm/mind"
      />

      {/* Top overlay */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto h-9 w-9 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
          aria-label={isAr ? 'رجوع' : 'Zurück'}
        >
          <BackIcon className="w-4 h-4 text-[color:#F2E7C9]/80" />
        </button>
        <div className="text-center pointer-events-none">
          <div className="text-[10px] tracking-[0.35em] uppercase text-[color:#F2E7C9]/40" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>
            {isAr ? 'العقل الحيّ' : 'Living Mind'}
          </div>
          <div className="text-[10px] text-[color:#F2E7C9]/50 mt-0.5" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>
            {stat}
          </div>
        </div>
        <div className="w-9 h-9" />
      </div>

      {/* Scene + rail */}
      <div className="absolute inset-0 flex" style={{ paddingTop: 60, paddingBottom: 24 }}>
        <div className="flex-1 min-w-0 relative">
          {mind.loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-[color:#F2E7C9]/50 text-xs" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>
              {isAr ? '...يستيقظ' : 'awakening…'}
            </div>
          ) : useFallback ? (
            <MindFallback2D mind={mind} />
          ) : (
            <Suspense fallback={<MindFallback2D mind={mind} />}>
              <MindScene mind={mind} activeIds={activeIds} reducedMotion={reduced} />
            </Suspense>
          )}

          {/* Empty-state whisper */}
          {!mind.loading && mind.notes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-8">
              <p className="text-center text-[color:#F2E7C9]/60 text-sm max-w-xs leading-relaxed" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                {isAr
                  ? 'اكتب ملاحظتك الأولى. سيبدأ هذا العقل في الوجود.'
                  : 'Schreibe deine erste Notiz. Dieser Geist wird zu existieren beginnen.'}
              </p>
            </div>
          )}
        </div>

        <div className="p-2">
          <MemoryTimelineRail
            notes={mind.notes}
            events={mind.events}
            activeIds={activeIds}
            onHover={setActiveIds}
            onLeave={() => setActiveIds([])}
            onSelect={(id) => setActiveIds([id])}
            isAr={isAr}
          />
        </div>
      </div>
    </div>
  );
}