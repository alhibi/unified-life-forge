import { useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import SEO from '@/components/SEO';
import { ArrowRight, Brain, Zap } from '@/lib/icons';

import MemoryTimelineRail from '../components/MemoryTimelineRail';
import MindFallback2D from '../components/MindFallback2D';
import { useMindState } from '../hooks/useMindState';
import { MIND_TOKENS } from '../lib/mindTokens';

const MindScene = lazy(() => import('../components/MindScene'));

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Horizontal vitality bar — pure light, no chrome around it. */
function VitalityBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-micro font-body tracking-[0.2em] text-[color:var(--m-seam)]/55 w-[4.5rem] text-start"
      >
        {label}
      </span>
      <div className="h-[3px] w-24 overflow-hidden rounded-full bg-[color:var(--m-seam)]/10">
        <div
          className="h-full rounded-full progress-fill duration-slow"
          style={{ '--progress': Math.min(1, Math.max(0, value)), background: color, boxShadow: `0 0 8px ${color}` } as CSSProperties}
        />
      </div>
      <span
        className="text-micro font-body tabular-nums text-[color:var(--m-seam)]/70 w-9"
      >
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export default function MindPage() {
  const navigate = useNavigate();
  const reduced = !!useReducedMotion();
  const mind = useMindState();
  const [webgl] = useState(() => (typeof window !== 'undefined' ? hasWebGL() : true));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<string[]>([]);

  // Auto-flash the newest note on mount so the mind feels alive immediately.
  useEffect(() => {
    if (!mind.notes.length || selectedId) return;
    const id = mind.notes[0].id;
    // Async scheduling keeps the effect body free of synchronous setState.
    const show = setTimeout(() => setFlashIds([id]), 0);
    const clear = setTimeout(() => setFlashIds([]), 1400);
    return () => {
      clearTimeout(show);
      clearTimeout(clear);
    };
  }, [mind.notes, selectedId]);

  const useFallback = !webgl || reduced;

  // The selected note drives the details card; fall back to newest.
  const selectedNote = useMemo(
    () => mind.notes.find((n) => n.id === selectedId) ?? null,
    [mind.notes, selectedId],
  );

  const linkedNotes = useMemo(() => {
    if (!selectedNote) return [];
    return mind.links
      .filter(([a, b]) => a === selectedNote.id || b === selectedNote.id)
      .map(([a, b]) => (a === selectedNote.id ? b : a))
      .map((id) => mind.notes.find((n) => n.id === id))
      .filter((n): n is NonNullable<typeof n> => !!n)
      .slice(0, 6);
  }, [mind.links, mind.notes, selectedNote]);

  const stat = useMemo(() => `${formatAge(mind.firstNoteAt)} · ${mind.notes.length} ملاحظة`, [
    mind.firstNoteAt,
    mind.notes.length,
  ]);

  const BackIcon = ArrowRight;

  return (
    <div
      className="relative w-screen h-[100dvh] bg-[color:var(--m-void)] text-[color:var(--m-seam)] overflow-hidden"
      style={
        {
          // The scene palette (MIND_TOKENS) exposed as CSS custom
          // properties so the overlay chrome can reference the
          // living-mind colors without raw hex literals.
          '--m-void': MIND_TOKENS.void,
          '--m-seam': MIND_TOKENS.seam,
          '--m-organic-glow': MIND_TOKENS.organicGlow,
          '--m-mech-glow': MIND_TOKENS.mechGlow,
          '--m-thread': MIND_TOKENS.thread,
        } as CSSProperties
      }
    >
      <SEO
        title={'العقل الحيّ — الأرشيف العصبي'}
        description={'مساحة تأمّلية تجسّد ملاحظاتك عقلًا ثنائي النصفين ينمو مع الوقت.'}
        path="/pkm/mind"
      />

      {/* Top overlay */}
      <div className="absolute top-0 inset-x-0 z-raised flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2 pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto h-9 w-9 rounded-full bg-[color:var(--m-void)]/70 border border-[color:var(--m-seam)]/10 flex items-center justify-center"
          aria-label={'رجوع'}
        >
          <BackIcon className="w-4 h-4 text-[color:var(--m-seam)]/80" />
        </button>
        <div className="text-center pointer-events-none">
          <div
            className="text-micro font-body tracking-[0.35em] uppercase text-[color:var(--m-seam)]/40"
          >
            {'العقل الحيّ'}
          </div>
          <div
            className="text-micro font-body text-[color:var(--m-seam)]/50 mt-0.5"
          >
            {stat}
          </div>
        </div>
        <div className="w-9 h-9" />
      </div>

      {/* Scene + rail */}
      <div className="absolute inset-0 flex" style={{ paddingTop: 60, paddingBottom: 24 }}>
        <div className="flex-1 min-w-0 relative">
          {mind.loading ? (
            <div
              className="absolute inset-0 flex items-center justify-center text-[color:var(--m-seam)]/50 text-mini font-body"
            >
              {'...يستيقظ'}
            </div>
          ) : useFallback ? (
            <MindFallback2D mind={mind} />
          ) : (
            <Suspense fallback={<MindFallback2D mind={mind} />}>
              <MindScene
                mind={mind}
                selectedId={selectedId}
                onSelectNote={setSelectedId}
                reducedMotion={reduced}
              />
            </Suspense>
          )}

          {/* Empty-state whisper */}
          {!mind.loading && mind.notes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-8">
              <p
                className="text-center text-[color:var(--m-seam)]/60 text-meta max-w-xs leading-relaxed font-display"
              >
                {'اكتب ملاحظتك الأولى. سيبدأ هذا العقل في الوجود.'}
              </p>
            </div>
          )}

          {/* Selected-note card — floats over the scene, no boxy chrome. */}
          {selectedNote && (
            <aside className="absolute bottom-3 start-3 max-w-[19rem] z-raised pointer-events-auto">
              <div className="rounded-xl bg-[color:var(--m-void)]/90 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedNote.hemisphere === 'organic' ? (
                      <Brain className="w-4 h-4 shrink-0 text-[color:var(--m-organic-glow)]" />
                    ) : (
                      <Zap className="w-4 h-4 shrink-0 text-[color:var(--m-mech-glow)]" />
                    )}
                    <h2
                      className="text-meta truncate text-[color:var(--m-seam)] font-display"
                    >
                      {selectedNote.title || 'بدون عنوان'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    aria-label="إغلاق"
                    className="shrink-0 text-[color:var(--m-seam)]/50 hover:text-[color:var(--m-seam)] transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <dt className="text-micro text-[color:var(--m-seam)]/45">الكلمات</dt>
                    <dd className="text-mini tabular-nums text-[color:var(--m-seam)]/90">{selectedNote.wordCount}</dd>
                  </div>
                  <div>
                    <dt className="text-micro text-[color:var(--m-seam)]/45">روابط واردة</dt>
                    <dd className="text-mini tabular-nums text-[color:var(--m-seam)]/90">{selectedNote.backlinkCount}</dd>
                  </div>
                  <div>
                    <dt className="text-micro text-[color:var(--m-seam)]/45">النصف</dt>
                    <dd className="text-mini">{selectedNote.hemisphere === 'organic' ? 'عضوي' : 'تكنولوجي'}</dd>
                  </div>
                </dl>

                {linkedNotes.length > 0 && (
                  <div className="mt-3 border-t border-[color:var(--m-seam)]/10 pt-2">
                    <div className="text-micro tracking-[0.15em] text-[color:var(--m-thread)]/60 mb-1">{'مرتبطة بـ'}</div>
                    <ul className="space-y-1">
                      {linkedNotes.map((n) => (
                        <li key={n.id}>
                          <button
                            onClick={() => setSelectedId(n.id)}
                            className="w-full text-start text-micro text-[color:var(--m-seam)]/70 hover:text-[color:var(--m-seam)] truncate transition-colors"
                          >
                            {n.title || 'بدون عنوان'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link
                  to={`/pkm?note=${encodeURIComponent(selectedNote.id)}`}
                  className="mt-3 block text-center text-micro tracking-wide rounded-lg border border-[color:var(--m-seam)]/10 py-1.5 text-[color:var(--m-seam)]/80 hover:text-[color:var(--m-seam)] hover:border-[color:var(--m-seam)]/25 transition-colors"
                >
                  {'افتح في الذاكرة الرقمية'}
                </Link>
              </div>
            </aside>
          )}
        </div>

        <div className="p-2 flex flex-col gap-2 items-end">
          {/* Vitality readouts — light bars only. */}
          <div className="rounded-xl bg-[color:var(--m-void)]/85 px-3 py-2 space-y-1.5 pointer-events-none">
            <VitalityBar label="عضوي" value={mind.vitalityOrganic} color={MIND_TOKENS.organicGlow} />
            <VitalityBar label="تكنولوجي" value={mind.vitalityMechanical} color={MIND_TOKENS.mechGlow} />
          </div>

          <MemoryTimelineRail
            notes={mind.notes}
            events={mind.events}
            activeIds={flashIds}
            onHover={(ids) => setFlashIds(ids)}
            onLeave={() => setFlashIds([])}
            onSelect={(id) => setSelectedId(id)}
          />
        </div>
      </div>
    </div>
  );
}

function formatAge(firstNoteAt: Date | number | null): string {
  if (!firstNoteAt) return '0d';
  const first = typeof firstNoteAt === 'number' ? firstNoteAt : firstNoteAt.getTime();
  const ms = Math.max(0, Date.now() - first);
  const days = Math.floor(ms / (24 * 3600 * 1000));
  const years = Math.floor(days / 365.25);
  const months = Math.floor((days - years * 365.25) / 30.4375);
  if (years > 0) return `${years}y ${months}m`;
  if (months > 0) return `${months}m`;
  return `${days}d`;
}
