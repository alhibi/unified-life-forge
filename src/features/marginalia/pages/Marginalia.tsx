/**
 * Marginalia — «الهوامش»
 * A personal reading archive that remembers what you read and proposes
 * non-obvious links between pieces you never filed together.
 *
 * Four surfaces: Discovery feed, Archive, Chat (RAG), Pinboard.
 */
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, IconChip, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/ui/skeleton';
import { StateView } from '@/components/ui/state-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('discover');
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<MgSource[]>([]);
  const [articles, setArticles] = useState<MgArticle[]>([]);
  const [connections, setConnections] = useState<MgConnection[]>([]);
  const [pins, setPins] = useState<MgPin[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [seed, setSeed] = useState<{ connectionId: string; text: string } | null>(null);
  // Debounced persistence for pinboard notes — typing shouldn't fire a
  // write per keystroke, and unmounting shouldn't lose the last edit.
  const noteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => () => {
    for (const timer of noteTimers.current.values()) clearTimeout(timer);
  }, []);

  const saveNote = useCallback((pinId: string, value: string) => {
    const timers = noteTimers.current;
    const existing = timers.get(pinId);
    if (existing) clearTimeout(existing);
    timers.set(pinId, setTimeout(() => {
      timers.delete(pinId);
      marginaliaApi.updatePinNote(pinId, value).catch((e) => toast.error((e as Error).message));
    }, 700));
  }, []);

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
      <PageShell
        header={
          <PageHeader
            variant="display"
            eyebrow="القراءة · الهوامش"
            title="الهوامش"
            subtitle="أرشيف قراءة شخصي يكشف الروابط الخفية بين ما تقرأ"
          />
        }
      >
        <SEO path="/marginalia" title="الهوامش" description="أرشيف قراءة شخصي يكشف الروابط الخفية بين ما تقرأ." />

        <div className="app-stack">
          <p className="text-meta leading-relaxed text-muted-foreground">
            {'الهوامش لا يحفظ المقالات فقط: يقرأ ما وصل إلى أرشيفك ويقترح روابط غير بديهية بينه، ويجيب عن أسئلتك من داخل أرشيفك — كل ذلك خاص بحسابك.'}
          </p>

          <AppCard>
          <StateView
            kind="auth"
            bare
            title="أرشيفك الشخصي يحتاج حساباً"
            body="سجّل الدخول لتبدأ بناء الأرشيف؛ مقالاتك وروابطك ومثبّتاتك تبقى مرتبطة بحسابك."
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

          <section aria-labelledby="marginalia-surfaces" className="space-y-2">
            <h2 id="marginalia-surfaces" className="app-section-label text-start">
              {'أربع واجهات داخل الأرشيف'}
            </h2>
            <AppList compact>
              <AppRow
                as="div"
                leading={<IconChip tone="plain" aria-hidden><Link2 className="h-4 w-4" /></IconChip>}
                title="الروابط"
                subtitle="اقتراحات صلة بين مقالين لم تُفكّر بجمعهما."
              />
              <AppRow
                as="div"
                leading={<IconChip tone="plain" aria-hidden><Sparkles className="h-4 w-4" /></IconChip>}
                title="الأرشيف"
                subtitle="مقالاتك المحلّلة، جاهزة للتصفّح والربط."
              />
              <AppRow
                as="div"
                leading={<IconChip tone="plain" aria-hidden><Rss className="h-4 w-4" /></IconChip>}
                title="الحوار والمصادر"
                subtitle="اسأل أرشيفك، وأضف المصادر التي تغذّيه."
              />
            </AppList>
          </section>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <PageHeader
          variant="display"
          eyebrow="القراءة · الهوامش"
          title="الهوامش"
          subtitle={
            loading && articles.length === 0
              ? 'جارٍ فتح أرشيف قراءتك…'
              : `${articles.length.toLocaleString('ar-EG')} مقالاً · ${connections.length.toLocaleString('ar-EG')} رابطاً`
          }
        />
      }
    >
      <SEO
        path="/marginalia"
        title="الهوامش — أرشيف قراءة يكشف الروابط"
        description="أرشيف قراءة شخصي يحلّل المقالات ويقترح روابط غير بديهية بينها، مع حوار مستند إلى أرشيفك."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {TABS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key} className="px-1.5">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

      {loading ? (
        <div className="mt-4" role="status" aria-busy="true">
          <h2 className="type-section text-foreground">{'جارٍ فتح أرشيفك'}</h2>
          <p className="mb-3 mt-1 text-mini leading-relaxed text-muted-foreground">
            {'نقرأ مقالاتك وروابطك المحفوظة. لا شيء يُحذف إن طال التحميل.'}
          </p>
          <SkeletonList rows={3} />
        </div>
      ) : (
        <TabsContent value={tab} className="mt-4">
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
                <Button className="w-full" onClick={runDiscovery} disabled={discovering}>
                  {discovering
                    ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> يقرأ أرشيفك…</>
                    : <><Link2 className="w-4 h-4" aria-hidden /> ابحث عن روابط جديدة</>}
                </Button>
                {fresh.length === 0 ? (
                  <StateView
                    kind="empty"
                    compact
                    title="لا روابط معلّقة"
                    body="أضف مقالات إلى الأرشيف ثم شغّل المحرّك: كلما اتسع الأرشيف ظهرت روابط أدقّ بين ما قرأت."
                  />
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
                <StateView
                  kind="empty"
                  compact
                  title={'لوحة التثبيت فارغة'}
                  body={'عندما يظهر ربط يستحق التذكّر، ثبّته من تبويب الروابط فيبقى هنا مع ملاحظتك عليه.'}
                />
              ) : pinnedConnections.map(({ pin, connection }) => (
                <ConnectionCard
                  key={pin.id}
                  connection={connection}
                  articles={articleMap}
                  pinned
                  note={pin.user_note}
                  onNoteChange={(value) => {
                    setPins((prev) => prev.map((p) => p.id === pin.id ? { ...p, user_note: value } : p));
                    saveNote(pin.id, value);
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
        </TabsContent>
      )}
      </Tabs>
    </PageShell>
  );
}
