import React, { useState, useEffect, ReactNode } from 'react';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Settings2, BarChart3, ChevronDown, X, Volume2, VolumeX, Vibrate, type LucideIcon } from '@/lib/icons';
import { isHapticsOff, isMuted, setHapticsOff, setMuted } from '@/features/games/utils/gameFeedback';

interface GameStats {
  label: string;
  value: string | number;
}

interface GameOption {
  key: string;
  label: string;
  choices: { value: string; label: string }[];
  current: string;
  onChange: (value: string) => void;
}

interface GameShellProps {
  title: string;
  icon: LucideIcon;
  accentColor: string; // hex like '#10b981'
  rules: string[];
  stats?: GameStats[];
  options?: GameOption[];
  children: ReactNode;
  headerRight?: ReactNode;
}

export default function GameShell({ title, icon: Icon, accentColor, rules, stats, options, children, headerRight }: GameShellProps) {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<'game' | 'rules' | 'stats' | 'options' | null>(null);
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  const [hapticsOff, setHapticsOffState] = useState<boolean>(() => isHapticsOff());

  useEffect(() => {
    const onMute = (e: Event) => setMutedState(Boolean((e as CustomEvent<boolean>).detail));
    const onHap = (e: Event) => setHapticsOffState(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener('games-mute-change', onMute);
    window.addEventListener('games-haptics-change', onHap);
    return () => {
      window.removeEventListener('games-mute-change', onMute);
      window.removeEventListener('games-haptics-change', onHap);
    };
  }, []);

  const toggleMute = () => { setMuted(!muted); setMutedState(!muted); };
  const toggleHap = () => { setHapticsOff(!hapticsOff); setHapticsOffState(!hapticsOff); };

  const tabs = [
    { id: 'rules' as const, icon: Info, label: isAr ? 'القواعد' : 'Regeln' },
    ...(stats && stats.length > 0 ? [{ id: 'stats' as const, icon: BarChart3, label: isAr ? 'التقدم' : 'Fortschritt' }] : []),
    ...(options && options.length > 0 ? [{ id: 'options' as const, icon: Settings2, label: isAr ? 'خيارات' : 'Optionen' }] : []),
  ];

  return (
    <div className="min-h-screen pb-28 pt-4" style={{ background: `linear-gradient(180deg, #0a0a0f 0%, ${accentColor}08 40%, #0a0a0f 100%)` }}>
      <div className="px-5">
        {/* Header — back, title, and game-feedback toggles all sit on
            a single row. Previously the back button lived on its own
            row above the title, which doubled the vertical space the
            chrome occupied for no real benefit. The back button uses
            the unified compact ghost style; even on the dark game
            background the foreground/4 tint stays readable. */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <BackButton to="/games" />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accentColor}20` }}>
              <Icon className="w-4.5 h-4.5" style={{ color: accentColor }} />
            </div>
            <h1 className="text-xl font-black text-white truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleMute}
              aria-label={isAr ? 'كتم الصوت' : 'Ton'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: muted ? 'rgba(255,255,255,0.04)' : `${accentColor}18`, color: muted ? 'rgba(255,255,255,0.45)' : accentColor, border: `1px solid ${muted ? 'rgba(255,255,255,0.06)' : `${accentColor}30`}` }}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={toggleHap}
              aria-label={isAr ? 'اهتزاز' : 'Vibration'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: hapticsOff ? 'rgba(255,255,255,0.04)' : `${accentColor}18`, color: hapticsOff ? 'rgba(255,255,255,0.45)' : accentColor, border: `1px solid ${hapticsOff ? 'rgba(255,255,255,0.06)' : `${accentColor}30`}` }}
            >
              <Vibrate className="w-3.5 h-3.5" />
            </button>
            {headerRight}
          </div>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(isActive ? null : tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all"
                style={{
                  background: isActive ? `${accentColor}20` : 'rgba(255,255,255,0.04)',
                  color: isActive ? accentColor : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${isActive ? `${accentColor}30` : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <TabIcon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Panels */}
        <AnimatePresence mode="wait">
          {activeTab === 'rules' && (
            <motion.div
              key="rules"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="rounded-2xl p-4 border space-y-2" style={{ background: 'rgba(255,255,255,0.03)', borderColor: `${accentColor}15` }}>
                {rules.map((rule, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ background: `${accentColor}20`, color: accentColor }}>
                      {i + 1}
                    </span>
                    <p className="text-[12px] text-zinc-400 leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && stats && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="rounded-2xl p-4 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: `${accentColor}15` }}>
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((s, i) => (
                    <div key={i} className="text-center py-2">
                      <p className="text-lg font-black text-white">{s.value}</p>
                      <p className="text-[10px] text-zinc-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'options' && options && (
            <motion.div
              key="options"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="rounded-2xl p-4 border space-y-3" style={{ background: 'rgba(255,255,255,0.03)', borderColor: `${accentColor}15` }}>
                {options.map(opt => (
                  <div key={opt.key}>
                    <p className="text-[11px] text-zinc-500 mb-1.5">{opt.label}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {opt.choices.map(choice => (
                        <button
                          key={choice.value}
                          onClick={() => opt.onChange(choice.value)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                          style={{
                            background: opt.current === choice.value ? `${accentColor}25` : 'rgba(255,255,255,0.04)',
                            color: opt.current === choice.value ? accentColor : 'rgba(255,255,255,0.4)',
                            border: `1px solid ${opt.current === choice.value ? `${accentColor}40` : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game content */}
        {children}
      </div>
    </div>
  );
}
