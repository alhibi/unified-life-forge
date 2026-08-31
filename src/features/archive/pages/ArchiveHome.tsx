import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { useAuth } from '@/hooks/useAuth';
import {
  BookOpen,
  Grid3X3,
  Loader2,
  Network,
  Plus,
  Search as SearchIcon,
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

export default function ArchiveHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<ArchiveDocumentSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'graph'>('list');

  useEffect(() => {
    if (!user) {
      return;
    }
    let alive = true;
    setLoading(true);
    archiveApi
      .list()
      .then((d) => {
        if (alive) setItems(d);
      })
      .catch((err) => {
        console.error(err);
        if (alive) setItems([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

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

  return (
    <PageShell>
      <SEO
        title="الأرشيف المعرفي — SmartHub"
        description="أرشيفك الشخصي من المونوغرافات المولّدة بذكاء اصطناعي: موضوع، عمق، وقراءة نظيفة."
        path="/archive"
      />
      <div className="flex items-center gap-3 mb-2">
        <BackButton />
        <h1 className="text-title font-bold text-foreground flex-1">الأرشيف المعرفي</h1>
        <button
          onClick={() => navigate('/archive/new')}
          className="flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-meta font-semibold active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          توليد جديد
        </button>
      </div>

      <p className="text-mini text-muted-foreground leading-relaxed mb-1">
        اقترح موضوعاً ومستوى عمق، وسيبني المحرك مخطّطاً هرمياً ثم يكتب كل قسم فرعي على حدة، ثم يحفظه
        هنا برقم أرشيفي متسلسل.
      </p>

      {/* Segmented Tabs */}
      {user && items && items.length > 0 && (
        <div className="flex rounded-xl bg-muted/40 p-1 mb-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-mini font-semibold transition-all ${activeTab === 'list' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>الفهرس الأرشيفي</span>
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-mini font-semibold transition-all ${activeTab === 'graph' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>الشبكة الدلالية</span>
          </button>
        </div>
      )}

      {!user ? (
        <AppCard className="text-center py-10">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-meta text-muted-foreground mb-3">سجّل الدخول لتبدأ أرشيفك المعرفي.</p>
          <button
            onClick={() => navigate('/auth')}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-meta font-semibold"
          >
            تسجيل الدخول
          </button>
        </AppCard>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === 'graph' ? (
        <ArchiveGraph items={items ?? []} onOpenDoc={(id) => navigate(`/archive/${id}`)} />
      ) : (
        <>
          {/* Search */}
          <AppCard compact className="flex items-center gap-2">
            <SearchIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في العنوان، الملخص، أو الوسوم…"
              className="flex-1 bg-transparent outline-none text-meta placeholder:text-muted-foreground/60"
              style={{ fontSize: 16 }}
            />
          </AppCard>

          {filtered.length === 0 ? (
            <AppCard className="text-center py-12">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-meta text-muted-foreground mb-4">
                {items && items.length === 0 ? 'الأرشيف فارغ. ابدأ ببحث جديد.' : 'لا نتائج مطابقة.'}
              </p>
              {items && items.length === 0 && (
                <button
                  onClick={() => navigate('/archive/new')}
                  className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-meta font-semibold"
                >
                  توليد أول مستند
                </button>
              )}
            </AppCard>
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
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-micro text-primary/70 tracking-wider">
                              № {String(d.accession_number).padStart(6, '0')}
                            </span>
                            <span className="text-micro text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted/50">
                              {DEPTH_LABEL[d.depth] || d.depth}
                            </span>
                            <span className="text-micro text-muted-foreground">
                              {readingTime(d.word_count)} د · {d.word_count.toLocaleString('ar-EG')}{' '}
                              كلمة
                            </span>
                          </div>
                          <h3 className="font-bold text-foreground leading-snug mb-1 line-clamp-2">
                            {d.title}
                          </h3>
                          {d.abstract && (
                            <p className="text-mini text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                              {d.abstract}
                            </p>
                          )}
                          {d.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {d.tags.slice(0, 4).map((t) => (
                                <span
                                  key={t}
                                  className="text-micro px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(d.id);
                          }}
                          className="shrink-0 w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-90 transition-transform"
                          aria-label="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </AppCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
