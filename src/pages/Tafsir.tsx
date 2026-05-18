import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, ChevronDown, ArrowRight, Loader2, BookMarked, X } from 'lucide-react';
import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';

// 114 Surah names in Arabic
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

// Ayah counts per surah
const AYAH_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,
  29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,
  11,8,3,9,5,4,7,3,6,3,5,4,5,6,
];

// Available tafsirs
const TAFSIRS = [
  { id: 1, name: 'تفسير ابن كثير', slug: 'ar-tafsir-ibn-kathir' },
  { id: 2, name: 'التفسير الميسر', slug: 'ar-tafseer-muyassar' },
  { id: 3, name: 'تفسير الجلالين', slug: 'ar-tafsir-al-jalalayn' },
  { id: 4, name: 'تفسير السعدي', slug: 'ar-tafsir-al-saadi' },
  { id: 5, name: 'تفسير البغوي', slug: 'ar-tafsir-al-baghawi' },
];

interface AyahData {
  number: number;
  text: string;
  numberInSurah: number;
}

interface TafsirText {
  text: string;
  resource_name?: string;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.02 } } };
const itemAnim = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function TafsirPage() {
  const { t, language } = useApp();
  const isAr = language === 'ar';

  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [showSurahPicker, setShowSurahPicker] = useState(true);
  const [ayahs, setAyahs] = useState<AyahData[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const [tafsirText, setTafsirText] = useState<string>('');
  const [loadingTafsir, setLoadingTafsir] = useState(false);
  const [selectedTafsir, setSelectedTafsir] = useState(TAFSIRS[0]);
  const [showTafsirPicker, setShowTafsirPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const tafsirRef = useRef<HTMLDivElement>(null);

  // Fetch ayahs when surah is selected
  useEffect(() => {
    if (selectedSurah === null) return;
    setLoadingAyahs(true);
    setAyahs([]);
    setSelectedAyah(null);
    setTafsirText('');

    fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah + 1}`)
      .then(r => r.json())
      .then(data => {
        if (data.code === 200 && data.data?.ayahs) {
          setAyahs(data.data.ayahs.map((a: any) => ({
            number: a.number,
            text: a.text,
            numberInSurah: a.numberInSurah,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAyahs(false));
  }, [selectedSurah]);

  // Fetch tafsir when ayah is selected
  useEffect(() => {
    if (selectedSurah === null || selectedAyah === null) return;
    setLoadingTafsir(true);
    setTafsirText('');

    const surahNum = selectedSurah + 1;
    const ayahNum = selectedAyah;

    // Use quran.com API v4 for tafsir
    fetch(`https://api.quran.com/api/v4/tafsirs/${selectedTafsir.slug}/by_ayah/${surahNum}:${ayahNum}`)
      .then(r => r.json())
      .then(data => {
        if (data.tafsir?.text) {
          // Strip HTML tags for clean display
          const clean = data.tafsir.text.replace(/<[^>]*>/g, '');
          setTafsirText(clean);
        } else {
          setTafsirText(isAr ? 'لم يتوفر التفسير لهذه الآية' : 'Tafsir not available for this ayah');
        }
      })
      .catch(() => {
        setTafsirText(isAr ? 'تعذر تحميل التفسير، تحقق من اتصال الإنترنت' : 'Failed to load tafsir');
      })
      .finally(() => setLoadingTafsir(false));

    // Scroll to tafsir section
    setTimeout(() => {
      tafsirRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }, [selectedAyah, selectedTafsir, selectedSurah, isAr]);

  const filteredSurahs = SURAHS.map((name, i) => ({ name, index: i })).filter(s =>
    searchQuery ? s.name.includes(searchQuery) || String(s.index + 1).includes(searchQuery) : true
  );

  const handleSurahSelect = (index: number) => {
    setSelectedSurah(index);
    setShowSurahPicker(false);
  };

  const handleBack = () => {
    if (selectedAyah !== null) {
      setSelectedAyah(null);
      setTafsirText('');
    } else if (selectedSurah !== null) {
      setSelectedSurah(null);
      setShowSurahPicker(true);
      setAyahs([]);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <SEO
        title={isAr ? 'التفسير — SmartHub' : 'Tafsir — SmartHub'}
        description={isAr ? 'تفسير القرآن الكريم — ابحث في سور القرآن واقرأ التفسير' : 'Quran Tafsir — Browse surahs and read scholarly commentary'}
        path="/tafsir"
      />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <BackButton />
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-primary" />
            {t('tafsir.title')}
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Surah & Ayah breadcrumb */}
        {selectedSurah !== null && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <button
              onClick={() => { setSelectedSurah(null); setShowSurahPicker(true); setAyahs([]); setSelectedAyah(null); setTafsirText(''); }}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('tafsir.allSurahs')}
            </button>
            <ArrowRight className="w-3 h-3 text-muted-foreground rotate-180" />
            <span className="text-xs font-bold text-foreground">
              {SURAHS[selectedSurah]} ({selectedSurah + 1})
            </span>
            {selectedAyah !== null && (
              <>
                <ArrowRight className="w-3 h-3 text-muted-foreground rotate-180" />
                <span className="text-xs font-bold text-primary">
                  {t('tafsir.ayah')} {selectedAyah}
                </span>
              </>
            )}
          </motion.div>
        )}

        {/* Tafsir source picker */}
        {selectedSurah !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
            <button
              onClick={() => setShowTafsirPicker(!showTafsirPicker)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border/50 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{selectedTafsir.name}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showTafsirPicker ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showTafsirPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-1 rounded-xl bg-card border border-border/50 shadow-lg"
                >
                  {TAFSIRS.map(tf => (
                    <button
                      key={tf.id}
                      onClick={() => { setSelectedTafsir(tf); setShowTafsirPicker(false); }}
                      className={`w-full text-right px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/30 ${
                        tf.id === selectedTafsir.id ? 'text-primary bg-primary/5' : 'text-foreground'
                      }`}
                    >
                      {tf.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Surah Picker */}
        <AnimatePresence mode="wait">
          {showSurahPicker && (
            <motion.div
              key="surah-picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'ابحث عن سورة...' : 'Search surah...'}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Surah grid */}
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-3 gap-2"
              >
                {filteredSurahs.map(({ name, index }) => (
                  <motion.button
                    key={index}
                    variants={itemAnim}
                    onClick={() => handleSurahSelect(index)}
                    className="relative flex flex-col items-center gap-1 px-2 py-3.5 rounded-xl bg-card border border-border/50 hover:bg-accent/40 hover:border-primary/30 transition-all group"
                  >
                    <span className="absolute top-1.5 left-2 text-[10px] text-muted-foreground/60 font-mono">
                      {index + 1}
                    </span>
                    <span className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">
                      {name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {AYAH_COUNTS[index]} {isAr ? 'آية' : 'Ayahs'}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ayah list */}
        <AnimatePresence mode="wait">
          {selectedSurah !== null && !showSurahPicker && (
            <motion.div
              key="ayah-list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {loadingAyahs ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : (
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                  {ayahs.map(ayah => (
                    <motion.button
                      key={ayah.number}
                      variants={itemAnim}
                      onClick={() => setSelectedAyah(ayah.numberInSurah)}
                      className={`w-full text-right px-4 py-4 rounded-xl border transition-all ${
                        selectedAyah === ayah.numberInSurah
                          ? 'bg-primary/10 border-primary/40 shadow-sm'
                          : 'bg-card border-border/50 hover:bg-accent/30 hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          selectedAyah === ayah.numberInSurah ? 'bg-primary/20' : 'bg-muted/50'
                        }`}>
                          <span className={`text-xs font-bold ${
                            selectedAyah === ayah.numberInSurah ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                            {ayah.numberInSurah}
                          </span>
                        </div>
                        <p className="flex-1 text-[15px] font-medium text-foreground leading-[2.2] font-[Amiri,serif]">
                          {ayah.text}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tafsir display */}
        <AnimatePresence>
          {(selectedAyah !== null && selectedSurah !== null) && (
            <motion.div
              ref={tafsirRef}
              key="tafsir-content"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-card border border-primary/20 shadow-lg overflow-hidden"
            >
              {/* Tafsir header */}
              <div className="px-4 py-3 bg-primary/5 border-b border-primary/10 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">
                  {selectedTafsir.name}
                </span>
                <span className="text-xs text-muted-foreground mr-auto">
                  — {SURAHS[selectedSurah]} : {selectedAyah}
                </span>
              </div>

              {/* Tafsir body */}
              <div className="px-4 py-4">
                {loadingTafsir ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-[2] whitespace-pre-wrap">
                    {tafsirText}
                  </p>
                )}
              </div>

              {/* Source attribution */}
              <div className="px-4 py-2 border-t border-border/30 bg-muted/20">
                <p className="text-[10px] text-muted-foreground text-center">
                  {isAr ? 'المصدر: مركز تفسير للدراسات القرآنية — quran.com API' : 'Source: Tafsir Center — quran.com API'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
