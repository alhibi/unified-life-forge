import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, IconButton, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import GlossarySheet from '@/features/diwan/components/library/GlossarySheet';
import SimilarPoems from '@/features/diwan/components/library/SimilarPoems';
import VerseLine from '@/features/diwan/components/library/VerseLine';
import PoemContextCard from '@/features/diwan/components/PoemContextCard';
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
import { ClipboardCopy, ExternalLink, Feather, Heart, Loader2, Sparkles } from '@/lib/icons';
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
 * صفحة قراءة القصيدة — الترويسة <PageHeader> القياسية (العنوان واسم
 * الشاعر والقلب)، الشارات بحدود بلا تعبئة، ومفاتيح التشكيل/السياق
 * من <Button>. ورقة الأبيات <AppCard> والحالات الفارغة <StateView>.
 */
export default function LibraryPoemPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

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
    return poemContexts.some(
      (c) => c.poemTitle === poem.data?.title && c.poetId === poem.data?.poet_slug,
    );
  }, [poem.data]);

  if (poem.isLoading) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="font-tajawal text-mini text-muted-foreground">
            جاري فتح رقوق القصيدة وفض أختامها…
          </p>
        </div>
      </PageShell>
    );
  }

  if (!poem.data) {
    return (
      <PageShell>
        <PageHeader title="المكتبة الكبرى" backFallback="/mihrab" />
        <StateView
          kind="search"
          title="لم يُعثر على هذه القصيدة"
          body="قد يكون الرابط قديماً أو القصيدة غير محفوظة في رقوق هذه النسخة."
          action={{ label: 'العودة إلى المكتبة', onClick: () => navigate('/diwan/library') }}
        />
      </PageShell>
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
    <PageShell>
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

      <PageHeader
        title={p.title}
        subtitle={
          <Link
            to={`/diwan/library/poet/${p.poet_slug}`}
            className="inline-flex max-w-full items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <Feather className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{p.poet_name}</span>
            {p.era_name && (
              <span className="shrink-0 text-muted-foreground-subtle">— {p.era_name}</span>
            )}
          </Link>
        }
        right={
          <div className="flex items-center gap-2">
            <FallbackBadge />
            {sbReady && (
              <IconButton
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
                className={isFavorited ? 'text-primary' : undefined}
              >
                <Heart
                  className="h-4 w-4"
                  fill={isFavorited ? 'currentColor' : 'none'}
                  strokeWidth={isFavorited ? 0 : 2}
                  aria-hidden
                />
              </IconButton>
            )}
          </div>
        }
        backFallback="/mihrab"
      />

      {/* Meta tags with simple borders (No fill, transparent backgrounds) */}
      <div className="flex flex-wrap items-center gap-2">
        {p.kind && (
          <span className="rounded-sm border border-border px-2.5 py-1 font-tajawal text-micro font-medium text-muted-foreground">
            {p.kind}
          </span>
        )}
        {p.meter && (
          <span className="rounded-sm border border-border px-2.5 py-1 font-tajawal text-micro font-medium text-muted-foreground">
            البحر: {p.meter}
          </span>
        )}
        {p.rhyme && (
          <span className="rounded-sm border border-border px-2.5 py-1 font-tajawal text-micro font-medium text-muted-foreground">
            القافية: {p.rhyme}
          </span>
        )}
        <span className="rounded-sm border border-border px-2.5 py-1 font-tajawal text-micro font-medium text-muted-foreground">
          {displayVerses.length} {displayVerses.length === 1 ? 'بيت' : 'أبيات'}
        </span>
        {approxYear && (
          <span className="rounded-sm border border-border px-2.5 py-1 font-tajawal text-micro font-medium text-muted-foreground-subtle select-none">
            سنة النظم: {approxYear}
          </span>
        )}
        <Button size="xs" variant="secondary" onClick={copyAll} className="ms-auto">
          <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
          نسخ المخطوطة
        </Button>
      </div>

      {/* Toggle Pills (بالتشكيل / السياق التاريخي) */}
      <div className="flex flex-wrap items-center gap-2 px-1 select-none">
        {showTashkeelBtn && (
          <Button
            variant={tashkeel ? 'default' : 'secondary'}
            size="sm"
            aria-pressed={tashkeel}
            onClick={() => setTashkeel((t) => !t)}
          >
            <span style={{ fontFamily: 'var(--font-amiri)' }}>
              {tashkeel ? 'بَلا تَشْكِيل' : 'بِالتَّشْكِيلِ'}
            </span>
          </Button>
        )}

        {hasContext && (
          <Button
            variant={showContext ? 'default' : 'secondary'}
            size="sm"
            aria-pressed={showContext}
            onClick={() => setShowContext((c) => !c)}
          >
            <span className="font-tajawal">السياق التاريخي</span>
          </Button>
        )}

        {glossaryKeys.size > 0 && (
          <span className="ms-auto flex items-center gap-1 font-tajawal text-micro text-muted-foreground select-none">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
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
      >
        <AppCard className="p-4 sm:p-6">
          {displayVerses.length === 0 ? (
            <StateView
              compact
              kind="empty"
              title="لا أبيات محفوظة بعد"
              body="لم تُحفظ أبيات هذه القصيدة في هذه النسخة من الرقوق. يمكنك تصفّح قصائد أخرى للشاعر أو العودة لاحقاً."
            />
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
        </AppCard>
      </motion.div>

      {/* Source link */}
      {p.source_url && (
        <a
          href={p.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 font-tajawal text-micro text-muted-foreground-subtle transition-colors hover:text-muted-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5 text-primary" aria-hidden />
          المصدر الأصلي للمخطوطة
        </a>
      )}

      {/* Similar poems */}
      <SimilarPoems slug={p.slug} />

      {/* Glossary bottom-sheet */}
      <GlossarySheet
        open={sheetOpen}
        word={sheetWord}
        entries={sheetEntries}
        versePreview={sheetVerseTx}
        onClose={() => setSheetOpen(false)}
      />
    </PageShell>
  );
}
