import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, IconButton, IconChip, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonList } from '@/components/ui/skeleton';
import { StateView } from '@/components/ui/state-view';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import {
  BookOpen,
  Grid3X3,
  Network,
  PenLine,
  Plus,
  Search as SearchIcon,
  Sparkles,
  Trash2,
} from '@/lib/icons';

import { archiveApi } from '../api';
import ArchiveGraph from '../components/ArchiveGraph';
import type { ArchiveDocumentSummary } from '../types';

const DEPTH_LABEL: Record<string, string> = {
  standard: 'قياسي',
  deep: 'متعمّق',
  deepest: 'أقصى',
};

function readingTime(words: number) {
  return Math.max(1, Math.round(words / 220));
}

/** The three steps of the archive engine, shown only where they explain the gate. */
const ARCHIVE_STEPS = [
  {
    icon: PenLine,
    title: '١ · اقترح الموضوع',
    subtitle: 'موضوع واحد تحدّده أنت: فلسفة، تاريخ، علم، أو فكرة تشغل بالك.',
  },
  {
    icon: Sparkles,
    title: '٢ · اختر العمق',
    subtitle: 'قياسي أو متعمّق أو أقصى — يحدّد المخطّط وحجم كل قسم فرعي.',
  },
  {
    icon: BookOpen,
    title: '٣ · اقرأ واحفظ',
    subtitle: 'يُكتب المستند ويُحفظ برقم أرشيفي متسلسل تصل إليه لاحقاً.',
  },
] as const;

export default function ArchiveHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<ArchiveDocumentSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [activeTab, setActiveTab] = useState<'list' | 'graph'>('list');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(false);
    archiveApi
      .list()
      .then((d) => {
        if (alive) setItems(d);
      })
      .catch((err) => {
        console.error(err);
        if (alive) {
          setItems([]);
          setError(true);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user, reloadToken]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim();
    if (!q) return items;
    const lower = q.toLowerCase();
    return items.filter(
      (d) =>
        d.title.toLowerCase().includes(lower) ||
        d.abstract.toLowerCase().includes(lower) ||
        d.tags.some((t) => t.toLowerCase().includes(lower)),
    );
  }, [items, query]);

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا المستند نهائياً؟')) return;
    try {
      await archiveApi.remove(id);
      setItems((prev) => prev?.filter((d) => d.id !== id) ?? null);
    } catch (e) {
      console.error(e);
    }
  }

  const documentCount = items?.length ?? 0;
  const subtitle = !user
    ? 'مونوغرافات معرفية تُبنى على مراحل وتُحفظ برقم أرشيفي'
    : loading
      ? 'جارٍ فتح أرشيفك…'
      : documentCount > 0
        ? `${documentCount.toLocaleString('ar-EG')} مستنداً محفوظاً`
        : 'لا مستندات بعد';

  return (
    <PageShell>
      <SEO
        title="الأرشيف المعرفي — SmartHub"
        description="أرشيفك الشخصي من المونوغرافات المولّدة بذكاء اصطناعي: موضوع، عمق، وقراءة نظيفة."
        path="/archive"
      />
      <PageHeader
        title={'الأرشيف المعرفي'}
        subtitle={subtitle}
        right={
          <Button size="sm" onClick={() => navigate('/archive/new')}>
            <Plus className="h-4 w-4" aria-hidden />
            {'توليد جديد'}
          </Button>
        }
      />

      {!user ? (
        <div className="app-stack pt-1">
          <p className="text-meta leading-relaxed text-muted-foreground">
            {'اقترح موضوعاً وحدّد عمق المعالجة، وسيبني المحرك مخطّطاً هرمياً ثم يكتب كل قسم على حدة، ويحفظه هنا للرجوع إليه.'}
          </p>

          <AppCard>
          <StateView
            kind="auth"
            bare
            title="سجّل الدخول لتبدأ أرشيفك المعرفي"
            body="أرشيفك خاص بحسابك: مستنداتك وملخّصاتها ووسومها تبقى معك، ولا يراها غيرك."
            actions={
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => navigate('/auth')}>{'تسجيل الدخول'}</Button>
                <Button variant="ghost" onClick={() => navigate('/')}>
                  {'العودة إلى البوابة'}
                </Button>
              </div>
            }
          />
          </AppCard>

          <section aria-labelledby="archive-steps" className="space-y-2">
            <h2 id="archive-steps" className="app-section-label text-start">
              {'كيف يُبنى المستند'}
            </h2>
            <AppList compact>
              {ARCHIVE_STEPS.map(({ icon: Icon, title, subtitle: sub }) => (
                <AppRow
                  key={title}
                  as="div"
                  leading={
                    <IconChip tone="plain" aria-hidden>
                      <Icon className="h-4 w-4" />
                    </IconChip>
                  }
                  title={title}
                  subtitle={sub}
                />
              ))}
            </AppList>
          </section>
        </div>
      ) : loading ? (
        <div className="pt-2" role="status" aria-busy="true">
          <div className="pb-3">
            <h2 className="type-section text-foreground">{'جارٍ فتح أرشيفك'}</h2>
            <p className="mt-1 text-mini leading-relaxed text-muted-foreground">
              {'نقرأ مستنداتك المحفوظة ونرتّبها برقم الأرشيف. لا شيء يضيع إن طال التحميل.'}
            </p>
          </div>
          <SkeletonList rows={3} />
        </div>
      ) : error ? (
        <StateView
          kind="error"
          className="mt-2"
          title={'تعذّر فتح الأرشيف الآن'}
          body={'لم نتمكّن من قراءة مستنداتك. المحاولة مرة أخرى لا تحذف شيئاً، ويمكنك أيضاً توليد مستند جديد.'}
          action={{ label: 'إعادة المحاولة', onClick: () => setReloadToken((n) => n + 1) }}
          secondary={
            <button
              type="button"
              onClick={() => navigate('/archive/new')}
              className="app-focus-ring font-semibold text-primary underline-offset-4 hover:underline"
            >
              {'أو ابدأ مستنداً جديداً'}
            </button>
          }
        />
      ) : documentCount === 0 ? (
        <div className="app-stack pt-1">
          <StateView
            kind="empty"
            title={'الأرشيف فارغ — بعدُ'}
            body={'كل مستند تولّده يُحفظ هنا للرجوع إليه لاحقاً، مع ملخّصه ووسومه ورقمه الأرشيفي.'}
            action={{ label: 'توليد أول مستند', onClick: () => navigate('/archive/new') }}
          />
          <section aria-labelledby="archive-steps-empty" className="space-y-2">
            <h2 id="archive-steps-empty" className="app-section-label text-start">
              {'كيف يُبنى المستند'}
            </h2>
            <AppList compact>
              {ARCHIVE_STEPS.map(({ icon: Icon, title, subtitle: sub }) => (
                <AppRow
                  key={title}
                  as="div"
                  leading={
                    <IconChip tone="plain" aria-hidden>
                      <Icon className="h-4 w-4" />
                    </IconChip>
                  }
                  title={title}
                  subtitle={sub}
                />
              ))}
            </AppList>
          </section>
        </div>
      ) : (
        <div className="app-stack pt-1">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'graph')}>
            <TabsList>
              <TabsTrigger value="list">
                <Grid3X3 className="me-1.5 h-3.5 w-3.5" aria-hidden />
                {'الفهرس الأرشيفي'}
              </TabsTrigger>
              <TabsTrigger value="graph">
                <Network className="me-1.5 h-3.5 w-3.5" aria-hidden />
                {'الشبكة الدلالية'}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'graph' ? (
            <ArchiveGraph items={items ?? []} onOpenDoc={(id) => navigate(`/archive/${id}`)} />
          ) : (
            <>
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث في العنوان، الملخّص، أو الوسوم…"
                  aria-label="بحث في الأرشيف"
                  className="ps-9"
                />
              </div>

              {filtered.length === 0 ? (
                <StateView
                  kind="search"
                  title={'لا مستند يطابق بحثك'}
                  body={'البحث يشمل العنوان والملخّص والوسوم — جرّب كلمة واحدة أقصر أو امسح البحث.'}
                  action={{ label: 'مسح البحث', onClick: () => setQuery('') }}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {filtered.map((d, i) => (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: Math.min(i * 0.02, 0.1) }}
                      >
                        <AppCard
                          pressable
                          onClick={() => navigate(`/archive/${d.id}`)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-micro tabular-nums text-primary/80">
                                  {`رقم ${String(d.accession_number).padStart(6, '0')}`}
                                </span>
                                <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-micro text-muted-foreground">
                                  {DEPTH_LABEL[d.depth] || d.depth}
                                </span>
                                <span className="text-micro text-muted-foreground tabular-nums">
                                  {`${readingTime(d.word_count)} د · ${d.word_count.toLocaleString('ar-EG')} كلمة`}
                                </span>
                              </div>
                              <h3 className="mb-1 text-body font-bold leading-snug text-foreground line-clamp-2">
                                {d.title}
                              </h3>
                              {d.abstract && (
                                <p className="mb-2 text-mini leading-relaxed text-muted-foreground line-clamp-2">
                                  {d.abstract}
                                </p>
                              )}
                              {d.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {d.tags.slice(0, 4).map((t) => (
                                    <span
                                      key={t}
                                      className="rounded-full bg-primary/10 px-2 py-0.5 text-micro text-primary"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <IconButton
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(d.id);
                              }}
                              aria-label={`حذف ${d.title}`}
                              title="حذف المستند"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </IconButton>
                          </div>
                        </AppCard>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PageShell>
  );
}
