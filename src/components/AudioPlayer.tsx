import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Play, Pause, SkipBack, SkipForward, Music, FolderOpen, List, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAudioFiles, saveCurrentIndex, loadAudioFiles } from '@/utils/audioStorage';
import jsmediatags from 'jsmediatags';

interface AudioFile { name: string; url: string }

interface TrackMeta {
  title: string;
  artist: string;
  album: string;
  artUrl: string | null;
}

function extractMetadata(blobUrl: string, fileName: string): Promise<TrackMeta> {
  return new Promise((resolve) => {
    fetch(blobUrl)
      .then(r => r.blob())
      .then(blob => {
        jsmediatags.read(blob, {
          onSuccess: (tag: any) => {
            const { title, artist, album } = tag.tags || {};
            let artUrl: string | null = null;
            const pic = tag.tags?.picture;
            if (pic) {
              const bytes = new Uint8Array(pic.data);
              const picBlob = new Blob([bytes], { type: pic.format });
              artUrl = URL.createObjectURL(picBlob);
            }
            resolve({
              title: title || fileName,
              artist: artist || '',
              album: album || '',
              artUrl,
            });
          },
          onError: () => {
            resolve({ title: fileName, artist: '', album: '', artUrl: null });
          },
        });
      })
      .catch(() => {
        resolve({ title: fileName, artist: '', album: '', artUrl: null });
      });
  });
}

export default function AudioPlayer() {
  const { t } = useApp();
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [meta, setMeta] = useState<TrackMeta | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const metaCacheRef = useRef<Map<number, TrackMeta>>(new Map());

  useEffect(() => {
    loadAudioFiles().then(data => {
      if (data && data.files.length > 0) {
        setFiles(data.files);
        setCurrentIndex(data.currentIndex);
      }
      setLoaded(true);
    });
  }, []);

  // Extract metadata for current track
  useEffect(() => {
    if (files.length === 0) return;
    const cached = metaCacheRef.current.get(currentIndex);
    if (cached) {
      setMeta(cached);
      return;
    }
    setMeta(null);
    const file = files[currentIndex];
    extractMetadata(file.url, file.name).then(m => {
      metaCacheRef.current.set(currentIndex, m);
      setMeta(m);
    });
  }, [currentIndex, files]);

  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [expanded]);

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
      metaCacheRef.current.clear();
      setFiles(newFiles);
      setCurrentIndex(0);
      setExpanded(true);
      await saveAudioFiles(sorted);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || files.length === 0) return;
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

  const seekTo = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const currentFile = files[currentIndex];
  const displayTitle = meta?.title || currentFile?.name || '';
  const displayArtist = meta?.artist || '';
  const displayAlbum = meta?.album || '';

  return (
    <>
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

      {/* Compact Card */}
      <div className="bg-card border border-border/40 rounded-2xl p-4">
        {files.length === 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-[15px] text-foreground">{t('audio.title')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t('audio.noFile')}</p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-border/60 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
            >
              <FolderOpen className="w-8 h-8" />
              <span className="text-sm font-medium">{t('audio.selectFolder')}</span>
              <span className="text-xs">{t('audio.selectHint')}</span>
            </button>
          </div>
        ) : (
          /* Mini player - tap to expand */
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(true)}>
            {/* Mini album art */}
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#1a1a2e] flex items-center justify-center">
              {meta?.artUrl ? (
                <img src={meta.artUrl} alt="" className="w-full h-full object-cover" />
              ) : isPlaying ? (
                <div className="flex items-end gap-[3px] h-5">
                  <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '50%' }} />
                  <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                  <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '70%', animationDelay: '0.3s' }} />
                  <div className="w-[3px] bg-primary rounded-full animate-pulse" style={{ height: '40%', animationDelay: '0.45s' }} />
                </div>
              ) : (
                <Music className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{displayTitle}</div>
              {displayArtist && (
                <div className="text-[11px] text-muted-foreground truncate">{displayArtist}</div>
              )}
              <div className="h-1 bg-secondary rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ms-0.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Full-screen Player */}
      <AnimatePresence>
        {expanded && files.length > 0 && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
            style={{ touchAction: 'none' }}
          >
            {/* Background: blurred album art or dark gradient */}
            <div className="absolute inset-0 bg-[#0a0a0f]">
              {meta?.artUrl && (
                <>
                  <img
                    src={meta.artUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[60px] scale-125"
                  />
                  <div className="absolute inset-0 bg-black/50" />
                </>
              )}
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top,12px)] pb-2">
                <button
                  onClick={() => { setExpanded(false); setShowPlaylist(false); }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <ChevronDown className="w-6 h-6" />
                </button>
                <span className="text-white/40 text-xs font-medium tracking-wider uppercase">
                  {currentIndex + 1} / {files.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      showPlaylist ? 'text-primary' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
                  >
                    <FolderOpen className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {showPlaylist ? (
                <div className="flex-1 overflow-y-auto px-5 pb-8" style={{ touchAction: 'pan-y' }}>
                  <h2 className="text-white/80 text-lg font-semibold mb-4 mt-2">قائمة التشغيل</h2>
                  <div className="space-y-1">
                    {files.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => { setCurrentIndex(i); setIsPlaying(true); setShowPlaylist(false); }}
                        className={`w-full text-start px-4 py-3.5 rounded-xl text-[14px] transition-all flex items-center gap-3 ${
                          i === currentIndex
                            ? 'bg-white/10 text-primary font-medium'
                            : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                        }`}
                      >
                        <span className="w-7 text-center text-[12px] tabular-nums text-white/30 shrink-0">{i + 1}</span>
                        {i === currentIndex && isPlaying ? (
                          <div className="flex items-end gap-[2px] h-3.5 shrink-0 w-4">
                            <div className="w-[2px] bg-primary rounded-full animate-pulse" style={{ height: '50%' }} />
                            <div className="w-[2px] bg-primary rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.15s' }} />
                            <div className="w-[2px] bg-primary rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0.3s' }} />
                          </div>
                        ) : (
                          <Music className="w-4 h-4 shrink-0 text-white/30" />
                        )}
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center px-8">
                  {/* Album art */}
                  <div className="w-full max-w-[280px] aspect-square rounded-2xl shadow-2xl shadow-black/60 overflow-hidden mb-10 relative">
                    {meta?.artUrl ? (
                      <img
                        src={meta.artUrl}
                        alt={displayTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-[70%] h-[70%] rounded-full border border-white/5 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                          <div className={`absolute w-[50%] h-[50%] rounded-full border border-white/5 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
                          <div className={`absolute w-[30%] h-[30%] rounded-full border border-white/10 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                        </div>
                        <Music className={`w-16 h-16 text-white/20 relative z-10 transition-transform duration-500 ${isPlaying ? 'scale-110' : 'scale-100'}`} />
                      </div>
                    )}
                  </div>

                  {/* Song info */}
                  <div className="w-full text-center mb-8">
                    <h2 className="text-white text-xl font-bold truncate px-2">{displayTitle}</h2>
                    {displayArtist && (
                      <p className="text-white/50 text-sm mt-1.5 truncate">{displayArtist}</p>
                    )}
                    {displayAlbum && (
                      <p className="text-white/30 text-xs mt-1 truncate">{displayAlbum}</p>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full mb-6">
                    <div
                      ref={progressRef}
                      className="h-[6px] bg-white/10 rounded-full cursor-pointer overflow-hidden relative group"
                      onClick={seekTo}
                      onTouchMove={seekTo}
                    >
                      <div
                        className="h-full bg-white rounded-full transition-all duration-100 relative"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg translate-x-1/2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="flex justify-between mt-2.5">
                      <span className="text-white/40 text-[13px] tabular-nums font-medium">{formatTime(currentTime)}</span>
                      <span className="text-white/40 text-[13px] tabular-nums font-medium">{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-10">
                    <button onClick={skipPrev} className="p-3 text-white/70 hover:text-white active:scale-90 transition-all">
                      <SkipBack className="w-7 h-7" fill="currentColor" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="w-[72px] h-[72px] rounded-full bg-white text-[#0a0a0f] flex items-center justify-center shadow-xl shadow-white/10 active:scale-95 transition-transform"
                    >
                      {isPlaying
                        ? <Pause className="w-8 h-8" fill="currentColor" />
                        : <Play className="w-8 h-8 ms-1" fill="currentColor" />
                      }
                    </button>
                    <button onClick={skipNext} className="p-3 text-white/70 hover:text-white active:scale-90 transition-all">
                      <SkipForward className="w-7 h-7" fill="currentColor" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
