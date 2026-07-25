import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardCopy, Feather, ChevronLeft, ChevronRight,
  ExternalLink, Sparkles, Heart, Loader2,
} from '@/lib/icons';
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
} from '@/features/diwan/lib/hooks';
import { isSupabaseReady } from '@/features/diwan/lib/env';
import { useAuth } from '@/hooks/useAuth';
import PoemContextCard, { hasPoemContext } from '@/features/diwan/components/PoemContextCard';
import { poemContexts } from '@/features/diwan/data/poetTimelines';
import SimilarPoems from '@/features/diwan/components/library/SimilarPoems';
import VerseLine from '@/features/diwan/components/library/VerseLine';
import GlossarySheet from '@/features/diwan/components/library/GlossarySheet';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import type { DiwanGlossaryEntry, DiwanVerse } from '@/features/diwan/lib/types';

// أدوات تطبيع عربية
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

function stripDiacritics(s: string): string {
  return s.replace(TASHKEEL_REPLACE, '');
}

/**
 * صفحة قراءة القصيدة الكبرى — مصممة بنمط صفحة من مخطوطة (Manuscript).
 * تتميز بخلفية حبر دافئة عتيقة، وتوزيع الأبيات المقسمة على ثنية الورق،
 * ومفاتيح التحكم الفاخرة (التشكيل، السياق التاريخي)، وحرف الروي الملون ببريق الختم.
 */
export default function LibraryPoemPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { dir } = useApp();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const poem     = useDiwanPoem(slug);
  const glossary = useDiwanGlossary(slug);

  // المفضّلة
  const sbReady     = isSupabaseReady();
  const { user }    = useAuth();
  const favIds      = useDiwanFavoriteIds();
  const toggleFav   = useDiwanToggleFavorite();
  const isFavorited = !!(poem.data && favIds.data?.has(poem.data.id));

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [tashkeel,  setTashkeel]  = useState(true); // تفعيل التشكيل افتراضياً لو وجد
  const [showContext, setShowContext] = useState(true); // مفتاح إظهار السياق التاريخي

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

  const glossaryKeys = useMemo(() => new Set(glossaryIdx.keys()), [glossaryIdx]);

  // توفر التشكيل
  const hasDiacriticData = useMemo(() => {
    const verses = poem.data?.verses ?? [];
    return verses.some(v =>
      (v.hemistich1_diacritized && v.hemistich1_diacritized.trim().length > 0) ||
      (v.hemistich2_diacritized && v.hemistich2_diacritized.trim().length > 0)
    );
  }, [poem.data]);

  const originalHasTashkeel = useMemo(() => {
    const verses = poem.data?.verses ?? [];
    return verses.some(v => TASHKEEL_HAS.test(v.hemistich1) || TASHKEEL_HAS.test(v.hemistich2 ?? ''));
  }, [poem.data]);

  const showTashkeelBtn = hasDiacriticData || originalHasTashkeel;

  // تحضير الأبيات للعرض
  const displayVerses: DiwanVerse[] = useMemo(() => {
    const verses = poem.data?.verses ?? [];
    return verses.map(v => {
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
        hemistich1_diacritized: v.hemistich1_diacritized,
        hemistich2_diacritized: v.hemistich2_diacritized,
      };
    });
  }, [poem.data, tashkeel, originalHasTashkeel]);

  // جلب سنة النظم التقريبية إن وجدت
  const approxYear = useMemo(() => {
    if (!poem.data) return null;
    const ctx = poemContexts.find(
      c => c.poemTitle === poem.data?.title && c.poetId === poem.data?.poet_slug
    );
    return ctx?.year ?? null;
  }, [poem.data]);

  // معرفة هل هذه القصيدة لها سياق تاريخي بالفعل
  const hasContext = useMemo(() => {
    if (!poem.data) return false;
    return hasPoemContext(poem.data.title, poem.data.poet_slug);
  }, [poem.data]);

  if (poem.isLoading) {
    return (
      <div className="min-h-screen bg-[#16130F] pt-14 px-5 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--wax)] mb-2" />
        <p className="text-[13px] text-[#7E7259] font-tajawal">جاري فتح رقوق القصيدة وفض أختامها…</p>
      </div>
    );
  }

  if (!poem.data) {
    return (
      <div className="min-h-screen bg-[#16130F] pt-14 px-5 text-center">
        <BackButton fallback="/mihrab" />
        <p className="text-[#B8AA8E] mt-8 font-tajawal">لم يُعثر على هذه القصيدة في الدواوين المحفوظة.</p>
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
    <div className="min-h-screen bg-[#16130F] text-[#F2E9D8] pb-page px-5 pt-14 font-tajawal selection:bg-[var(--wax-soft2)] selection:text-[#F2E9D8]">
      <SEO
        title={`${p.title} — ${p.poet_name}`}
        description={p.opening ?? ''}
        path={`/diwan/library/poem/${p.slug}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          '@id': `https://amv.life/diwan/library/poem/${p.slug}`,
          url: `https://amv.life/diwan/library/poem/${p.slug}`,
          headline: p.title,
          name: p.title,
          author: { '@type': 'Person', name: p.poet_name },
          inLanguage: 'ar',
          genre: 'Poetry',
          ...(p.era_name ? { temporalCoverage: p.era_name } : {}),
          ...(p.opening ? { description: p.opening } : {}),
        }}
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="mt-1 shrink-0">
            <BackButton fallback="/mihrab" className="w-10 h-10 rounded-full border border-[var(--hairline-strong)] bg-[#1D1811] flex items-center justify-center text-[#B8AA8E] hover:text-[#F2E9D8] hover:border-[#B8AA8E] active:scale-95 transition-all" />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-[22px] font-bold text-[#F2E9D8] font-amiri leading-tight"
            >
              {p.title}
            </h1>
            <Link
              to={`/diwan/library/poet/${p.poet_slug}`}
              className="text-[12px] text-[#B8AA8E] hover:text-[var(--wax)] mt-1.5 flex items-center gap-1 font-tajawal select-none"
            >
              <Feather className="w-3.5 h-3.5 text-[var(--wax)] shrink-0" />
              <span>{p.poet_name}</span>
              {p.era_name && <span className="text-[#7E7259]">— {p.era_name}</span>}
              <Chevron className="w-3 h-3 text-[#7E7259] shrink-0" />
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
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 border ${
                isFavorited
                  ? 'bg-[rgba(184,73,46,0.1)] text-[var(--wax)] border-[var(--wax-soft2)]'
                  : 'border-[var(--hairline-strong)] bg-[#1D1811] text-[#B8AA8E] hover:text-[#F2E9D8]'
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

        <div className="mb-4 flex">
          <FallbackBadge />
        </div>

        {/* Meta tags with simple borders (No fill, transparent backgrounds) */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {p.kind && (
            <span className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium border border-[var(--hairline-strong)] text-[#B8AA8E] font-tajawal">
              {p.kind}
            </span>
          )}
          {p.meter && (
            <span className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium border border-[var(--hairline-strong)] text-[#B8AA8E] font-tajawal">
              البحر: {p.meter}
            </span>
          )}
          {p.rhyme && (
            <span className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium border border-[var(--hairline-strong)] text-[#B8AA8E] font-tajawal">
              القافية: {p.rhyme}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium border border-[var(--hairline-strong)] text-[#B8AA8E] font-tajawal">
            {displayVerses.length} {' '}
            {displayVerses.length === 1 ? 'بيت' : 'أبيات'}
          </span>
          {approxYear && (
            <span className="px-2.5 py-1 rounded-[5px] text-[11px] font-medium border border-[var(--hairline-strong)] text-[#7E7259] font-tajawal select-none">
              سنة النظم: {approxYear}
            </span>
          )}
          <button
            onClick={copyAll}
            className="ms-auto flex items-center gap-1.5 text-[11px] text-[var(--wax)] font-bold px-3 py-1.5 rounded-[8px] bg-[var(--wax-soft)] border border-[var(--wax-soft2)] active:scale-95 transition-all font-tajawal"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            نسخ المخطوطة
          </button>
        </div>

        {/* Toggle Pills (بالتشكيل / السياق التاريخي) */}
        <div className="flex flex-wrap items-center gap-2 mb-6 px-1 select-none">
          {showTashkeelBtn && (
            <button
              onClick={() => setTashkeel(t => !t)}
              aria-pressed={tashkeel}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all border ${
                tashkeel
                  ? 'bg-[var(--wax-soft)] text-[var(--wax)] border-[var(--wax-soft2)]'
                  : 'bg-transparent text-[#7E7259] border-[var(--hairline-strong)] hover:text-[#B8AA8E]'
              }`}
            >
              <span style={{ fontFamily: "'Amiri', serif" }}>
                {tashkeel ? 'بَلا تَشْكِيل' : 'بِالتَّشْكِيلِ'}
              </span>
            </button>
          )}

          {hasContext && (
            <button
              onClick={() => setShowContext(c => !c)}
              aria-pressed={showContext}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold transition-all border ${
                showContext
                  ? 'bg-[var(--wax-soft)] text-[var(--wax)] border-[var(--wax-soft2)]'
                  : 'bg-transparent text-[#7E7259] border-[var(--hairline-strong)] hover:text-[#B8AA8E]'
              }`}
            >
              <span className="font-tajawal">السياق التاريخي</span>
            </button>
          )}

          {glossaryKeys.size > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[#7E7259] font-tajawal ms-auto select-none">
              <Sparkles className="w-3.5 h-3.5 text-[var(--wax)]" />
              <span>{glossaryKeys.size} مفردات مشروحة · اضغط مطولاً</span>
            </span>
          )}
        </div>

        {/* Historical Context Card */}
        {showContext && (
          <PoemContextCard poemTitle={p.title} poetId={p.poet_slug} />
        )}

        {/* Verses Paper (المخطوطة) */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.02 } } }}
          className="rounded-[14px] bg-[#1E1912] border border-[var(--hairline-strong)] p-4 sm:p-6 mb-6"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
        >
          {displayVerses.length === 0 ? (
            <p className="text-center text-[#7E7259] py-8 text-[13px] font-tajawal">
              لا توجد أبيات محفوظة لهذه القصيدة بعد في رقوقنا.
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
            className="mt-6 mb-8 flex items-center justify-center gap-1.5 text-[11px] text-[#7E7259] hover:text-[#B8AA8E] transition-colors font-tajawal select-none"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--wax)]" />
            المصدر الأصلي للمخطوطة
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
