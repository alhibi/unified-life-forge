import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import GlossarySheet from '@/features/diwan/components/library/GlossarySheet';
import SimilarPoems from '@/features/diwan/components/library/SimilarPoems';
import VerseLine from '@/features/diwan/components/library/VerseLine';
import PoemContextCard, { hasPoemContext } from '@/features/diwan/components/PoemContextCard';
import { poemContexts } from '@/features/diwan/data/poetTimelines';
import { isSupabaseReady } from '@/features/diwan/lib/env';
import {
  useDiwanFavoriteIds,
  useDiwanGlossary,
  useDiwanPoem,
  useDiwanToggleFavorite,
} from '@/features/diwan/lib/hooks';
import type { DiwanGlossaryEntry, DiwanVerse } from '@/features/diwan/lib/types';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  Feather,
  Heart,
  Loader2,
  Sparkles,
} from '@/lib/icons';
import { notify } from '@/lib/notify';

// أدوات تطبيع عربية
const TASHKEEL_REPLACE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const TASHKEEL_HAS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

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

  const poem = useDiwanPoem(slug);
  const glossary = useDiwanGlossary(slug);

  // المفضّلة
  const sbReady = isSupabaseReady();
  const { user } = useAuth();
  const favIds = useDiwanFavoriteIds();
  const toggleFav = useDiwanToggleFavorite();
  const isFavorited = !!(poem.data && favIds.data?.has(poem.data.id));

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [tashkeel, setTashkeel] = useState(true); // تفعيل التشكيل افتراضياً لو وجد
  const [showContext, setShowContext] = useState(true); // مفتاح إظهار السياق التاريخي

  // glossary lookup
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetWord, setSheetWord] = useState<string | null>(null);
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
    return verses.some(
      (v) =>
        (v.hemistich1_diacritized && v.hemistich1_diacritized.trim().length > 0) ||
        (v.hemistich2_diacritized && v.hemistich2_diacritized.trim().length > 0),
    );
  }, [poem.data]);

  const originalHasTashkeel = useMemo(() => {
    const verses = poem.data?.verses ?? [];
    return verses.some(
      (v) => TASHKEEL_HAS.test(v.hemistich1) || TASHKEEL_HAS.test(v.hemistich2 ?? ''),
    );
  }, [poem.data]);

  const showTashkeelBtn = hasDiacriticData || originalHasTashkeel;

  // تحضير الأبيات للعرض
  const displayVerses: DiwanVerse[] = useMemo(() => {
    const verses = poem.data?.verses ?? [];
    return verses.map((v) => {
      const useDia = tashkeel;
      return {
        ...v,
        hemistich1: useDia
          ? v.hemistich1_diacritized?.trim() || v.hemistich1
          : originalHasTashkeel
            ? stripDiacritics(v.hemistich1)
            : v.hemistich1,
        hemistich2: useDia
          ? v.hemistich2_diacritized?.trim() || v.hemistich2
          : originalHasTashkeel
            ? v.hemistich2
              ? stripDiacritics(v.hemistich2)
              : null
            : v.hemistich2,
        hemistich1_diacritized: v.hemistich1_diacritized,
        hemistich2_diacritized: v.hemistich2_diacritized,
      };
    });
  }, [poem.data, tashkeel, originalHasTashkeel]);

  // جلب سنة النظم التقريبية إن وجدت
  const approxYear = useMemo(() => {
    if (!poem.data) return null;
    const ctx = poemContexts.find(
      (c) => c.poemTitle === poem.data?.title && c.poetId === poem.data?.poet_slug,
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
      <div className="min-h-screen bg-background pt-14 px-5 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-mini text-muted-foreground/70 font-tajawal">
          جاري فتح رقوق القصيدة وفض أختامها…
        </p>
      </div>
    );
  }

  if (!poem.data) {
    return (
      <div className="min-h-screen bg-background pt-14 px-5 text-center">
        <BackButton fallback="/mihrab" />
        <p className="text-muted-foreground mt-8 font-tajawal">
          لم يُعثر على هذه القصيدة في الدواوين المحفوظة.
        </p>
      </div>
    );
  }

  const p = poem.data;

  const copyVerse = (verse: DiwanVerse) => {
    const text = verse.hemistich2 ? `${verse.hemistich1}    ${verse.hemistich2}` : verse.hemistich1;
    navigator.clipboard.writeText(text);
    setCopiedIdx(verse.position);
    notify.copied();
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    const text =
      `${p.title}\n${p.poet_name}${p.era_name ? ' — ' + p.era_name : ''}\n\n` +
      displayVerses
        .map((v) => (v.hemistich2 ? `${v.hemistich1}    ${v.hemistich2}` : v.hemistich1))
        .join('\n');
    navigator.clipboard.writeText(text);
    notify.copied();
  };

  const lookupWord = (word: string, verse: DiwanVerse) => {
    const key = normalizeArabic(word);
    const entries = key ? (glossaryIdx.get(key) ?? []) : [];
    setSheetWord(word || null);
    setSheetEntries(entries);
    setSheetVerseTx(
      verse.hemistich2 ? `${verse.hemistich1}   ·   ${verse.hemistich2}` : verse.hemistich1,
    );
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-page px-5 pt-14 font-tajawal selection:bg-primary/20 selection:text-foreground">
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
            <BackButton
              fallback="/mihrab"
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground active:scale-95 transition-motion"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-display font-bold text-foreground font-amiri leading-tight">
              {p.title}
            </h1>
            <Link
              to={`/diwan/library/poet/${p.poet_slug}`}
              className="text-mini text-muted-foreground hover:text-primary mt-1.5 flex items-center gap-1 font-tajawal select-none"
            >
              <Feather className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{p.poet_name}</span>
              {p.era_name && <span className="text-muted-foreground/70">— {p.era_name}</span>}
              <Chevron className="w-3 h-3 text-muted-foreground/70 shrink-0" />
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
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-motion active:scale-90 border ${
                isFavorited
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
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
            <span className="px-2.5 py-1 rounded-[5px] text-micro font-medium border border-border text-muted-foreground font-tajawal">
              {p.kind}
            </span>
          )}
          {p.meter && (
            <span className="px-2.5 py-1 rounded-[5px] text-micro font-medium border border-border text-muted-foreground font-tajawal">
              البحر: {p.meter}
            </span>
          )}
          {p.rhyme && (
            <span className="px-2.5 py-1 rounded-[5px] text-micro font-medium border border-border text-muted-foreground font-tajawal">
              القافية: {p.rhyme}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-[5px] text-micro font-medium border border-border text-muted-foreground font-tajawal">
            {displayVerses.length} {displayVerses.length === 1 ? 'بيت' : 'أبيات'}
          </span>
          {approxYear && (
            <span className="px-2.5 py-1 rounded-[5px] text-micro font-medium border border-border text-muted-foreground/70 font-tajawal select-none">
              سنة النظم: {approxYear}
            </span>
          )}
          <button
            onClick={copyAll}
            className="ms-auto flex items-center gap-1.5 text-micro text-primary font-bold px-3 py-1.5 rounded-[8px] bg-primary/10 border border-primary/30 active:scale-95 transition-motion font-tajawal"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            نسخ المخطوطة
          </button>
        </div>

        {/* Toggle Pills (بالتشكيل / السياق التاريخي) */}
        <div className="flex flex-wrap items-center gap-2 mb-6 px-1 select-none">
          {showTashkeelBtn && (
            <button
              onClick={() => setTashkeel((t) => !t)}
              aria-pressed={tashkeel}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-mini font-bold transition-motion border ${
                tashkeel
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-transparent text-muted-foreground/70 border-border hover:text-muted-foreground'
              }`}
            >
              <span style={{ fontFamily: 'var(--font-amiri)' }}>
                {tashkeel ? 'بَلا تَشْكِيل' : 'بِالتَّشْكِيلِ'}
              </span>
            </button>
          )}

          {hasContext && (
            <button
              onClick={() => setShowContext((c) => !c)}
              aria-pressed={showContext}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-mini font-bold transition-motion border ${
                showContext
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-transparent text-muted-foreground/70 border-border hover:text-muted-foreground'
              }`}
            >
              <span className="font-tajawal">السياق التاريخي</span>
            </button>
          )}

          {glossaryKeys.size > 0 && (
            <span className="flex items-center gap-1 text-micro text-muted-foreground/70 font-tajawal ms-auto select-none">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{glossaryKeys.size} مفردات مشروحة · اضغط مطولاً</span>
            </span>
          )}
        </div>

        {/* Historical Context Card */}
        {showContext && <PoemContextCard poemTitle={p.title} poetId={p.poet_slug} />}

        {/* Verses Paper (المخطوطة) */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.02 } } }}
          className="rounded-[14px] bg-card border border-border p-4 sm:p-6 mb-6"
        >
          {displayVerses.length === 0 ? (
            <p className="text-center text-muted-foreground/70 py-8 text-mini font-tajawal">
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
            className="mt-6 mb-8 flex items-center justify-center gap-1.5 text-micro text-muted-foreground/70 hover:text-muted-foreground transition-colors font-tajawal select-none"
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
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
