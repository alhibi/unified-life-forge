import React, { useEffect, useRef,useState } from 'react';
import { toast } from 'sonner';

import { ChevronRight,Pause, Play, RotateCcw, Volume2 } from '@/lib/icons';

interface ArticleSpeechPlayerProps {
  textToSpeak: string;
  language: string;
  ttsSpeed: number;
  onTtsSpeedChange: (speed: number) => void;
}

export function ArticleSpeechPlayer({
  textToSpeak,
  language,
  ttsSpeed,
  onTtsSpeedChange,
}: ArticleSpeechPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [expanded, setExpanded] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean text from HTML tags for speech
  const cleanText = (html: string) => {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      const loadVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        // Filter voices to support Arabic, English and German
        const filtered = allVoices.filter(v =>
          v.lang.startsWith('ar') || v.lang.startsWith('en') || v.lang.startsWith('de')
        );
        setVoices(filtered);

        // Select default voice based on article language
        const targetLang = 'ar';
        const defaultVoice = filtered.find(v => v.lang.startsWith(targetLang));
        if (defaultVoice) {
          setSelectedVoice(defaultVoice.name);
        } else if (filtered.length > 0) {
          setSelectedVoice(filtered[0].name);
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [language]);

  const handlePlayPause = () => {
    if (!synthRef.current) {
      toast.error('ميزة تحويل النص إلى كلام غير مدعومة في هذا المتصفح');
      return;
    }

    if (isPlaying) {
      if (isPaused) {
        synthRef.current.resume();
        setIsPaused(false);
      } else {
        synthRef.current.pause();
        setIsPaused(true);
      }
    } else {
      const processedText = cleanText(textToSpeak);
      if (!processedText) {
        toast.error('لا يوجد نص قابل للقراءة');
        return;
      }

      // Stop any active utterance
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(processedText);
      utteranceRef.current = utterance;

      // Apply selected voice
      if (selectedVoice) {
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
      }

      // Apply options
      utterance.rate = ttsSpeed;

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted') {
          console.error('Speech synthesis error', e);
          setIsPlaying(false);
          setIsPaused(false);
        }
      };

      synthRef.current.speak(utterance);
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleSpeedChange = () => {
    const nextSpeed = ttsSpeed >= 2.0 ? 0.75 : ttsSpeed + 0.25;
    onTtsSpeedChange(nextSpeed);

    // If already playing, restart with new speed
    if (isPlaying && synthRef.current) {
      const processedText = cleanText(textToSpeak);
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(processedText);
      utteranceRef.current = utterance;

      if (selectedVoice) {
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
      }

      utterance.rate = nextSpeed;
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      synthRef.current.speak(utterance);
      setIsPaused(false);
    }
  };

  if (!synthRef.current) return null;

  return (
    <div className="flex flex-col gap-2 p-3 bg-card border border-border/50 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Volume2 className="h-4 w-4 text-primary" />
          <span>{'الاستماع للمقال'}</span>
          <ChevronRight className={`h-3 w-3 transform transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePlayPause}
            className={`p-2 rounded-xl transition-all active:scale-95 ${
              isPlaying && !isPaused
                ? 'bg-primary/20 text-primary'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
            title={isPlaying && !isPaused ? ('إيقاف مؤقت') : ('تشغيل')}
          >
            {isPlaying && !isPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>

          {isPlaying && (
            <button
              type="button"
              onClick={handleStop}
              className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/15 text-destructive transition-all active:scale-95"
              title={'إيقاف كامل'}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleSpeedChange}
            className="px-2.5 py-1.5 rounded-xl border border-border/60 hover:bg-accent/40 text-xs font-bold tabular-nums"
            title={'سرعة النطق'}
          >
            {ttsSpeed}x
          </button>
        </div>
      </div>

      {expanded && voices.length > 0 && (
        <div className="pt-2 border-t border-border/30 flex flex-col gap-1.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {'اختر الصوت'}
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => {
              setSelectedVoice(e.target.value);
              // Stop to apply new voice immediately on next play
              handleStop();
            }}
            className="w-full text-xs h-8 rounded-lg border border-border/50 bg-background/50 px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
