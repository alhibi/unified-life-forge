/**
 * Marginalia — «الهوامش»
 * A personal reading archive that remembers what you read and proposes
 * non-obvious links between pieces you never filed together.
 *
 * Four surfaces: Discovery feed, Archive, Chat (RAG), Pinboard.
 */
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { useAuth } from '@/hooks/useAuth';
import { Link2, Loader2, Pin, Rss, Sparkles } from '@/lib/icons';

import { marginaliaApi } from '../api';
import ArchivePanel from '../components/ArchivePanel';
import ChatPanel from '../components/ChatPanel';
import ConnectionCard from '../components/ConnectionCard';
import SourcesPanel from '../components/SourcesPanel';
import type { MgArticle, MgConnection, MgPin, MgSource } from '../types';

type Tab = 'discover' | 'archive' | 'chat' | 'pinboard' | 'sources';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'discover', label: 'الروابط', icon: Link2 },
  { key: 'archive', label: 'الأرشيف', icon: Sparkles },
  { key: 'chat', label: 'الحوار', icon: Link2 },
  { key: 'pinboard', label: 'المثبّت', icon: Pin },
  { key: 'sources', label: 'المصادر', icon: Rss },
];

export default function Marginalia() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('discover');
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<MgSource[]>([]);
  const [articles, setArticles] = useState<MgArticle[]>([]);
  const [connections, setConnections] = useState<MgConnection[]>([]);
  const [pins, setPins] = useState<MgPin[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [seed, setSeed] = useState<{ connectionId: string; text: string } | null>(null);

  const articleMap = useMemo(() => new Map(articles.map((a) => [a.id, a])), [articles]);
  const connectionMap = useMemo(() => new Map(connections.map((c) => [c.id, c])), [connections]);

  const reload = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [s, a, c, p] = await Promise.all([
        marginaliaApi.listSources(),
        marginaliaApi.listArticles(),
        marginaliaApi.listConnections(),
        marginaliaApi.listPins(),
      ]);
      setSources(s); setArticles(a); setConnections(c); setPins(p);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void reload(); }, [reload]);

  const runDiscovery = async () => {
    setDiscovering(true);
    try {
      const res = await marginaliaApi.discover();
      if (res.note === 'need_more_articles') {
        toast.error('يحتاج المحرّك أربعة مقالات محلّلة على الأقل');
      } else {
        toast.success(res.created ? `${res.created} رابطاً جديداً` : 'لا روابط جديدة هذه المرة');
      }
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setDiscovering(false); }
  };

  const fresh = connections.filter((c) => c.status === 'new');
  const pinnedConnections = pins
    .map((p) => ({ pin: p, connection: connectionMap.get(p.connection_id) }))
    .filter((row): row is { pin: MgPin; connection: MgConnection } => Boolean(row.connection));

  if (!user) {
    return (
      <PageShell>
        <SEO title="الهوامش" description="أرشيف قراءة شخصي يكشف الروابط الخفية بين ما تقرأ." />
        <BackButton />
        <AppCard className="text-center py-10">
          <p className="text-sm text-muted-foreground">سجّل الدخول لبناء أرشيفك الشخصي.</p>
        </AppCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SEO
        title="الهوامش — أرشيف قراءة يكشف الروابط"
        description="أرشيف قراءة شخصي يحلّل المقالات ويقترح روابط غير بديهية بينها، مع حوار مستند إلى أرشيفك."
      />
      <BackButton />

      <header className="space-y-1 pt-1">
        <h1 className="text-xl font-black">الهوامش</h1>
        <p className="text-xs text-muted-foreground">
          {articles.length.toLocaleString('en-US')} مقالاً · {connections.length.toLocaleString('en-US')} رابطاً
        </p>
      </header>

      <div className="flex bg-muted/40 rounded-xl p-1 border border-border/30 overflow-x-auto scrollbar-none gap-0.5" dir="rtl">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-all ${
              tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {tab === 'discover' && (
              <>
                <button
                  type="button"
                  onClick={runDiscovery}
                  disabled={discovering}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98] transition disabled:opacity-60"
                >
                  {discovering
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> يقرأ أرشيفك…</>
                    : <><Link2 className="w-4 h-4" /> ابحث عن روابط جديدة</>}
                </button>
                {fresh.length === 0 ? (
                  <AppCard className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      لا روابط معلّقة — أضف مقالات ثم شغّل المحرّك.
                    </p>
                  </AppCard>
                ) : fresh.map((c) => (
                  <ConnectionCard
                    key={c.id}
                    connection={c}
                    articles={articleMap}
                    onDiscuss={(conn) => { setSeed({ connectionId: conn.id, text: conn.connection_text }); setTab('chat'); }}
                    onPin={async (conn) => {
                      try { await marginaliaApi.pin(conn.id); await reload(); toast.success('ثُبّت'); }
                      catch (e) { toast.error((e as Error).message); }
                    }}
                    onDismiss={async (conn) => {
                      setConnections((prev) => prev.map((x) => x.id === conn.id ? { ...x, status: 'dismissed' } : x));
                      try { await marginaliaApi.setConnectionStatus(conn.id, 'dismissed'); }
                      catch (e) { toast.error((e as Error).message); await reload(); }
                    }}
                  />
                ))}
              </>
            )}

            {tab === 'archive' && <ArchivePanel articles={articles} onChanged={reload} />}

            {tab === 'chat' && (
              <ChatPanel articles={articleMap} seed={seed} onSeedConsumed={() => setSeed(null)} />
            )}

            {tab === 'pinboard' && (
              pinnedConnections.length === 0 ? (
                <AppCard className="text-center py-8">
                  <p className="text-sm text-muted-foreground">لا شيء مثبّت بعد.</p>
                </AppCard>
              ) : pinnedConnections.map(({ pin, connection }) => (
                <ConnectionCard
                  key={pin.id}
                  connection={connection}
                  articles={articleMap}
                  pinned
                  note={pin.user_note}
                  onNoteChange={(value) => {
                    setPins((prev) => prev.map((p) => p.id === pin.id ? { ...p, user_note: value } : p));
                  }}
                  onDiscuss={(conn) => { setSeed({ connectionId: conn.id, text: conn.connection_text }); setTab('chat'); }}
                  onDismiss={async () => {
                    try { await marginaliaApi.unpin(pin.id); await reload(); }
                    catch (e) { toast.error((e as Error).message); }
                  }}
                />
              ))
            )}

            {tab === 'sources' && <SourcesPanel sources={sources} onChanged={reload} />}
          </motion.div>
        </AnimatePresence>
      )}
    </PageShell>
  );
}
