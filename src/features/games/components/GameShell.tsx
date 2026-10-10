import { AnimatePresence,motion } from 'framer-motion';
import React, { ReactNode,useEffect, useState } from 'react';

import BackButton from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { isHapticsOff, isMuted, setHapticsOff, setMuted } from '@/features/games/utils/gameFeedback';
import { BarChart3, Info, type LucideIcon,Settings2, Vibrate, Volume2, VolumeX } from '@/lib/icons';

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

export default function GameShell({ title, icon: Icon, accentColor: _accentColor, rules, stats, options, children, headerRight }: GameShellProps) {
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
    { id: 'rules' as const, icon: Info, label: 'القواعد' },
    ...(stats && stats.length > 0 ? [{ id: 'stats' as const, icon: BarChart3, label: 'التقدم' }] : []),
    ...(options && options.length > 0 ? [{ id: 'options' as const, icon: Settings2, label: 'خيارات' }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-page pt-4" >
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
            <div className="row-icon row-icon-md">
              <Icon className="w-4.5 h-4.5"  />
            </div>
            <h1 className="text-title font-black text-foreground truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost"
              onClick={toggleMute}
              aria-label={'كتم الصوت'}
              size="icon" aria-pressed={!muted} className={muted ? 'bg-secondary text-muted-foreground' : 'bg-primary-container text-on-primary-container'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost"
              onClick={toggleHap}
              aria-label={'اهتزاز'}
              size="icon" aria-pressed={!hapticsOff} className={hapticsOff ? 'bg-secondary text-muted-foreground' : 'bg-primary-container text-on-primary-container'}
            >
              <Vibrate className="w-3.5 h-3.5" />
            </Button>
            {headerRight}
          </div>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button variant="ghost"
                key={tab.id}
                onClick={() => setActiveTab(isActive ? null : tab.id)}
                aria-pressed={isActive} className={isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}

              >
                <TabIcon className="w-3 h-3" />
                {tab.label}
              </Button>
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
              <div className="app-card space-y-2">
                {rules.map((rule, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-micro font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-mini text-muted-foreground leading-relaxed">{rule}</p>
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
              <div className="app-card">
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((s, i) => (
                    <div key={i} className="text-center py-2">
                      <p className="text-lead font-black text-foreground">{s.value}</p>
                      <p className="text-micro text-muted-foreground">{s.label}</p>
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
              <div className="app-card space-y-3">
                {options.map(opt => (
                  <div key={opt.key}>
                    <p className="text-micro text-muted-foreground mb-1.5">{opt.label}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {opt.choices.map(choice => (
                        <Button variant="ghost"
                          key={choice.value}
                          onClick={() => opt.onChange(choice.value)}
                          aria-pressed={opt.current === choice.value} className={opt.current === choice.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}

                        >
                          {choice.label}
                        </Button>
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
