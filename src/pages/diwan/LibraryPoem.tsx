import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ScrollText, ClipboardCopy, Feather, ChevronLeft, ChevronRight,
  ExternalLink, Sparkles, Heart,
} from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { notify } from '@/lib/notify';
import {
  useDiwanGlossary,
  useDiwanPoem,
  useDiwanFavoriteIds,
  useDiwanToggleFavorite,
} from '@/lib/diwan/hooks';
import { isSupabaseReady } from '@/lib/diwan/env';
import { useAuth } from '@/hooks/useAuth';
import PoemContextCard from '@/components/diwan/PoemContextCard';
import SimilarPoems from '@/components/diwan/library/SimilarPoems';
import VerseLine from '@/components/diwan/library/VerseLine';
import GlossarySheet from '@/components/diwan/library/GlossarySheet';
import FallbackBadge from '@/components/diwan/library/FallbackBadge';
import type { DiwanGlossaryEntry, DiwanVerse } from '@/lib/diwan/types';

// ─── أدوات تطبيع عربية مشتركة بين الصفحة و VerseLine ─────────────────
// المهم: نُعرّف نسخة بـ /g للاستبدال، ونسخة بدون /g للتفحّص. الـ /g
// في RegExp يجعل `.test()` stateful (يحفظ lastIndex) وقد يُرجع false
// خاطئاً عند الاستدعاء التالي على سلسلة أخرى.
const TASHKEEL_REPLACE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const TASHKEEL_HAS     = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

function normalizeArabic(s: string): string {
  return (s ?? '')
    .replace(TASHKEEL_REPLACE, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}

// نزيل التشكيل من نص قائم — نُستخدم حين تكون النسخة المُشكَّلة الوحيدة
// المتاحة وأراد المستخدم العرض «بلا تشكيل».
function stripDiacritics(s: string): string {
  return s.replace(TASHKEEL_REPLACE, '');
}

/**
 * صفحة قصيدة كاملة. تعرض الأبيات بصدر/عجز مع:
 *   • زر تبديل التشكيل (يظهر عند توفّر نسخة مشكَّلة).
 *   • Long-press على كلمة → معجم الشرح في bottom-sheet.
 *   • نسخ بيت / نسخ القصيدة كاملةً.
 *   • السياق التاريخي للقصيدة إن وُجد.
 *   • قصائد مشابهة أسفل الصفحة.
 */
export default function LibraryPoemPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { dir } = useApp();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const poem     = useDiwanPoem(slug);
  const glossary = useDiwanGlossary(slug);

  // المفضّلة — متاحة فقط حين يكون Supabase مهيّئاً
  const sbReady     = isSupabaseReady();
  const { user }    = useAuth();
  const favIds      = useDiwanFavoriteIds();
  const toggleFav   = useDiwanToggleFavorite();
  const isFavorited = !!(poem.data && favIds.data?.has(poem.data.id));

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [tashkeel,  setTashkeel]  = useState(false);

  // glossary lookup
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [sheetWord,    setSheetWord]    = useState<string | null>(null);
  const [sheetVerseTx, setSheetVerseTx] = useState<string | undefined>();
  const [sheetEntries, setSheetEntries] = useState<DiwanGlossaryEntry[]>([]);

  // فهرس المعجم: word_normalized → list of entries
  const glossaryIdx = useMemo(() => {
    const m = new Map<string, DiwanGlossaryEntry[]>();
    for (const g of glossary.data ?? []) {
      const arr = m.get(g.word_normalized) ?? [];
      arr.push(g);
      m.set(g.word_normalized, arr);
    }
    return m;
  }, [glossary.data]);

  // مفاتيح موجودة في المعجم — تُمرّر إلى VerseLine لتظليل الكلمات.
  const glossaryKeys = useMemo(() => new Set(glossaryIdx.keys()), [glossaryIdx]);

  // هل تتوفر نسخة مُشكَّلة على أيّ بيت؟ نُظهر زرّ التشكيل بناءً على ذلك.
  const hasDiacriticData = useMemo(() => {
    const verses = poem.data?.verses ?? [];
    return verses.some(v =>
      (v.hemistich1_diacritized && v.hemistich1_diacritized.trim().length > 0) ||
      (v.hemistich2_diacritized && v.hemistich2_diacritized.trim().length > 0)
    );
  }, [poem.data]);

  // هل النصّ الأصلي مُشكَّل بالفعل؟ (يحدث في بعض المصادر) — لو نعم
  // فالزر يقلب بين «مع» و«بدون» بإزالة التشكيل برمجياً.
  const originalHasTashkeel = useMemo(() => {
    const verses = poem.data?.verses ?? [];
    return verses.some(v => TASHKEEL_HAS.test(v.hemistich1) || TASHKEEL_HAS.test(v.hemistich2 ?? ''));
  }, [poem.data]);

  const showTashkeelBtn = hasDiacriticData || originalHasTashkeel;

  // نُحضّر الأبيات للعرض بحسب حالة التشكيل
  const displayVerses: DiwanVerse[] = useMemo(() => {
    const verses = poem.data?.verses ?? [];
    return verses.map(v => {
      // قاعدة:
      //   tashkeel=true  → استخدم الـ diacritized إن وُجد، وإلا الأصلي.
      //   tashkeel=false → جرّد التشكيل من الأصلي (يفيد لو الأصل مشكَّل).
      const useDia = tashkeel;
      return {
        ...v,
        hemistich1: useDia
          ? (v.hemistich1_diacritized?.trim() || v.hemistich1)
          : (originalHasTashkeel ? stripDiacritics(v.hemistich1) : v.hemistich1),
        hemistich2: useDia
          ? (v.hemistich2_diacritized?.trim() || v.hemistich2)
          : (originalHasTashkeel
              ? (v.hemistich2 ? stripDiacritics(v.hemistich2) : null)
              : v.hemistich2),
        // نمرّر التشكيل الأصلي كذلك حتى يستطيع VerseLine اختياره مباشرةً
        hemistich1_diacritized: v.hemistich1_diacritized,
        hemistich2_diacritized: v.hemistich2_diacritized,
      };
    });
  }, [poem.data, tashkeel, originalHasTashkeel]);

  if (poem.isLoading) {
    return (
      <div className="min-h-screen bg-background pt-14 px-5">
        <div className="skeleton h-10 w-40 mb-4" />
        <div className="space-y-2">
          {[0,1,2,3,4].map(i => <div key={i} className="skeleton h-8 w-full" />)}
        </div>
      </div>
    );
  }

  if (!poem.data) {
    return (
      <div className="min-h-screen bg-background pt-14 px-5 text-center">
        <BackButton fallback="/mihrab" />
        <p className="text-muted-foreground mt-8">لم يُعثر على هذه القصيدة.</p>
      </div>
    );
  }

  const p = poem.data;

  const copyVerse = (verse: DiwanVerse) => {
    const text = verse.hemistich2
      ? `${verse.hemistich1}    ${verse.hemistich2}`
      : verse.hemistich1;
    navigator.clipboard.writeText(text);
    setCopiedIdx(verse.position);
    notify.copied();
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    const text = `${p.title}\n${p.poet_name}${p.era_name ? ' — ' + p.era_name : ''}\n\n` +
      displayVerses.map(v =>
        v.hemistich2 ? `${v.hemistich1}    ${v.hemistich2}` : v.hemistich1
      ).join('\n');
    navigator.clipboard.writeText(text);
    notify.copied();
  };

  const lookupWord = (word: string, verse: DiwanVerse) => {
    const key = normalizeArabic(word);
    const entries = key ? (glossaryIdx.get(key) ?? []) : [];
    setSheetWord(word || null);
    setSheetEntries(entries);
    setSheetVerseTx(
      verse.hemistich2
        ? `${verse.hemistich1}   ·   ${verse.hemistich2}`
        : verse.hemistich1,
    );
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO
        title={`${p.title} — ${p.poet_name}`}
        description={p.opening ?? ''}
        path={`/diwan/library/poem/${p.slug}`}
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <BackButton fallback="/mihrab" />
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-bold tracking-tight text-foreground line-clamp-1 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-primary shrink-0" />
              {p.title}
            </h1>
            <Link
              to={`/diwan/library/poet/${p.poet_slug}`}
              className="text-[11px] text-primary hover:underline mt-0.5 flex items-center gap-1"
            >
              <Feather className="w-3 h-3" />
              {p.poet_name}
              {p.era_name && <span className="text-muted-foreground">— {p.era_name}</span>}
              <Chevron className="w-3 h-3 opacity-60" />
            </Link>
          </div>
          {sbReady && (
            <button
              onClick={() => {
                if (!user) {
                  navigate('/auth');
                  return;
                }
                if (!toggleFav.isPending) toggleFav.mutate(p.id);
              }}
              disabled={toggleFav.isPending}
              aria-pressed={isFavorited}
              aria-label={isFavorited ? 'إزالة من المفضّلة' : 'إضافة إلى المفضّلة'}
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isFavorited
                  ? 'bg-rose-500/15 text-rose-500'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              } disabled:opacity-60`}
            >
              <Heart
                className="w-4 h-4"
                fill={isFavorited ? 'currentColor' : 'none'}
                strokeWidth={isFavorited ? 0 : 2}
              />
            </button>
          )}
        </div>

        {/* Fallback indicator (لطيف وغير مزعج) */}
        <div className="mb-2 flex">
          <FallbackBadge />
        </div>

        {/* Meta tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {p.kind && (
            <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {p.kind}
            </span>
          )}
          {p.meter && (
            <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400">
              البحر: {p.meter}
            </span>
          )}
          {p.rhyme && (
            <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              قافية: {p.rhyme}
            </span>
          )}
          <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground">
            {displayVerses.length} {displayVerses.length === 1 ? 'بيت' : 'أبيات'}
          </span>
          <button
            onClick={copyAll}
            className="ms-auto flex items-center gap-1 text-[11px] text-primary font-medium px-2.5 py-1 rounded-lg bg-primary/10 active:bg-primary/20 transition-colors"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            نسخ الكل
          </button>
        </div>

        {/* Reading controls — يظهر فقط لو ثمة قيمة من التبديل */}
        {(showTashkeelBtn || glossaryKeys.size > 0) && (
          <div className="flex items-center gap-2 mb-3 px-1">
            {showTashkeelBtn && (
              <button
                onClick={() => setTashkeel(t => !t)}
                aria-pressed={tashkeel}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition border ${
                  tashkeel
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <span style={{ fontFamily: "'Amiri', serif" }}>
                  {tashkeel ? 'بَلا تَشْكِيل' : 'بِالتَّشْكِيلِ'}
                </span>
              </button>
            )}
            {glossaryKeys.size > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary" />
                {glossaryKeys.size} {glossaryKeys.size === 1 ? 'مفردة مشروحة' : 'مفردات مشروحة'} — اضغط مطوّلاً
              </span>
            )}
          </div>
        )}

        {/* Historical context if available */}
        <PoemContextCard poemTitle={p.title} poetId={p.poet_slug} />

        {/* Verses */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.02 } } }}
          className="rounded-3xl bg-card border border-border/40 p-3 sm:p-5"
        >
          {displayVerses.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-[13px]">
              لا توجد أبيات محفوظة لهذه القصيدة بعد.
            </p>
          ) : (
            <div className="space-y-1">
              {displayVerses.map((v) => (
                <VerseLine
                  key={v.position}
                  verse={v}
                  normalize={normalizeArabic}
                  glossaryHas={glossaryKeys}
                  copied={copiedIdx === v.position}
                  onCopy={copyVerse}
                  onLookup={lookupWord}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Source link */}
        {p.source_url && (
          <a
            href={p.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition"
          >
            <ExternalLink className="w-3 h-3" />
            المصدر الأصلي
          </a>
        )}

        {/* Similar poems */}
        <SimilarPoems slug={p.slug} />
      </div>

      {/* Glossary bottom-sheet */}
      <GlossarySheet
        open={sheetOpen}
        word={sheetWord}
        entries={sheetEntries}
        versePreview={sheetVerseTx}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
