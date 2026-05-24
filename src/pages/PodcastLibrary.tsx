// User's subscribed podcasts library.
//
// Pure localStorage-backed view (see `lib/podcasts/store.ts`). Tapping
// a tile opens the same `PodcastDetail` page the discovery grid uses,
// but encodes the feed URL into the route id so we don't need a round-
// trip through Apple's lookup API for already-subscribed podcasts.

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LibraryBig } from 'lucide-react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { useSubscriptions } from '@/lib/podcasts/store';
import { encodeFeedUrl } from '@/lib/podcasts/route';

export default function PodcastLibrary() {
  const navigate = useNavigate();
  const { language } = useApp();
  const lang = language === 'de' ? 'de' : 'ar';
  const subs = useSubscriptions();

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
          <span className="text-[11px] text-muted-foreground">{subs.length}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">
        {subs.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-16 px-6">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <LibraryBig className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {lang === 'ar' ? 'لا اشتراكات بعد' : 'Noch keine Abonnements'}
            </p>
            <p className="text-[12px] text-muted-foreground mb-5 max-w-xs">
              {lang === 'ar'
                ? 'اكتشف البودكاست واشترك بها لتظهر هنا.'
                : 'Entdecke Podcasts und abonniere sie, um sie hier zu sehen.'}
            </p>
            <button
              onClick={() => navigate('/podcasts')}
              className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95"
            >
              {lang === 'ar' ? 'استكشاف البودكاست' : 'Podcasts entdecken'}
            </button>
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
                    ? <img src={p.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
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
  );
}
