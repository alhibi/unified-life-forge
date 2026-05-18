import React, { useState, useMemo } from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { poetryEras, Era, Poet, Poem } from '@/data/poetryData';
import { poetTimelines } from '@/data/poetTimelines';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, X, BookOpen, Feather, ScrollText,
  Copy, Check, ClipboardCopy, Flame, Star, Landmark, Castle,
  Swords, Building2, Network, Clock, BookMarked,
} from 'lucide-react';
import BackButton from '@/components/BackButton';
import { notify } from '@/lib/notify';
import LiteraryGraph from '@/components/diwan/LiteraryGraph';
import PoetTimeline from '@/components/diwan/PoetTimeline';
import PoemContextCard from '@/components/diwan/PoemContextCard';

type View = 'eras' | 'poets' | 'poet';
type Tab = 'browse' | 'graph';

export default function DiwanPage() {
  const { t, dir } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [view, setView] = useState<View>('eras');
  const [selectedEra, setSelectedEra] = useState<Era | null>(null);
  const [selectedPoet, setSelectedPoet] = useState<Poet | null>(null);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [copiedVerse, setCopiedVerse] = useState<number | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [graphInitialPoet, setGraphInitialPoet] = useState<string | undefined>();

  // Check if current poet has timeline data
  const hasTimeline = useMemo(() => {
    return selectedPoet ? !!poetTimelines[selectedPoet.id] : false;
  }, [selectedPoet]);

  const copyVerse = (verse: string, index: number) => {
    navigator.clipboard.writeText(verse);
    setCopiedVerse(index);
    notify.copied();
    setTimeout(() => setCopiedVerse(null), 1500);
  };

  const copyAllPoem = () => {
    if (!selectedPoem) return;
    const text = `${selectedPoem.title}\n${selectedPoet?.name}\n\n${selectedPoem.verses.join('\n')}`;
    navigator.clipboard.writeText(text);
    notify.copied();
  };

  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const eraIcons: Record<string, React.ElementType> = {
    jahili: Flame,
    mukhadram: Swords,
    islami: Star,
    umawi: Landmark,
    abbasi: Castle,
    andalusi: Building2,
  };

  const goBack = () => {
    if (selectedPoem) {
      setSelectedPoem(null);
    } else if (view === 'poet') {
      setShowTimeline(false);
      setView('poets');
      setSelectedPoet(null);
    } else if (view === 'poets') {
      setView('eras');
      setSelectedEra(null);
    }
  };

  // Navigate from graph to poet detail
  const handleGraphSelectPoet = (poetId: string) => {
    // Find the poet across all eras
    for (const era of poetryEras) {
      const poet = era.poets.find(p => p.id === poetId);
      if (poet) {
        setSelectedEra(era);
        setSelectedPoet(poet);
        setView('poet');
        setActiveTab('browse');
        setShowTimeline(false);
        return;
      }
    }
  };

  // Navigate to graph focused on a poet
  const handleShowInGraph = (poetId: string) => {
    setGraphInitialPoet(poetId);
    setActiveTab('graph');
  };

  const pageVariants = {
    initial: { opacity: 0, x: dir === 'rtl' ? -20 : 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, x: dir === 'rtl' ? 20 : -20, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO title="الديوان — الشعر العربي الكلاسيكي — SmartHub" description="تصفح الشعر العربي عبر العصور الجاهلية، الأموية، العباسية والأندلسية بخط أميري أنيق." path="/diwan" />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {activeTab === 'browse' && view !== 'eras' && (
            <BackButton onClick={goBack} />
          )}
          <div className="flex-1">
            <h1 className="text-[22px] font-bold tracking-tight text-foreground flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              ديوان الشعر
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {activeTab === 'graph' && 'الشجرة الأدبية — علاقات الشعراء'}
              {activeTab === 'browse' && view === 'eras' && 'اختر العصر الأدبي'}
              {activeTab === 'browse' && view === 'poets' && selectedEra?.nameAr}
              {activeTab === 'browse' && view === 'poet' && selectedPoet?.name}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-5 p-1 rounded-xl bg-muted/40 border border-border/30">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
              activeTab === 'browse'
                ? 'bg-card text-foreground shadow-sm border border-border/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            تصفّح القصائد
          </button>
          <button
            onClick={() => { setActiveTab('graph'); setGraphInitialPoet(undefined); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
              activeTab === 'graph'
                ? 'bg-card text-foreground shadow-sm border border-border/30'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            الشجرة الأدبية
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* GRAPH TAB */}
        {/* ══════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {activeTab === 'graph' && (
            <motion.div
              key="graph-tab"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <LiteraryGraph
                onSelectPoet={handleGraphSelectPoet}
                initialPoetId={graphInitialPoet}
              />
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* BROWSE TAB */}
          {/* ══════════════════════════════════════════════════════════ */}
          {activeTab === 'browse' && (
            <motion.div
              key="browse-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatePresence mode="wait">
                {/* ─── Eras List ─── */}
                {view === 'eras' && (
                  <motion.div key="eras" {...pageVariants} className="space-y-3">
                    {poetryEras.map((era, i) => (
                      <motion.button
                        key={era.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}
                        onClick={() => { setSelectedEra(era); setView('poets'); }}
                        className="w-full rounded-2xl bg-card border border-border/40 p-4 flex items-center justify-between active:scale-[0.98] transition-transform text-start"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            {React.createElement(eraIcons[era.id] || BookOpen, { className: 'w-5 h-5 text-primary' })}
                          </div>
                          <div>
                            <p className="font-semibold text-[15px] text-foreground">{era.nameAr}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{era.period} · {era.poets.length} شعراء</p>
                          </div>
                        </div>
                        <Chevron className="w-4 h-4 text-muted-foreground" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* ─── Poets List ─── */}
                {view === 'poets' && selectedEra && (
                  <motion.div key="poets" {...pageVariants} className="space-y-3">
                    {selectedEra.poets.map((poet, i) => (
                      <motion.button
                        key={poet.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}
                        onClick={() => { setSelectedPoet(poet); setView('poet'); setShowTimeline(false); }}
                        className="w-full rounded-2xl bg-card border border-border/40 p-4 flex items-center justify-between active:scale-[0.98] transition-transform text-start"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent/50 flex items-center justify-center">
                            <Feather className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-[15px] text-foreground">{poet.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{poet.bio}</p>
                          </div>
                        </div>
                        <Chevron className="w-4 h-4 text-muted-foreground" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* ─── Poet Detail ─── */}
                {view === 'poet' && selectedPoet && (
                  <motion.div key="poet" {...pageVariants} className="space-y-4">
                    {/* Bio Card */}
                    <div className="rounded-2xl bg-card border border-border/40 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Feather className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="font-bold text-[17px] text-foreground">{selectedPoet.name}</h2>
                          <p className="text-[11px] text-muted-foreground">{selectedEra?.nameAr}</p>
                        </div>
                      </div>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{selectedPoet.bio}</p>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                        {hasTimeline && (
                          <button
                            onClick={() => setShowTimeline(!showTimeline)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                              showTimeline
                                ? 'bg-primary/15 text-primary'
                                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            السيرة الزمنية
                          </button>
                        )}
                        <button
                          onClick={() => handleShowInGraph(selectedPoet.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
                        >
                          <Network className="w-3.5 h-3.5" />
                          علاقاته الأدبية
                        </button>
                      </div>
                    </div>

                    {/* Timeline (conditionally shown) */}
                    <AnimatePresence>
                      {showTimeline && hasTimeline && selectedPoet && (
                        <PoetTimeline
                          poetId={selectedPoet.id}
                          poetName={selectedPoet.name}
                          onClose={() => setShowTimeline(false)}
                        />
                      )}
                    </AnimatePresence>

                    {/* Poems */}
                    {selectedPoet.poems.map((poem, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 + 0.1 } }}
                        onClick={() => setSelectedPoem(poem)}
                        className="w-full rounded-2xl bg-card border border-border/40 p-4 text-start active:scale-[0.98] transition-transform"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <ScrollText className="w-4 h-4 text-primary" />
                          <p className="font-semibold text-[14px] text-foreground">{poem.title}</p>
                        </div>
                        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 font-amiri" style={{ fontFamily: "'Amiri', serif" }}>
                          {poem.verses[0]}
                        </p>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* POEM MODAL */}
        {/* ══════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {selectedPoem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-5"
              onClick={() => setSelectedPoem(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl bg-card border border-border/40 p-5"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-[16px] text-foreground">{selectedPoem.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedPoem(null)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] text-muted-foreground">{selectedPoet?.name} — {selectedEra?.nameAr}</p>
                  <button
                    onClick={copyAllPoem}
                    className="flex items-center gap-1 text-[11px] text-primary font-medium px-2.5 py-1 rounded-lg bg-primary/10 active:bg-primary/20 transition-colors"
                  >
                    <ClipboardCopy className="w-3.5 h-3.5" />
                    نسخ الكل
                  </button>
                </div>

                {/* Historical Context Card */}
                {selectedPoet && (
                  <PoemContextCard
                    poemTitle={selectedPoem.title}
                    poetId={selectedPoet.id}
                  />
                )}

                {/* Verses */}
                <div className="space-y-1">
                  {selectedPoem.verses.map((verse, i) => (
                    <button
                      key={i}
                      onClick={() => copyVerse(verse, i)}
                      className="w-full group relative py-2 px-3 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors text-center"
                    >
                      <p
                        className="text-[15px] text-foreground leading-[2]"
                        style={{ fontFamily: "'Amiri', serif" }}
                      >
                        {verse}
                      </p>
                      <span className={`absolute top-1/2 -translate-y-1/2 start-1 opacity-0 group-hover:opacity-100 transition-opacity ${copiedVerse === i ? 'opacity-100' : ''}`}>
                        {copiedVerse === i
                          ? <Check className="w-3.5 h-3.5 text-green-500" />
                          : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
