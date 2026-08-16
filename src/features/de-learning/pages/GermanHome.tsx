import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageShell } from '@/components/ui/app-shell';
import { ArrowLeft, Crown, Sparkles, Flame, BookOpen, MessageSquare, Volume2, ShieldCheck, Zap } from '@/lib/icons';

import { DeutschGenZShelves } from '../components/DeutschGenZShelves';
import { DeutschGrammarSpots } from '../components/DeutschGrammarSpots';
import { DeutschScenarioSimulator } from '../components/DeutschScenarioSimulator';
import { GERMAN_PHONETIC_SPOTS } from '../data/genzGermanData';

export const GermanHome: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shelves' | 'grammar' | 'scenarios' | 'phonetics'>('shelves');

  return (
    <PageShell flush centered={false}>
      <Helmet>
        <title>الألمانية لجيل زد | Deutsch Gen-Z Lounge</title>
        <meta name="theme-color" content="#080808" />
      </Helmet>

      {/* Ambient Gold/Copper Glow Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/5 blur-[140px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col pb-page">
        {/* Luxury Chrome Header */}
        <div className="app-header-chrome">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <Link to="/"><ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" /></Link>
            <div className="flex flex-col items-end text-end">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-plex-mono text-micro font-bold uppercase tracking-widest border border-amber-500/30">
                  €1,000 / MO VIP
                </span>
                <h1 className="font-amiri text-lead font-bold tracking-wide text-foreground">
                  جناح الألمانية لجيل زد
                </h1>
              </div>
              <p className="font-tajawal text-micro text-muted-foreground font-medium uppercase tracking-widest">
                Deutsch Gen-Z Lounge
              </p>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-lg flex-1 p-4 space-y-6 mt-2">

          {/* Ultra-Luxury Gold VIP Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-950/20 to-orange-500/10 p-6 shadow-xl">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
                <Crown className="h-7 w-7" />
              </div>

              <div className="space-y-1 text-end">
                <div className="flex items-center gap-2 justify-end">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-tajawal text-micro font-bold uppercase">
                    باقة VIP النخبة
                  </span>
                  <h2 className="font-amiri text-lead font-bold text-foreground">
                    قسم تعلم الألمانية المتقدم الحصري
                  </h2>
                </div>
                <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">
                  تجربة استثنائية مصممة بعناية فائقة لجيل الشباب بمصطلحات الشارع والمواقف اليومية والقواعد المقارنة.
                </p>
              </div>
            </div>
          </div>

          {/* Main Module Tabs Navigation */}
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-secondary/30 border border-border/40 backdrop-blur-md">
            {[
              { id: 'shelves', label: 'الرفوف الحية', icon: Flame, color: 'text-amber-400' },
              { id: 'grammar', label: 'القواعد الهامة', icon: BookOpen, color: 'text-teal-400' },
              { id: 'scenarios', label: 'المحاكاة', icon: MessageSquare, color: 'text-rose-400' },
              { id: 'phonetics', label: 'الصوتيات', icon: Volume2, color: 'text-cyan-400' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2.5 px-2 flex flex-col items-center gap-1 rounded-xl font-tajawal text-mini font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-card text-foreground shadow-md border border-border/50 scale-[1.02]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? tab.color : 'text-muted-foreground'}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active View Container */}
          <AnimatePresence mode="wait">
            {activeTab === 'shelves' && (
              <motion.div
                key="shelves"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <DeutschGenZShelves />
              </motion.div>
            )}

            {activeTab === 'grammar' && (
              <motion.div
                key="grammar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <DeutschGrammarSpots />
              </motion.div>
            )}

            {activeTab === 'scenarios' && (
              <motion.div
                key="scenarios"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <DeutschScenarioSimulator />
              </motion.div>
            )}

            {activeTab === 'phonetics' && (
              <motion.div
                key="phonetics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="text-end space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-tajawal text-micro font-bold uppercase tracking-wider">
                    لوحة مخارج الأصوات الألمانية
                  </span>
                  <h3 className="font-amiri text-display font-bold text-foreground">
                    صوتيات ومخارج الحروف الصعبة
                  </h3>
                  <p className="font-tajawal text-mini text-muted-foreground">
                    دليل النطق الدقيق للأصوات الألمانية الخاصة مع مقارنة بمخارج الحروف العربية.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {GERMAN_PHONETIC_SPOTS.map((spot) => (
                    <div key={spot.id} className="p-4 rounded-2xl border border-border/40 bg-card space-y-2 text-end">
                      <div className="flex items-center justify-between border-b border-border/30 pb-2">
                        <span className="font-plex-mono text-micro text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded">
                          IPA: /{spot.ipa}/
                        </span>
                        <h4 className="font-plex-mono text-lead font-extrabold text-foreground" dir="ltr">
                          {spot.sound_de}
                        </h4>
                      </div>

                      <p className="font-tajawal text-mini text-muted-foreground font-medium">
                        {spot.arabic_equivalent_ar}
                      </p>

                      <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 space-y-1">
                        <span className="block font-tajawal text-micro font-bold text-cyan-400">💡 طريقة التشكيل الفموي</span>
                        <p className="font-tajawal text-mini text-foreground/90 leading-relaxed">
                          {spot.guide_ar}
                        </p>
                      </div>

                      <div className="p-2.5 bg-secondary/30 rounded-lg flex justify-between items-center" dir="ltr">
                        <span className="font-plex-mono text-meta font-extrabold text-foreground">{spot.example_de}</span>
                        <span className="font-tajawal text-mini text-muted-foreground">مثال: {spot.example_ar}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>
    </PageShell>
  );
};

export default GermanHome;
