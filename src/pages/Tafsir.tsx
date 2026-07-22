import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Search, ChevronDown, ArrowRight, Loader2, BookMarked, X, Copy, Check, Minus, Plus, Bookmark, BookmarkCheck, ChevronUp } from '@/lib/icons';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';

// ─── DATA ────────────────────────────────────────────────────────────────────

const SURAHS = [
  'الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس',
  'هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه',
  'الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم',
  'لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر',
  'فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق',
  'الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة',
  'الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج',
  'نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس',
  'التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد',
  'الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات',
  'القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر',
  'المسد','الإخلاص','الفلق','الناس',
];

const AYAH_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,
  29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,
  11,8,3,9,5,4,7,3,6,3,5,4,5,6,
];

const TAFSIRS = [
  { id: 'ar.muyassar',    name: 'التفسير الميسر' },
  { id: 'ar.jalalayn',    name: 'تفسير الجلالين' },
  { id: 'ar.ibn-katheer', name: 'تفسير ابن كثير' },
  { id: 'ar.qurtubi',     name: 'تفسير القرطبي' },
  { id: 'ar.tabari',      name: 'تفسير الطبري' },
  { id: 'ar.baghawi',     name: 'تفسير البغوي' },
  { id: 'ar.saddi',       name: 'تفسير السعدي' },
  { id: 'ar.waseet',      name: 'تفسير الوسيط' },
];

interface AyahData { number: number; text: string; numberInSurah: number; }
interface LastPosition { surah: number; ayah: number | null; tafsirId: string; }

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tafsir-state';
function loadState(): LastPosition | null {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveState(pos: LastPosition) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
}

const BOOKMARKS_KEY = 'tafsir-bookmarks';
function loadBookmarks(): string[] {
  try { const s = localStorage.getItem(BOOKMARKS_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveBookmarks(b: string[]) {
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(b)); } catch {}
}

// ─── ANIMATIONS ──────────────────────────────────────────────────────────────

const container = { hidden: {}, show: { transition: { staggerChildren: 0.012 } } };
const itemAnim = { hidden: { opacity: 0, y: 5 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const } } };



// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function TafsirPage() {
  const { t } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Load initial states from URL params, falling back to localStorage
  const urlSurah = searchParams.get('surah');
  const urlAyah = searchParams.get('ayah');
  const urlTafsir = searchParams.get('tafsir');

  const savedPos = useMemo(() => loadState(), []);

  const initialSurah = useMemo(() => {
    if (urlSurah !== null) {
      const parsed = parseInt(urlSurah, 10);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed < SURAHS.length) return parsed;
    }
    return savedPos?.surah ?? null;
  }, [urlSurah, savedPos]);

  const initialAyah = useMemo(() => {
    if (urlAyah !== null) {
      const parsed = parseInt(urlAyah, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return savedPos?.ayah ?? null;
  }, [urlAyah, savedPos]);

  const initialTafsir = useMemo(() => {
    if (urlTafsir !== null) {
      const found = TAFSIRS.find(t => t.id === urlTafsir);
      if (found) return found;
    }
    return TAFSIRS.find(t => t.id === savedPos?.tafsirId) || TAFSIRS[0];
  }, [urlTafsir, savedPos]);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedSurah, setSelectedSurah] = useState<number | null>(initialSurah);
  const [showSurahPicker, setShowSurahPicker] = useState(initialSurah === null);
  const [ayahs, setAyahs] = useState<AyahData[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<number | null>(initialAyah);
  const [tafsirText, setTafsirText] = useState('');
  const [loadingTafsir, setLoadingTafsir] = useState(false);
  const [selectedTafsir, setSelectedTafsir] = useState(initialTafsir);
  const [showTafsirPicker, setShowTafsirPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [ayahSearch, setAyahSearch] = useState('');
  const [localAyahSearch, setLocalAyahSearch] = useState('');
  const [fontSize, setFontSize] = useState(15);

  // Debounce search query updates
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearchQuery]);

  // Debounce ayah search updates
  useEffect(() => {
    const handler = setTimeout(() => {
      setAyahSearch(localAyahSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [localAyahSearch]);
  const [copied, setCopied] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarks);
  const [readCount, setReadCount] = useState(0);
  const tafsirRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ─── Persist position and Sync with URL Search Params ───────────────────────
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (selectedSurah !== null) {
      saveState({ surah: selectedSurah, ayah: selectedAyah, tafsirId: selectedTafsir.id });
      nextParams.set('surah', String(selectedSurah));
      if (selectedAyah !== null) {
        nextParams.set('ayah', String(selectedAyah));
      } else {
        nextParams.delete('ayah');
      }
      nextParams.set('tafsir', selectedTafsir.id);
    } else {
      nextParams.delete('surah');
      nextParams.delete('ayah');
      nextParams.delete('tafsir');
    }
    setSearchParams(nextParams, { replace: true });
  }, [selectedSurah, selectedAyah, selectedTafsir, setSearchParams]);

  // ─── Fetch Ayahs ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedSurah === null) return;
    const controller = new AbortController();
    setLoadingAyahs(true);
    setAyahs([]);
    if (!savedPos?.ayah) { setSelectedAyah(null); setTafsirText(''); }

    fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah + 1}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.code === 200 && data.data?.ayahs) {
          setAyahs(data.data.ayahs.map((a: any) => ({ number: a.number, text: a.text, numberInSurah: a.numberInSurah })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAyahs(false));
    return () => controller.abort();
  }, [selectedSurah]);

  // ─── Fetch Tafsir (Arabic only) ────────────────────────────────────────────
  const fetchTafsir = useCallback(async (surahIdx: number, ayahNum: number, tafsirId: string, signal: AbortSignal) => {
    const key = `${surahIdx + 1}:${ayahNum}`;
    const url = `https://api.alquran.cloud/v1/ayah/${key}/${tafsirId}`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    if (data.code === 200 && data.data?.text) return data.data.text;
    // Fallback
    const fb = await fetch(`https://api.alquran.cloud/v1/ayah/${key}/ar.muyassar`, { signal });
    const fbd = await fb.json();
    if (fbd.code === 200 && fbd.data?.text) return fbd.data.text;
    return null;
  }, []);

  useEffect(() => {
    if (selectedSurah === null || selectedAyah === null) return;
    const controller = new AbortController();
    setLoadingTafsir(true);
    setTafsirText('');
    setReadCount(c => c + 1);

    fetchTafsir(selectedSurah, selectedAyah, selectedTafsir.id, controller.signal)
      .then(text => setTafsirText(text ? text.replace(/<[^>]*>/g, '') : 'لم يتوفر التفسير لهذه الآية'))
      .catch(err => { if (err.name !== 'AbortError') setTafsirText('تعذر تحميل التفسير'); })
      .finally(() => setLoadingTafsir(false));

    setTimeout(() => tafsirRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 350);
    return () => controller.abort();
  }, [selectedAyah, selectedTafsir, selectedSurah, fetchTafsir]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const filteredSurahs = useMemo(() =>
    SURAHS.map((name, i) => ({ name, index: i })).filter(s =>
      searchQuery ? s.name.includes(searchQuery) || String(s.index + 1).includes(searchQuery) : true
    ), [searchQuery]);

  const filteredAyahs = useMemo(() =>
    ayahSearch ? ayahs.filter(a => a.text.includes(ayahSearch) || String(a.numberInSurah) === ayahSearch) : ayahs
  , [ayahs, ayahSearch]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); });
  };

  const toggleBookmark = (key: string) => {
    setBookmarks(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      saveBookmarks(next);
      return next;
    });
  };

  const goToNextAyah = () => {
    if (selectedSurah === null || selectedAyah === null) return;
    if (selectedAyah < AYAH_COUNTS[selectedSurah]) setSelectedAyah(selectedAyah + 1);
  };
  const goToPrevAyah = () => {
    if (selectedAyah !== null && selectedAyah > 1) setSelectedAyah(selectedAyah - 1);
  };



  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <SEO title="التفسير — SmartHub" description="تفسير القرآن الكريم باللغة العربية: استكشف معاني الآيات والسور مع تفسير ميسر وشامل لكل أجزاء المصحف الشريف." path="/tafsir" />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <BackButton />
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            {t('tafsir.title')}
          </h1>
          {/* Font size controls */}
          <div className="flex items-center gap-1">
            <button aria-label="تصغير حجم الخط" onClick={() => setFontSize(s => Math.max(12, s - 1))} className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center"><Minus className="w-3 h-3 text-muted-foreground" /></button>
            <span className="text-[10px] text-muted-foreground w-5 text-center">{fontSize}</span>
            <button aria-label="تكبير حجم الخط" onClick={() => setFontSize(s => Math.min(24, s + 1))} className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center"><Plus className="w-3 h-3 text-muted-foreground" /></button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Stats bar */}
        {selectedSurah !== null && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 text-[11px] text-muted-foreground">
            <span>{SURAHS[selectedSurah]} — {AYAH_COUNTS[selectedSurah]} آية</span>
            <span>{readCount} آية مقروءة</span>
          </div>
        )}

        {/* Breadcrumb */}
        {selectedSurah !== null && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setSelectedSurah(null); setShowSurahPicker(true); setAyahs([]); setSelectedAyah(null); setTafsirText(''); setAyahSearch(''); setLocalAyahSearch(''); }} className="text-xs font-medium text-primary hover:underline">
              {t('tafsir.allSurahs')}
            </button>
            <ArrowRight className="w-3 h-3 text-muted-foreground rotate-180" />
            <span className="text-xs font-bold text-foreground">{SURAHS[selectedSurah]} ({selectedSurah + 1})</span>
            {selectedAyah !== null && (
              <>
                <ArrowRight className="w-3 h-3 text-muted-foreground rotate-180" />
                <span className="text-xs font-bold text-primary">{t('tafsir.ayah')} {selectedAyah}</span>
              </>
            )}
          </motion.div>
        )}

        {/* Tafsir source picker */}
        {selectedSurah !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
            <button onClick={() => setShowTafsirPicker(!showTafsirPicker)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border/50 hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{selectedTafsir.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showTafsirPicker ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showTafsirPicker && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-1 rounded-xl bg-card border border-border/50 absolute left-0 right-0 z-20 overflow-hidden">
                  {TAFSIRS.map(tf => (
                    <button key={tf.id} onClick={() => { setSelectedTafsir(tf); setShowTafsirPicker(false); }} className={`w-full text-right px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/30 ${tf.id === selectedTafsir.id ? 'text-primary bg-primary/5' : 'text-foreground'}`}>
                      {tf.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Ayah search (within surah) */}
        {selectedSurah !== null && !showSurahPicker && ayahs.length > 0 && (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={localAyahSearch} onChange={e => setLocalAyahSearch(e.target.value)} placeholder="ابحث في آيات السورة..." className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {localAyahSearch && <button aria-label="مسح البحث" onClick={() => { setLocalAyahSearch(''); setAyahSearch(''); }} className="absolute left-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
        )}

        {/* Surah Picker */}
        <AnimatePresence mode="wait">
          {showSurahPicker && (
            <motion.div key="surah-picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={localSearchQuery} onChange={e => setLocalSearchQuery(e.target.value)} placeholder="ابحث عن سورة..." className="w-full pr-10 pl-4 py-3 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                {localSearchQuery && <button aria-label="مسح البحث" onClick={() => { setLocalSearchQuery(''); setSearchQuery(''); }} className="absolute left-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
              </div>
              <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-2">
                {filteredSurahs.map(({ name, index }) => {
                  const hasBookmark = bookmarks.some(b => b.startsWith(`${index}:`));
                  return (
                    <motion.button key={index} variants={itemAnim} onClick={() => { setSelectedSurah(index); setShowSurahPicker(false); }} className={`relative flex flex-col items-center gap-1 px-2 py-3.5 rounded-xl border transition-all group ${hasBookmark ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/50 hover:bg-accent/40 hover:border-primary/30'}`}>
                      <span className="absolute top-1.5 left-2 text-[10px] text-muted-foreground/60 font-mono">{index + 1}</span>
                      {hasBookmark && <BookmarkCheck className="absolute top-1.5 right-1.5 w-3 h-3 text-primary" />}
                      <span className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">{name}</span>
                      <span className="text-[10px] text-muted-foreground">{AYAH_COUNTS[index]} آية</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* Ayah list + inline tafsir */}
        <AnimatePresence mode="wait">
          {selectedSurah !== null && !showSurahPicker && (
            <motion.div key="ayah-list" ref={listRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {loadingAyahs ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : filteredAyahs.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">لا توجد نتائج</div>
              ) : (
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                  {filteredAyahs.map(ayah => {
                    const isSelected = selectedAyah === ayah.numberInSurah;
                    const bookmarkKey = `${selectedSurah}:${ayah.numberInSurah}`;
                    const isBookmarked = bookmarks.includes(bookmarkKey);
                    return (
                      <div key={ayah.number}>
                        {/* Ayah card */}
                        <motion.button
                          variants={itemAnim}
                          onClick={() => setSelectedAyah(isSelected ? null : ayah.numberInSurah)}
                          className={`w-full text-right px-4 py-4 border transition-all ${isSelected ? 'bg-primary/8 border-primary/30 rounded-t-xl rounded-b-none' : 'bg-card border-border/50 hover:bg-accent/30 hover:border-primary/20 rounded-xl'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary/20' : 'bg-muted/50'}`}>
                              <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>{ayah.numberInSurah}</span>
                            </div>
                            <p className="flex-1 font-medium text-foreground leading-[2.2] font-[Amiri,serif]" style={{ fontSize: `${fontSize}px` }}>{ayah.text}</p>
                          </div>
                        </motion.button>

                        {/* Inline Tafsir */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div ref={tafsirRef} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                              <div className="rounded-b-xl border border-t-0 border-primary/30 ">
                                {/* Toolbar */}
                                <div className="px-3 py-2 flex items-center gap-1.5 border-b border-primary/10 flex-wrap">
                                  <BookMarked className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="text-[11px] font-bold text-primary flex-1">{selectedTafsir.name}</span>
                                  {/* Bookmark */}
                                  <button onClick={(e) => { e.stopPropagation(); toggleBookmark(bookmarkKey); }} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isBookmarked ? 'bg-primary/15' : 'bg-muted/40 hover:bg-muted/60'}`}>
                                    {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5 text-primary" /> : <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />}
                                  </button>
                                  {/* Copy ayah */}
                                  <button onClick={(e) => { e.stopPropagation(); copyText(ayah.text, `ayah-${ayah.number}`); }} className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted/60 flex items-center justify-center transition-colors">
                                    {copied === `ayah-${ayah.number}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                                  </button>
                                  {/* Copy tafsir */}
                                  <button onClick={(e) => { e.stopPropagation(); copyText(`${ayah.text}\n\n${selectedTafsir.name}:\n${tafsirText}`, `tafsir-${ayah.number}`); }} className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted/60 flex items-center justify-center transition-colors" title="نسخ الآية والتفسير">
                                    {copied === `tafsir-${ayah.number}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />}
                                  </button>
                                  {/* Navigate prev/next */}
                                  <button onClick={(e) => { e.stopPropagation(); goToPrevAyah(); }} disabled={selectedAyah === 1} className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted/60 flex items-center justify-center transition-colors disabled:opacity-30">
                                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); goToNextAyah(); }} disabled={selectedAyah === AYAH_COUNTS[selectedSurah!]} className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted/60 flex items-center justify-center transition-colors disabled:opacity-30">
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                  </button>
                                </div>
                                {/* Tafsir body */}
                                <div className="px-4 py-4">
                                  {loadingTafsir ? (
                                    <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
                                  ) : (
                                    <p className="text-foreground/90 leading-[2.1] whitespace-pre-wrap" style={{ fontSize: `${fontSize - 2}px` }} dir="rtl" lang="ar">{tafsirText}</p>
                                  )}
                                </div>
                                <div className="px-4 py-2 border-t border-border/20">
                                  <p className="text-[10px] text-muted-foreground/70 text-center">المصدر: alquran.cloud — {SURAHS[selectedSurah!]} : {selectedAyah}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
