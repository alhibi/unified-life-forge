/**
 * SpeakPlayer — speaks German text via the Web Speech API.
 * Quiet, unobtrusive control; silently absent when speech is unsupported.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Square,Volume2 } from '@/lib/icons';

export interface SpeakPlayerProps {
  /** Lines to read out, in order. */
  text: string[];
  variant?: 'pill' | 'icon';
  className?: string;
}

const isSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export const SpeakPlayer: React.FC<SpeakPlayerProps> = ({ text, variant = 'icon', className }) => {
  const [speaking, setSpeaking] = useState(false);
  const supported = isSupported();
  const activeRef = useRef(false);

  useEffect(() => {
    return () => {
      if (isSupported() && activeRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (!isSupported()) return;
    window.speechSynthesis.cancel();
    activeRef.current = false;
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!isSupported()) return;
    const lines = text.filter((line) => Boolean(line && line.trim()));
    if (lines.length === 0) return;

    window.speechSynthesis.cancel();
    activeRef.current = true;
    setSpeaking(true);

    lines.forEach((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = 'de-DE';
      utterance.rate = 0.92;
      if (index === lines.length - 1) {
        utterance.onend = () => {
          activeRef.current = false;
          setSpeaking(false);
        };
        utterance.onerror = () => {
          activeRef.current = false;
          setSpeaking(false);
        };
      }
      window.speechSynthesis.speak(utterance);
    });
  }, [text]);

  if (!supported) return null;

  const base =
    variant === 'pill'
      ? 'shrink-0 inline-flex items-center gap-1.5 rounded-full border border-stone-300/80 px-2.5 py-1 text-[0.625rem] font-semibold text-stone-600 hover:bg-stone-200/60 transition-colors'
      : 'shrink-0 inline-flex items-center justify-center rounded-xl p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors';

  return (
    <button
      type="button"
      onClick={speaking ? stop : speak}
      className={`${base} ${className ?? ''}`}
      aria-label={speaking ? 'إيقاف الاستماع' : 'استماع للنطق الألماني'}
      title={speaking ? 'إيقاف' : 'استماع'}
    >
      {speaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      {variant === 'pill' && <span dir="ltr">{speaking ? 'Stop' : 'Hören'}</span>}
    </button>
  );
};

export default SpeakPlayer;
