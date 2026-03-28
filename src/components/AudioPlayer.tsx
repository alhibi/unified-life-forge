import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Play, Pause, SkipBack, SkipForward, Music, Upload, Volume2 } from 'lucide-react';

interface AudioFile {
  name: string;
  url: string;
}

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
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipNext = () => {
    if (files.length === 0) return;
    const next = (currentIndex + 1) % files.length;
    setCurrentIndex(next);
    setIsPlaying(true);
  };

  const skipPrev = () => {
    if (files.length === 0) return;
    const prev = (currentIndex - 1 + files.length) % files.length;
    setCurrentIndex(prev);
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
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const currentFile = files[currentIndex];

  return (
    <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <audio ref={audioRef} onTimeUpdate={onTimeUpdate} onEnded={skipNext} />
      <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleFileSelect} />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <Music className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground">{t('audio.title')}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {currentFile ? currentFile.name : t('audio.noFile')}
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <Upload className="w-4 h-4 text-secondary-foreground" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div
          className="h-1.5 bg-secondary rounded-full cursor-pointer overflow-hidden"
          onClick={seekTo}
        >
          <div
            className="h-full gradient-primary rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{formatTime(currentTime)}</span>
          <span className="text-[10px] text-muted-foreground">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={skipPrev} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <SkipBack className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
        >
          {isPlaying ? <Pause className="w-5 h-5 text-primary-foreground" /> : <Play className="w-5 h-5 text-primary-foreground ms-0.5" />}
        </button>
        <button onClick={skipNext} className="p-2 rounded-full hover:bg-secondary transition-colors">
          <SkipForward className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 max-h-28 overflow-y-auto space-y-1">
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setIsPlaying(true); }}
              className={`w-full text-start px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                i === currentIndex ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary text-muted-foreground'
              }`}
            >
              <Volume2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
