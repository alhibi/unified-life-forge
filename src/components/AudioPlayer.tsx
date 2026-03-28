import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Play, Pause, SkipBack, SkipForward, Music, FolderOpen, Volume2 } from 'lucide-react';

interface AudioFile { name: string; url: string }

export default function AudioPlayer() {
  const { t } = useApp();
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;
    const newFiles: AudioFile[] = Array.from(selected).map(f => ({
      name: f.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(f),
    }));
    setFiles(prev => [...prev, ...newFiles]);
    if (files.length === 0) setCurrentIndex(0);
  };

  const togglePlay = () => {
    if (!audioRef.current || files.length === 0) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const skipNext = () => {
    if (files.length === 0) return;
    setCurrentIndex((currentIndex + 1) % files.length);
    setIsPlaying(true);
  };

  const skipPrev = () => {
    if (files.length === 0) return;
    setCurrentIndex((currentIndex - 1 + files.length) % files.length);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (audioRef.current && files.length > 0) {
      audioRef.current.src = files[currentIndex].url;
      if (isPlaying) audioRef.current.play();
    }
  }, [currentIndex, files.length]);

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    setDuration(audioRef.current.duration || 0);
    setProgress(duration > 0 ? (audioRef.current.currentTime / duration) * 100 : 0);
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

  return (
    <div className="premium-card-elevated p-5">
      <audio ref={audioRef} onTimeUpdate={onTimeUpdate} onEnded={skipNext} />
      <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleFileSelect} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Music className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] text-foreground">{t('audio.title')}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {currentFile ? currentFile.name : t('audio.noFile')}
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 rounded-xl bg-secondary hover:bg-muted flex items-center justify-center transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-secondary-foreground" />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="h-1 bg-secondary rounded-full cursor-pointer overflow-hidden" onClick={seekTo}>
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
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
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          {isPlaying
            ? <Pause className="w-6 h-6" />
            : <Play className="w-6 h-6 ms-0.5" />
          }
        </button>
        <button onClick={skipNext} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <SkipForward className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 max-h-28 overflow-y-auto space-y-0.5">
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setIsPlaying(true); }}
              className={`w-full text-start px-3 py-2 rounded-xl text-[13px] transition-colors flex items-center gap-2.5 ${
                i === currentIndex ? 'bg-primary/8 text-primary font-medium' : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
