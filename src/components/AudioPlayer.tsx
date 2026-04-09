import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Play, Pause, SkipBack, SkipForward, Music, FolderOpen, Volume2, List, BookOpenText, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAudioFiles, saveCurrentIndex, loadAudioFiles } from '@/utils/audioStorage';

interface AudioFile { name: string; url: string }

interface Reciter {
  id: string;
  name: string;
  nameEn: string;
  surahs: { id: number; name: string; url: string }[];
}

const reciters: Reciter[] = [
  {
    id: 'ajmi',
    name: 'أحمد العجمي',
    nameEn: 'Ahmad Al-Ajmi',
    surahs: [
      { id: 1, name: 'سورة الفاتحة', url: 'https://server10.mp3quran.net/ajm/001.mp3' },
      { id: 2, name: 'سورة البقرة', url: 'https://server10.mp3quran.net/ajm/002.mp3' },
    ],
  },
];
type Tab = 'quran' | 'local';

export default function AudioPlayer() {
  const { t, language } = useApp();
  const isAr = language === 'ar';

  const [tab, setTab] = useState<Tab>('quran');

  // Quran state
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [quranPlaying, setQuranPlaying] = useState<{ reciterId: string; surahId: number } | null>(null);
  const [quranIsPlaying, setQuranIsPlaying] = useState(false);
  const [quranProgress, setQuranProgress] = useState(0);
  const [quranDuration, setQuranDuration] = useState(0);
  const [quranCurrentTime, setQuranCurrentTime] = useState(0);
  const quranAudioRef = useRef<HTMLAudioElement>(null);

  // Local files state
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved files from IndexedDB on mount
  useEffect(() => {
    loadAudioFiles().then(data => {
      if (data && data.files.length > 0) {
        setFiles(data.files);
        setCurrentIndex(data.currentIndex);
      }
      setLoaded(true);
    });
  }, []);

  // === Quran functions ===
  const playQuranSurah = (reciter: Reciter, surah: { id: number; name: string; url: string }) => {
    if (quranAudioRef.current) {
      // Pause local player if playing
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      quranAudioRef.current.src = surah.url;
      quranAudioRef.current.play();
      setQuranPlaying({ reciterId: reciter.id, surahId: surah.id });
      setQuranIsPlaying(true);
    }
  };

  const toggleQuranPlay = () => {
    if (!quranAudioRef.current || !quranPlaying) return;
    if (quranIsPlaying) quranAudioRef.current.pause();
    else quranAudioRef.current.play();
    setQuranIsPlaying(!quranIsPlaying);
  };

  const onQuranTimeUpdate = () => {
    if (!quranAudioRef.current) return;
    setQuranCurrentTime(quranAudioRef.current.currentTime);
    const dur = quranAudioRef.current.duration || 0;
    setQuranDuration(dur);
    setQuranProgress(dur > 0 ? (quranAudioRef.current.currentTime / dur) * 100 : 0);
  };

  const seekQuran = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!quranAudioRef.current || !quranDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    quranAudioRef.current.currentTime = pct * quranDuration;
  };

  // === Local file functions ===
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const audioFiles = Array.from(selected).filter(f =>
      f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|wma)$/i.test(f.name)
    );
    const sorted = audioFiles.sort((a, b) => a.name.localeCompare(b.name));
    const newFiles: AudioFile[] = sorted.map(f => ({
      name: f.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(f),
    }));
    if (newFiles.length > 0) {
      setFiles(newFiles);
      setCurrentIndex(0);
      setShowPlaylist(true);
      await saveAudioFiles(sorted);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || files.length === 0) return;
    // Pause quran if playing
    if (quranAudioRef.current && quranIsPlaying) {
      quranAudioRef.current.pause();
      setQuranIsPlaying(false);
    }
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const skipNext = () => {
    if (files.length === 0) return;
    const next = (currentIndex + 1) % files.length;
    setCurrentIndex(next);
    setIsPlaying(true);
    saveCurrentIndex(next);
  };

  const skipPrev = () => {
    if (files.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prev = (currentIndex - 1 + files.length) % files.length;
    setCurrentIndex(prev);
    setIsPlaying(true);
    saveCurrentIndex(prev);
  };

  useEffect(() => {
    if (audioRef.current && files.length > 0) {
      audioRef.current.src = files[currentIndex].url;
      if (isPlaying) audioRef.current.play();
    }
  }, [currentIndex, files]);

  useEffect(() => {
    if (loaded && files.length > 0) {
      saveCurrentIndex(currentIndex);
    }
  }, [currentIndex, loaded]);

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    const dur = audioRef.current.duration || 0;
    setDuration(dur);
    setProgress(dur > 0 ? (audioRef.current.currentTime / dur) * 100 : 0);
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const currentFile = files[currentIndex];

  const getCurrentQuranSurahName = () => {
    if (!quranPlaying) return '';
    const reciter = reciters.find(r => r.id === quranPlaying.reciterId);
    const surah = reciter?.surahs.find(s => s.id === quranPlaying.surahId);
    return surah ? `${surah.name} - ${reciter?.name}` : '';
  };

  return (
    <div className="obsidian-card p-5">
      <audio ref={quranAudioRef} onTimeUpdate={onQuranTimeUpdate} onEnded={() => { setQuranIsPlaying(false); setQuranPlaying(null); }} />
      <audio ref={audioRef} onTimeUpdate={onTimeUpdate} onEnded={skipNext} />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        // @ts-ignore
        webkitdirectory=""
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl obsidian-icon flex items-center justify-center shrink-0">
          <Music className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] text-foreground">{t('audio.title')}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {quranPlaying ? getCurrentQuranSurahName() : currentFile ? currentFile.name : t('audio.noFile')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 obsidian-inset mb-4">
        <button
          onClick={() => setTab('quran')}
          className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
            tab === 'quran' ? 'obsidian-tab-active text-foreground' : 'obsidian-tab text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpenText className="w-3.5 h-3.5 inline-block me-1.5 -mt-0.5" />
          {isAr ? 'قرآن' : 'Quran'}
        </button>
        <button
          onClick={() => setTab('local')}
          className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
            tab === 'local' ? 'obsidian-tab-active text-foreground' : 'obsidian-tab text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5 inline-block me-1.5 -mt-0.5" />
          {isAr ? 'ملفاتي' : 'Meine Dateien'}
        </button>
      </div>

      {/* === Quran Tab === */}
      {tab === 'quran' && (
        <div>
          {!selectedReciter ? (
            /* Reciters List */
            <div className="space-y-1.5">
              {reciters.map(reciter => (
                <button
                  key={reciter.id}
                  onClick={() => setSelectedReciter(reciter)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors text-start"
                >
                  <div className="w-9 h-9 rounded-lg obsidian-icon flex items-center justify-center shrink-0">
                    <BookOpenText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{reciter.name}</div>
                    <div className="text-[11px] text-muted-foreground">{reciter.surahs.length} {isAr ? 'سور' : 'Suren'}</div>
                  </div>
                  <ChevronLeft className={`w-4 h-4 text-muted-foreground ${isAr ? '' : 'rotate-180'}`} />
                </button>
              ))}
            </div>
          ) : (
            /* Surah List for selected reciter */
            <div>
              <button
                onClick={() => setSelectedReciter(null)}
                className="flex items-center gap-2 text-sm text-primary mb-3 hover:underline"
              >
                <ChevronLeft className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
                {isAr ? 'رجوع للقراء' : 'Zurück'}
              </button>
              <div className="text-sm font-semibold text-foreground mb-3">{selectedReciter.name}</div>
              <div className="space-y-1.5">
                {selectedReciter.surahs.map(surah => {
                  const isCurrentSurah = quranPlaying?.reciterId === selectedReciter.id && quranPlaying?.surahId === surah.id;
                  return (
                    <button
                      key={surah.id}
                      onClick={() => {
                        if (isCurrentSurah) toggleQuranPlay();
                        else playQuranSurah(selectedReciter, surah);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-start ${
                        isCurrentSurah ? 'bg-primary/10' : 'hover:bg-secondary/60'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isCurrentSurah ? 'obsidian-btn' : 'obsidian-icon'
                      }`}>
                        {isCurrentSurah && quranIsPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ms-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${isCurrentSurah ? 'text-primary' : 'text-foreground'}`}>{surah.name}</div>
                      </div>
                      {isCurrentSurah && (
                        <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quran mini player */}
          {quranPlaying && (
            <div className="mt-4 pt-3 border-t border-border/30">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={toggleQuranPlay} className="w-10 h-10 rounded-full obsidian-btn flex items-center justify-center shrink-0">
                  {quranIsPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ms-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">{getCurrentQuranSurahName()}</div>
                </div>
              </div>
              <div className="h-1.5 bg-secondary rounded-full cursor-pointer overflow-hidden" onClick={seekQuran}>
                <div className="h-full bg-primary rounded-full transition-all duration-100" style={{ width: `${quranProgress}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(quranCurrentTime)}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(quranDuration)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Local Files Tab === */}
      {tab === 'local' && (
        <div>
          {files.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
            >
              <FolderOpen className="w-8 h-8" />
              <span className="text-sm font-medium">{t('audio.selectFolder')}</span>
              <span className="text-xs">{t('audio.selectHint')}</span>
            </button>
          )}

          {files.length > 0 && (
            <>
              {/* Now Playing */}
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-secondary/40">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {isPlaying ? (
                    <div className="flex items-end gap-0.5 h-4">
                      <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '60%' }} />
                      <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                      <div className="w-1 bg-primary rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.3s' }} />
                    </div>
                  ) : (
                    <Music className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{currentFile?.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{currentIndex + 1} / {files.length}</div>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-5">
                <div className="h-1.5 bg-secondary rounded-full cursor-pointer overflow-hidden" onClick={seekTo}>
                  <div className="h-full bg-primary rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(currentTime)}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button onClick={skipPrev} className="p-2 rounded-full hover:bg-secondary transition-colors">
                  <SkipBack className="w-5 h-5 text-foreground" />
                </button>
                <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ms-0.5" />}
                </button>
                <button onClick={skipNext} className="p-2 rounded-full hover:bg-secondary transition-colors">
                  <SkipForward className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Playlist toggle */}
              <div className="flex justify-center mt-3 gap-2">
                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                    showPlaylist ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="w-3.5 h-3.5 inline-block me-1 -mt-0.5" />
                  {isAr ? 'القائمة' : 'Liste'}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 inline-block me-1 -mt-0.5" />
                  {isAr ? 'تغيير المجلد' : 'Ordner ändern'}
                </button>
              </div>

              {/* Playlist */}
              <AnimatePresence>
                {showPlaylist && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-3 max-h-48 overflow-y-auto space-y-0.5 border-t border-border/30 pt-3">
                      {files.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => { setCurrentIndex(i); setIsPlaying(true); }}
                          className={`w-full text-start px-3 py-2.5 rounded-xl text-[13px] transition-colors flex items-center gap-2.5 ${
                            i === currentIndex ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary text-muted-foreground'
                          }`}
                        >
                          <span className="w-6 text-center text-[11px] tabular-nums text-muted-foreground/60 shrink-0">{i + 1}</span>
                          {i === currentIndex && isPlaying ? (
                            <Volume2 className="w-3.5 h-3.5 shrink-0 text-primary" />
                          ) : (
                            <Music className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )}
    </div>
  );
}
