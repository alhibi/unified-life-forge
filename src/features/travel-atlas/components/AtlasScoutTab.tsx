/**
 * AtlasScoutTab — the AI deep-discovery surface of the Travel Atlas.
 *
 * Left rail: watch targets with geocoded autocomplete (Nominatim, debounced,
 * one-request-per-second polite), depth selector, live progress with a real
 * cancel button. Main area: researched dossiers as rich cards — Commons
 * photo, description, atmosphere, local tips, months, price, dish — with
 * one-tap promotion into the real atlas or dismissal.
 *
 * Every run ends with an HONEST summary: how many places were newly filed,
 * how many were duplicates already in the log, how many failed. No fake
 * success messages.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check,
  Compass,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

import type { GeocodeResult } from '../lib/geocoding';
import { searchPlaces } from '../lib/geocoding';
import { fetchPlacePhoto, type PlacePhotoResult } from '../lib/placePhoto';
import { describeOutcome } from '../lib/scoutOutcome';
import {
  atlasScoutApi,
  type ScoutDepth,
  type ScoutOutcome,
  type ScoutPlace,
  type ScoutProgressEvent,
  type ScoutTargetKind,
  type TargetBrief,
  type WatchTarget,
} from '../scoutApi';

const CATEGORY_LABELS: Record<string, string> = {
  nature: 'طبيعة', beach: 'شاطئ', viewpoint: 'إطلالة', historic: 'تاريخي',
  museum: 'متحف', religious: 'ديني', food: 'مطعم', cafe: 'مقهى',
  market: 'سوق', city: 'مدينة', park: 'حديقة', adventure: 'مغامرة',
  stay: 'إقامة', culture: 'ثقافة', transport: 'مواصلات', other: 'أخرى',
};

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  cafe: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  nature: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  park: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  beach: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  adventure: 'bg-red-500/15 text-red-400 border-red-500/30',
  historic: 'bg-yellow-600/15 text-yellow-500 border-yellow-600/30',
  museum: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  culture: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

const PRICE_LABELS = ['مجاني', 'رخيص', 'متوسط', 'مرتفع', 'فاخر'];

/** Input handed up by the picker — enriched when a geocode hit was chosen. */
interface PickedTargetInput {
  kind: ScoutTargetKind;
  query: string;
  displayNameAr: string;
  displayNameEn: string;
  isoCode: string | null;
  centerLng: number | null;
  centerLat: number | null;
}

/* ── Geocoded target picker ─────────────────────────────────────────────── */

const SUGGEST_DEBOUNCE_MS = 700; // Nominatim usage policy: ≤1 req/s

interface TargetPickerProps {
  busy: boolean;
  onAdd: (input: PickedTargetInput) => void;
}

function TargetPicker({ busy, onAdd }: TargetPickerProps) {
  const [kind, setKind] = useState<ScoutTargetKind>('city');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<GeocodeResult | null>(null);

  // The dropdown is DERIVED: fresh suggestions only when the box is open,
  // the query grew beyond a pick, and the text is long enough to search.
  const trimmedQuery = query.trim();
  const pickedStillMatches = picked !== null && picked.title === trimmedQuery;
  const visibleSuggestions =
    open && !pickedStillMatches && trimmedQuery.length >= 3 ? suggestions : [];

  /* Debounced search-as-you-type */
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || picked?.title === trimmed) return;

    const abort = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(trimmed, { signal: abort.signal, limit: 5 })
        .then((results) => setSuggestions(results))
        .catch(() => setSuggestions([]));
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [query, picked]);

  const submit = () => {
    const q = query.trim();
    if (!q || busy) return;
    const hit = picked?.title === q ? picked : null;
    onAdd({
      kind,
      query: q,
      displayNameAr: hit?.title ?? q,
      displayNameEn: hit?.title ?? q,
      isoCode: hit?.isoCode ?? null,
      centerLng: hit ? hit.coordinates[0] : null,
      centerLat: hit ? hit.coordinates[1] : null,
    });
    setOpen(false);
    setSuggestions([]);
  };

  const pickSuggestion = (s: GeocodeResult) => {
    setQuery(s.title);
    setPicked(s);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5" role="tablist" aria-label="نوع المكان المفضل">
        {(
          [
            { id: 'city' as const, label: 'مدينة' },
            { id: 'country' as const, label: 'دولة' },
          ]
        ).map((k) => (
          <button
            key={k.id}
            role="tab"
            aria-selected={kind === k.id}
            onClick={() => setKind(k.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-micro font-bold transition-all active:scale-95',
              kind === k.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/20 border border-border/50 text-muted-foreground hover:text-foreground'
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPicked(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={kind === 'city' ? 'برلين، إسطنبول، نيقوسيا…' : 'ألمانيا، اليابان…'}
          className="ps-9 bg-muted/20 border-border/50 text-mini"
          disabled={busy}
          role="combobox"
          aria-expanded={visibleSuggestions.length > 0}
          aria-label="ابحث عن مدينة أو دولة"
        />
        {visibleSuggestions.length > 0 && (
          <ul
            className="absolute z-20 inset-x-0 top-full mt-1 max-h-48 divide-y divide-border overflow-y-auto rounded-card border border-border bg-background shadow-lg"
            role="listbox"
          >
            {visibleSuggestions.map((s) => (
              <li key={s.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-start px-3 py-2 hover:bg-primary/10 transition-colors"
                >
                  <span className="block text-mini font-semibold text-foreground truncate">{s.title}</span>
                  <span className="block text-micro text-muted-foreground truncate">{s.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button size="sm" onClick={submit} disabled={!query.trim() || busy} className="w-full gap-1.5 rounded-xl font-bold">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        إضافة إلى المفضلة
      </Button>
    </div>
  );
}

/* ── Card photo ─────────────────────────────────────────────────────────── */

function usePlacePhoto(query: string | null): PlacePhotoResult {
  const [photo, setPhoto] = useState<PlacePhotoResult>({ url: null, credit: null });
  useEffect(() => {
    if (!query) return;
    let alive = true;
    void fetchPlacePhoto(query).then((p) => {
      if (alive) setPhoto(p);
    });
    return () => {
      alive = false;
    };
  }, [query]);
  return photo;
}

function DossierPhoto({ place }: { place: ScoutPlace }) {
  const photo = usePlacePhoto(place.photoQueryEn ?? place.nameEn);
  const [failed, setFailed] = useState(false);

  if (!photo.url || failed) return null;
  return (
    <figure className="relative -mx-4 -mt-4 mb-3 h-36 overflow-hidden">
      <img
        src={photo.url}
        alt={place.nameAr || place.nameEn}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      {photo.credit && (
        <figcaption
          dir="ltr"
          className="absolute bottom-0 end-0 max-w-[70%] truncate bg-background/70 backdrop-blur-sm px-1.5 py-0.5 text-micro text-muted-foreground"
        >
          © {photo.credit}
        </figcaption>
      )}
    </figure>
  );
}

/* ── Dossier card ────────────────────────────────────────────────────────── */

interface DossierCardProps {
  place: ScoutPlace;
  index: number;
  onPromote: (p: ScoutPlace) => void;
  onDismiss: (p: ScoutPlace) => void;
  promoting: boolean;
}

function DossierCard({ place, index, onPromote, onDismiss, promoting }: DossierCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="surface-depth rounded-2xl p-4 space-y-3 relative overflow-hidden"
    >
      <DossierPhoto place={place} />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('px-2 py-0.5 rounded-md border text-micro font-bold', categoryColor(place.category))}>
              {categoryLabel(place.category)}
            </span>
            {place.signatureDish && (
              <span className="text-micro text-muted-foreground truncate max-w-[180px]">
                🍽️ {place.signatureDish}
              </span>
            )}
          </div>
          <h3 className="text-meta font-extrabold text-foreground leading-snug">
            {place.nameAr || place.nameEn}
          </h3>
          {place.nameAr && place.nameEn !== place.nameAr && (
            <p className="text-micro font-mono text-muted-foreground" dir="ltr">{place.nameEn}</p>
          )}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onPromote(place)}
            disabled={promoting}
            title="حفظ في أطلسي"
            aria-label="حفظ في الأطلس"
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90',
              place.promotedPlaceId
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {promoting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : place.promotedPlaceId ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
          {!place.promotedPlaceId && (
            <button
              onClick={() => onDismiss(place)}
              title="إخفاء"
              aria-label="إخفاء هذا المكان"
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-muted/30 text-muted-foreground hover:text-foreground transition-all active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <p className="text-mini leading-relaxed text-foreground/90">{place.descriptionAr}</p>

      {place.atmosphereAr && (
        <div className="rounded-xl bg-primary/[0.06] border border-primary/15 p-3 space-y-0.5">
          <span className="text-micro font-bold uppercase tracking-[0.12em] text-primary/80">الأجواء</span>
          <p className="text-micro leading-relaxed text-foreground/85 italic">{place.atmosphereAr}</p>
        </div>
      )}

      {place.tipsAr && (
        <div className="space-y-0.5">
          <span className="text-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">نصائح محلية</span>
          <p className="text-micro leading-relaxed text-muted-foreground">{place.tipsAr}</p>
        </div>
      )}

      {/* Facts strip */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {place.priceLevel !== null && (
          <span className="px-2 py-0.5 rounded-lg bg-muted/20 border border-border/40 text-micro font-semibold text-foreground">
            💰 {PRICE_LABELS[place.priceLevel]}
          </span>
        )}
        {place.durationMinutes !== null && (
          <span className="px-2 py-0.5 rounded-lg bg-muted/20 border border-border/40 text-micro font-semibold text-foreground tabular-nums">
            🕐 ~{place.durationMinutes >= 60 ? `${Math.round(place.durationMinutes / 60)} ساعة` : `${place.durationMinutes} دقيقة`}
          </span>
        )}
        {place.bestMonths.length > 0 && (
          <span className="px-2 py-0.5 rounded-lg bg-muted/20 border border-border/40 text-micro font-semibold text-foreground tabular-nums">
            📅 أفضل أشهر: {[...place.bestMonths].sort((a, b) => a - b).join('، ')}
          </span>
        )}
        {place.coordinates && (
          <span className="px-2 py-0.5 rounded-lg bg-muted/20 border border-border/40 text-micro font-semibold text-muted-foreground tabular-nums" dir="ltr">
            {place.coordinates.lat.toFixed(3)}, {place.coordinates.lng.toFixed(3)}
          </span>
        )}
      </div>

      {place.sources.length > 0 && (
        <p className="text-micro text-muted-foreground/70">المصادر: {place.sources.join(' · ')}</p>
      )}
    </motion.article>
  );
}

/* ── City brief — the editorial opening chapter (v3) ────────────────────── */

function BriefSection({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-micro font-bold uppercase tracking-[0.12em] text-primary/80">{label}</span>
      <p className="text-micro leading-relaxed text-foreground/85">{text}</p>
    </div>
  );
}

function CityBriefCard({ brief, cityName }: { brief: TargetBrief; cityName: string }) {
  const photo = usePlacePhoto(`${cityName} city skyline`);
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="surface-depth rounded-2xl p-4 space-y-3 relative overflow-hidden"
    >
      {!photo.url || (
        <figure className="relative -mx-4 -mt-4 mb-1 h-40 overflow-hidden">
          <img
            src={photo.url}
            alt={cityName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <figcaption className="absolute bottom-2 start-4 text-body font-extrabold text-foreground drop-shadow">
            {cityName}
          </figcaption>
        </figure>
      )}

      <p className="text-mini leading-relaxed text-foreground/95">{brief.introAr}</p>

      {brief.characterAr && <BriefSection label="شخصية المدينة" text={brief.characterAr} />}
      {brief.foodSceneAr && <BriefSection label="مشهد الطعام" text={brief.foodSceneAr} />}
      {brief.natureEscapeAr && <BriefSection label="هروب الطبيعة" text={brief.natureEscapeAr} />}
      {brief.practicalAr && <BriefSection label="معلومات عملية" text={brief.practicalAr} />}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {brief.whenToGo && (
          <span className="px-2 py-0.5 rounded-lg bg-muted/20 border border-border/40 text-micro font-semibold text-foreground">
            📅 {brief.whenToGo}
          </span>
        )}
        {brief.bestMonths.length > 0 && (
          <span className="px-2 py-0.5 rounded-lg bg-muted/20 border border-border/40 text-micro font-semibold text-foreground tabular-nums">
            أفضل الأشهر: {[...brief.bestMonths].sort((a, b) => a - b).join('، ')}
          </span>
        )}
      </div>

      {brief.sources.length > 0 && (
        <p className="text-micro text-muted-foreground/70">المصادر: {brief.sources.join(' · ')}</p>
      )}
    </motion.article>
  );
}

/* ── The tab ─────────────────────────────────────────────────────────────── */

export interface AtlasScoutTabProps {
  /** Promotes a dossier into the real atlas; resolves to the new place id. */
  onPromoteToAtlas: (place: ScoutPlace) => Promise<string>;
}

export default function AtlasScoutTab({ onPromoteToAtlas }: AtlasScoutTabProps) {
  const [targets, setTargets] = useState<WatchTarget[]>([]);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [places, setPlaces] = useState<ScoutPlace[]>([]);
  const [brief, setBrief] = useState<TargetBrief | null>(null);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [adding, setAdding] = useState(false);
  const [scouting, setScouting] = useState(false);
  const [depth, setDepth] = useState<ScoutDepth>('deep');
  const [progress, setProgress] = useState<{ msg: string; pct: number } | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeTarget = targets.find((t) => t.id === activeTargetId) ?? null;

  /* Load targets once */
  useEffect(() => {
    let alive = true;
    atlasScoutApi
      .listTargets()
      .then((t) => {
        if (!alive) return;
        setTargets(t);
        if (t.length > 0) setActiveTargetId((prev) => prev ?? t[0].id);
      })
      .catch(() => toast.error('تعذر تحميل المفضلات'))
      .finally(() => alive && setLoadingTargets(false));
    return () => {
      alive = false;
    };
  }, []);

  /* Load places + the city brief when the active target changes */
  const reloadPlaces = useCallback(async (targetId: string) => {
    setLoadingPlaces(true);
    try {
      setPlaces(await atlasScoutApi.listPlaces(targetId));
    } catch {
      toast.error('تعذر تحميل نتائج الاستكشاف');
    } finally {
      setLoadingPlaces(false);
    }
  }, []);

  const reloadBrief = useCallback(async (targetId: string) => {
    try {
      setBrief(await atlasScoutApi.listBrief(targetId));
    } catch {
      setBrief(null);
    }
  }, []);

  useEffect(() => {
    if (!activeTargetId) return;
    const timer = setTimeout(() => void reloadPlaces(activeTargetId), 0);
    return () => clearTimeout(timer);
  }, [activeTargetId, reloadPlaces]);

  useEffect(() => {
    if (!activeTargetId) return;
    void reloadBrief(activeTargetId);
  }, [activeTargetId, reloadBrief]);

  /* Abort any in-flight stream when leaving the tab */
  useEffect(() => () => abortRef.current?.abort(), []);

  /* Add a target — v3: the deep campaign starts ITSELF in the background.
   * No second button: choosing a favourite city IS the command to research
   * it. The launch is fire-and-forget; the edge function finalises the run
   * and writes every dossier even if the user closes the tab right after. */
  const handleAdd = async (input: PickedTargetInput) => {
    setAdding(true);
    try {
      const { target, revived } = await atlasScoutApi.addTarget(input);

      // Optimistic badge so the log shows motion immediately.
      const withStatus = { ...target, lastRunStatus: 'running' as const };
      setTargets((prev) => [withStatus, ...prev.filter((x) => x.id !== target.id)]);
      setActiveTargetId(target.id);
      toast.success(revived ? `عاد «${target.displayNameAr}» إلى مفضلتك` : `أُضيف «${target.displayNameAr}» — انطلق البحث العميق في الخلفية`);

      void atlasScoutApi.runAutoScout(target).then((launched) => {
        if (!launched) {
          toast.error('تعذر إطلاق البحث الآلي — اضغط «ابحث بعمق» لاحقاً');
          setTargets((prev) =>
            prev.map((x) => (x.id === target.id ? { ...x, lastRunStatus: 'failed' as const } : x)),
          );
        }
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  /* Run the scout pipeline — cancellable, honest at the end */
  const runScout = async () => {
    if (!activeTarget || scouting) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setScouting(true);
    setProgress({ msg: 'نجهّز مهمة البحث…', pct: 5 });
    let outcome: ScoutOutcome | null = null;

    try {
      await atlasScoutApi.scout(activeTarget, depth, (e: ScoutProgressEvent) => {
        if (e.stage === 'geocode') setProgress({ msg: e.message, pct: 12 });
        else if (e.stage === 'discover') setProgress({ msg: e.message, pct: 22 });
        else if (e.stage === 'dedup') setProgress({ msg: e.message, pct: 32 });
        else if (e.stage === 'progress') {
          const pct = 32 + Math.round((e.current / Math.max(1, e.total)) * 63);
          setProgress({ msg: `(${e.current}/${e.total}) ${e.message}`, pct });
        } else if (e.stage === 'done') {
          outcome = { filed: e.filed, total: e.total, failed: e.failed, duplicates: e.duplicates };
        }
      }, controller.signal);

      setProgress({ msg: 'اكتمل!', pct: 100 });
      await reloadPlaces(activeTarget.id);

      if (outcome) {
        const d = describeOutcome(outcome);
        if (d.tone === 'success') toast.success(d.text);
        else toast.info(d.text);
      } else {
        toast.success('اكتمل الاستكشاف الذكي');
      }
    } catch (e) {
      const err = e as Error;
      if (err.name === 'AbortError') toast.info('أُلغي البحث — ما دوّنه المحرك قبل الإلغاء محفوظ');
      else toast.error(err.message);
    } finally {
      setScouting(false);
      setTimeout(() => setProgress(null), 1500);
    }
  };

  const cancelScout = () => {
    abortRef.current?.abort();
  };

  /* Promote / dismiss */
  const handlePromote = async (p: ScoutPlace) => {
    setPromotingId(p.id);
    try {
      const placeId = await onPromoteToAtlas(p);
      setPlaces((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, promotedPlaceId: placeId } : x))
      );
      toast.success(`حُفظ «${p.nameAr || p.nameEn}» في أطلسك`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPromotingId(null);
    }
  };

  const handleDismiss = async (p: ScoutPlace) => {
    setPlaces((prev) => prev.filter((x) => x.id !== p.id));
    try {
      await atlasScoutApi.dismissPlace(p.id);
    } catch {
      toast.error('تعذر الإخفاء');
    }
  };

  const removeTarget = async (t: WatchTarget) => {
    try {
      await atlasScoutApi.removeTarget(t.id);
      setTargets((prev) => prev.filter((x) => x.id !== t.id));
      if (activeTargetId === t.id) {
        setActiveTargetId(targets.find((x) => x.id !== t.id)?.id ?? null);
      }
    } catch {
      toast.error('تعذر الحذف');
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]" dir="rtl">
      {/* ── Rail: favorites + controls ── */}
      <aside className="space-y-4">
        <section className="surface-depth rounded-2xl p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-meta font-bold text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            أماكني المفضلة
          </h2>
          {loadingTargets ? (
            <div className="py-6 grid place-items-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : targets.length === 0 ? (
            <p className="text-micro text-muted-foreground leading-relaxed">
              أضف مدينة أو دولة تحبها، وسيبحث محرك الذكاء الاصطناعي بعمق عن أجمل مطاعمها وحدائقها ومغامراتها ويدوّن كل شيء هنا.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {targets.map((t) => (
                <li key={t.id}>
                  <div
                    className={cn(
                      'group flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer',
                      t.id === activeTargetId
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-muted/20 border-border/40 hover:border-border'
                    )}
                    onClick={() => setActiveTargetId(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setActiveTargetId(t.id)}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="block text-mini font-bold text-foreground truncate">
                          {t.displayNameAr}
                        </span>
                        {t.lastRunStatus === 'running' && (
                          <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                        )}
                        {t.lastRunStatus === 'done' && (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                        {(t.lastRunStatus === 'failed' || t.lastRunStatus === 'empty') && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-400/80 shrink-0"
                            title={t.lastRunStatus === 'failed' ? 'فشل آخر بحث' : 'آخر بحث بلا نتائج جديدة'}
                          />
                        )}
                      </span>
                      <span className="block text-micro text-muted-foreground">
                        {t.kind === 'city' ? '🏙️ مدينة' : '🌍 دولة'}
                      </span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeTarget(t);
                      }}
                      aria-label={`حذف ${t.displayNameAr}`}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="pt-1 border-t border-border/30">
            <TargetPicker busy={adding} onAdd={(inp) => void handleAdd(inp)} />
          </div>
        </section>

        {/* Scout runner */}
        <section className="surface-depth rounded-2xl p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-meta font-bold text-foreground">
            <Compass className="w-4 h-4 text-primary" />
            محرك البحث العميق
          </h2>

          <div className="flex gap-1.5" role="radiogroup" aria-label="عمق البحث">
            {(
              [
                { id: 'standard' as const, label: 'سريع' },
                { id: 'deep' as const, label: 'عميق' },
                { id: 'deepest' as const, label: 'أقصى' },
              ]
            ).map((d) => (
              <button
                key={d.id}
                role="radio"
                aria-checked={depth === d.id}
                onClick={() => setDepth(d.id)}
                disabled={scouting}
                className={cn(
                  'flex-1 py-1.5 rounded-xl text-micro font-bold transition-all active:scale-95 disabled:opacity-50',
                  depth === d.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/20 border border-border/50 text-muted-foreground hover:text-foreground'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          {scouting ? (
            <Button
              onClick={cancelScout}
              variant="outline"
              className="w-full gap-2 rounded-xl font-bold border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <X className="w-4 h-4" />
              إلغاء البحث
            </Button>
          ) : (
            <Button
              onClick={() => void runScout()}
              disabled={!activeTarget}
              className="w-full gap-2 rounded-xl font-extrabold"
            >
              <Compass className="w-4 h-4" />
              ابحث بعمق عن أماكن جديدة
            </Button>
          )}

          {!activeTarget && !loadingTargets && (
            <p className="text-micro text-muted-foreground text-center">اختر مكاناً مفضلاً أولاً</p>
          )}

          <AnimatePresence>
            {progress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden" dir="ltr">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-primary to-cyan-400 transition-[width] duration-500"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
                <p className="text-micro text-muted-foreground leading-relaxed">{progress.msg}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </aside>

      {/* ── Main: brief + dossiers ── */}
      <main className="min-w-0 space-y-4">
        {activeTarget && (
          <header className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-mini font-semibold text-foreground">{activeTarget.displayNameAr}</span>
            {places.length > 0 && (
              <span className="text-micro tabular-nums">
                {places.filter((p) => p.promotedPlaceId).length}/{places.length} محفوظة في الأطلس
              </span>
            )}
          </header>
        )}

        {/* The editorial opening chapter — above the dossiers, like any
            real guidebook. Appears once the auto-campaign writes it. */}
        {brief && activeTarget && (
          <CityBriefCard brief={brief} cityName={activeTarget.displayNameAr} />
        )}

        {loadingPlaces ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !activeTarget ? (
          <div className="py-16 text-center space-y-2 surface-depth rounded-2xl">
            <Compass className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-meta font-semibold text-foreground">ابدأ بإضافة مكان مفضل</p>
            <p className="text-mini text-muted-foreground max-w-sm mx-auto leading-relaxed">
              اختر مدينة تحبها أو حلمت بزيارتها، ودع المحرك يقلّب أرجاءها ويؤلف لك دليلاً شخصياً كامل الأركان.
            </p>
          </div>
        ) : places.length === 0 ? (
          <div className="py-16 text-center space-y-2 surface-depth rounded-2xl">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-meta font-semibold text-foreground">لا نتائج بعد لهذا المكان</p>
            <p className="text-mini text-muted-foreground">شغّل محرك البحث العميق من اللوحة الجانبية</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {places.map((p, i) => (
              <DossierCard
                key={p.id}
                place={p}
                index={i}
                onPromote={handlePromote}
                onDismiss={handleDismiss}
                promoting={promotingId === p.id}
              />
            ))}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
