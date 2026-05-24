// User's subscribed podcasts library.
//
// Pure localStorage-backed view (see `lib/podcasts/store.ts`). Tapping
// a tile opens the same `PodcastDetail` page the discovery grid uses,
// but encodes the feed URL into the route id so we don't need a round-
// trip through Apple's lookup API for already-subscribed podcasts.

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Download, LibraryBig, MoreVertical, Upload,
} from 'lucide-react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import {
  useSubscriptions,
  subscribeWithNotify,
  isSubscribed,
} from '@/lib/podcasts/store';
import { encodeFeedUrl } from '@/lib/podcasts/route';
import { upgradeArtwork } from '@/lib/podcasts/itunes';
import { downloadOpml, parseOpml } from '@/lib/podcasts/opml';
import ContinueListeningRow from '@/components/podcasts/ContinueListeningRow';

export default function PodcastLibrary() {
  const navigate = useNavigate();
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';
  const subs = useSubscriptions();

  // Hidden file input used by the OPML import flow. We keep it
  // as a ref-driven `<input type="file">` instead of building a
  // drag-and-drop UI because the import is a rare, deliberate
  // action and a one-tap file picker is the most platform-native
  // way to do it on both desktop and mobile browsers.
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<
    | null
    | { kind: 'ok'; added: number; skipped: number }
    | { kind: 'err'; message: string }
  >(null);

  const handleImportFile = async (file: File) => {
    setImportStatus(null);
    let xml = '';
    try {
      xml = await file.text();
    } catch {
      setImportStatus({ kind: 'err', message: lang === 'ar'
        ? 'تعذّر قراءة الملف.'
        : 'Datei konnte nicht gelesen werden.' });
      return;
    }
    const entries = parseOpml(xml);
    if (entries.length === 0) {
      setImportStatus({ kind: 'err', message: lang === 'ar'
        ? 'لم يتم العثور على خلاصات RSS في الملف.'
        : 'Keine RSS-Feeds in der Datei gefunden.' });
      return;
    }
    let added = 0;
    let skipped = 0;
    // Subscribe in a single synchronous pass — each call flushes a
    // notify, but the UI uses useSyncExternalStore so the renders
    // get batched naturally by React 18.
    for (const e of entries) {
      if (isSubscribed(e.feedUrl)) {
        skipped++;
        continue;
      }
      // We don't have artwork or a seed color until the feed is fetched
      // for real (next time the user opens the detail page). Use sane
      // neutral defaults so the library tile still has something to
      // render in the meantime.
      subscribeWithNotify({
        origin: e.feedUrl,
        title: e.title || e.feedUrl,
        author: e.author,
        imageUrl: '',
        link: e.htmlUrl,
        seedH: 200,
        seedS: 50,
        seedL: 50,
      });
      added++;
    }
    setImportStatus({ kind: 'ok', added, skipped });
  };

  const handleExport = () => {
    if (subs.length === 0) return;
    downloadOpml(subs);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEO
        title={lang === 'ar' ? 'مكتبة البودكاست' : 'Podcast-Bibliothek'}
        description={lang === 'ar'
          ? 'البودكاست التي اشتركت بها — جاهزة للاستماع.'
          : 'Deine abonnierten Podcasts — bereit zum Anhören.'}
        path="/podcasts/library"
      />

      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-3 flex items-center gap-2">
          <BackButton />
          <h1 className="flex-1 text-base font-bold text-foreground">
            {lang === 'ar' ? 'مكتبتي' : 'Meine Bibliothek'}
          </h1>
          <span className="text-[11px] text-muted-foreground tabular-nums">{subs.length}</span>
          {/* Overflow menu — import / export OPML. We use a tiny
              custom popover instead of a full Radix Menu because the
              menu has only two items and the popover layer comes for
              free with the absolute positioning. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="w-9 h-9 rounded-2xl flex items-center justify-center hover:bg-muted/60"
              aria-label={lang === 'ar' ? 'المزيد' : 'Mehr'}
            >
              <MoreVertical className="w-4 h-4 text-foreground" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute end-0 top-full mt-1 z-50 bg-popover border border-border/60 rounded-xl shadow-xl min-w-[190px] py-1"
                // Click outside should close the menu — handled by a
                // single backdrop layer below.
              >
                <button
                  role="menuitem"
                  onClick={() => { fileRef.current?.click(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-start hover:bg-muted/60"
                >
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{lang === 'ar' ? 'استيراد OPML' : 'OPML importieren'}</span>
                </button>
                <button
                  role="menuitem"
                  onClick={handleExport}
                  disabled={subs.length === 0}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-start hover:bg-muted/60 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{lang === 'ar' ? 'تصدير OPML' : 'OPML exportieren'}</span>
                </button>
              </div>
            )}
            {menuOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
            )}
          </div>
          {/* Hidden file picker — bound to the ref so the menu item
              can `.click()` it programmatically. `accept` filters the
              picker UI on native platforms; we still validate by
              parsing the XML, so a renamed `.opml` file with garbage
              inside surfaces a clean error. */}
          <input
            ref={fileRef}
            type="file"
            accept=".opml,application/xml,text/xml,text/x-opml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              // Clear the value so picking the SAME file twice in a
              // row still triggers `change` the second time.
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto pt-5">
        {/* Continue Listening — surfaced above the subscription grid
            because users coming back to the library are usually
            picking up where they left off, not browsing for something
            new. */}
        <ContinueListeningRow />

        <div className="px-4">
          {importStatus && (
            <div
              className={`rounded-2xl px-4 py-3 mb-4 text-[12.5px] border ${
                importStatus.kind === 'ok'
                  ? 'bg-primary/10 border-primary/30 text-foreground'
                  : 'bg-destructive/10 border-destructive/30 text-foreground'
              }`}
            >
              {importStatus.kind === 'ok'
                ? (lang === 'ar'
                  ? `تمت إضافة ${importStatus.added} بودكاست (تم تجاهل ${importStatus.skipped} مشترَك بها مسبقاً).`
                  : `${importStatus.added} Podcasts hinzugefügt (${importStatus.skipped} bereits abonniert).`)
                : importStatus.message}
            </div>
          )}

          {subs.length === 0 ? (
            <div className="flex flex-col items-center text-center pt-10 px-6">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                <LibraryBig className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                {lang === 'ar' ? 'لا اشتراكات بعد' : 'Noch keine Abonnements'}
              </p>
              <p className="text-[12px] text-muted-foreground mb-5 max-w-xs">
                {lang === 'ar'
                  ? 'اكتشف البودكاست واشترك بها لتظهر هنا، أو استورد ملف OPML من تطبيق آخر.'
                  : 'Entdecke Podcasts und abonniere sie, oder importiere eine OPML-Datei aus einer anderen App.'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/podcasts')}
                  className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95"
                >
                  {lang === 'ar' ? 'استكشاف البودكاست' : 'Podcasts entdecken'}
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-5 py-2.5 rounded-2xl bg-muted text-foreground text-sm font-semibold active:scale-95"
                >
                  {lang === 'ar' ? 'استيراد OPML' : 'OPML importieren'}
                </button>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-3 gap-x-3 gap-y-5"
            >
              {subs.map(p => (
                <button
                  key={p.origin}
                  onClick={() => navigate(`/podcasts/${encodeFeedUrl(p.origin)}`)}
                  className="flex flex-col gap-1.5 text-start active:scale-[0.97] transition-transform"
                >
                  <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted/40 border border-border/40">
                    {p.imageUrl
                      ? <img src={upgradeArtwork(p.imageUrl, 200)} alt="" loading="lazy" className="w-full h-full object-cover" />
                      : null}
                  </div>
                  <p className="text-[12.5px] font-bold text-foreground leading-tight line-clamp-2">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">{p.author}</p>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
