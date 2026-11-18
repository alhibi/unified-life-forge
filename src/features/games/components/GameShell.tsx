import React, { type ReactNode, useEffect, useState } from 'react';

import PageHeader from '@/components/PageHeader';
import { IconButton } from '@/components/ui/app-shell';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isHapticsOff, isMuted, setHapticsOff, setMuted } from '@/features/games/utils/gameFeedback';
import {
  BarChart3,
  Info,
  type LucideIcon,
  MoreVertical,
  Settings2,
  Vibrate,
  Volume2,
} from '@/lib/icons';

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

type PanelId = 'rules' | 'stats' | 'options';

/**
 * The frame every game shares: one page header, one in-game status bar, one
 * tabbed reference panel, then the board.
 *
 * The header used to carry the timer, pause, mute and haptics buttons at once.
 * At 360px that squeezed the h1 to a couple of characters (sudoku's title was
 * clipped to 25px of 70), so the header now holds only the title and one
 * settings menu; the game's live status sits in a HUD row below it where it has
 * room to be read, and the reference panels are real Tabs.
 */
export default function GameShell({
  title,
  icon: Icon,
  accentColor: _accentColor,
  rules,
  stats,
  options,
  children,
  headerRight,
}: GameShellProps) {
  const [activeTab, setActiveTab] = useState<PanelId | null>(null);
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

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };
  const toggleHap = () => {
    setHapticsOff(!hapticsOff);
    setHapticsOffState(!hapticsOff);
  };

  const tabs: { id: PanelId; icon: LucideIcon; label: string }[] = [
    { id: 'rules', icon: Info, label: 'القواعد' },
    ...(stats && stats.length > 0
      ? [{ id: 'stats' as const, icon: BarChart3, label: 'التقدم' }]
      : []),
    ...(options && options.length > 0
      ? [{ id: 'options' as const, icon: Settings2, label: 'خيارات' }]
      : []),
  ];

  return (
    <div data-game-shell className="min-h-dvh bg-background pb-page">
      {/* One page header for every game: same height, same title scale, and
          enough inline room that the h1 never truncates at 360px. */}
      <PageHeader
        backTo="/games"
        title={title}
        icon={<Icon className="h-4.5 w-4.5" />}
        right={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton aria-label="إعدادات اللعبة">
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuLabel>الصوت واللمس</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={!muted} onCheckedChange={toggleMute}>
                <Volume2 className="me-2 h-4 w-4" aria-hidden="true" />
                الصوت
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={!hapticsOff} onCheckedChange={toggleHap}>
                <Vibrate className="me-2 h-4 w-4" aria-hidden="true" />
                الاهتزاز
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="px-[var(--ui-gutter)] pt-3">
        {/* In-game HUD: the page's own live readout (timer, pause, restart)
            instead of squeezing it into the header. */}
        {headerRight && (
          <div className="mb-3 flex min-h-11 flex-wrap items-center gap-2">{headerRight}</div>
        )}

        {tabs.length > 0 && (
          <Tabs
            value={activeTab ?? 'closed'}
            onValueChange={(value) => setActiveTab(value as PanelId)}
            className="mb-4"
          >
            <TabsList className="w-full">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-mini">
                    <TabIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="rules">
              <div className="app-card space-y-2">
                {rules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container text-micro font-bold text-on-primary-container">
                      {i + 1}
                    </span>
                    <p className="text-mini leading-relaxed text-muted-foreground">{rule}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="stats">
              {stats && (
                <div className="app-card">
                  <dl className="grid grid-cols-2 gap-3">
                    {stats.map((s, i) => (
                      <div key={i} className="py-2 text-center">
                        <dd className="text-lead font-bold tabular-nums text-foreground">{s.value}</dd>
                        <dt className="text-micro text-muted-foreground">{s.label}</dt>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </TabsContent>

            <TabsContent value="options">
              {options && (
                <div className="app-card space-y-3">
                  {options.map((opt) => (
                    <fieldset key={opt.key}>
                      <legend className="mb-1.5 text-micro text-muted-foreground">{opt.label}</legend>
                      <div className="flex flex-wrap gap-1.5">
                        {opt.choices.map((choice) => (
                          <button
                            key={choice.value}
                            type="button"
                            onClick={() => opt.onChange(choice.value)}
                            aria-pressed={opt.current === choice.value}
                            className={
                              opt.current === choice.value
                                ? 'min-h-11 rounded-full bg-primary px-3 text-mini font-semibold text-primary-foreground'
                                : 'min-h-11 rounded-full bg-secondary px-3 text-mini font-semibold text-secondary-muted'
                            }
                          >
                            {choice.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {children}
      </div>
    </div>
  );
}
