/**
 * MatchReportDialog — the post-session reward screen.
 *
 * Games used to add XP silently inside their win handler, so the player had no
 * idea a reward existed, let alone why it was that size. This shows the itemised
 * breakdown the award pipeline already produces: base outcome, mode bonus,
 * first-win, streak, speed, record, difficulty multiplier, flawless multiplier
 * and any challenge payouts — plus the level-up and any achievement unlocked.
 *
 * Deliberately dismissible with one tap and never blocking: a reward screen that
 * interrupts the next game is a punishment.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUp, Sparkles, Trophy } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { findAchievement } from '../progression/achievements';
import { challengesForDay } from '../progression/challenges';
import type { MatchReport } from '../progression/types';
import { MASTERY_LABELS, rankForLevel } from '../progression/xp';

interface Props {
  report: MatchReport | null;
  onClose: () => void;
  /** Day key the match belonged to — used to resolve challenge titles. */
  day: string;
}

function MatchReportDialogImpl({ report, onClose, day }: Props) {
  const reduce = useReducedMotion();
  if (!report) return null;

  const challengeTitles = report.challengesCompleted
    .map((id) => challengesForDay(day).find((c) => c.id === id)?.title)
    .filter((title): title is string => Boolean(title));

  const rank = rankForLevel(report.levelAfter);

  return (
    <Dialog open={report !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>نتيجة الجولة</DialogTitle>
          <DialogDescription>تفصيل النقاط المكتسبة</DialogDescription>
        </DialogHeader>

        {/* Total */}
        <div className="flex items-baseline justify-center gap-2 py-2">
          <motion.span
            initial={reduce ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduce ? { duration: 0.1 } : { type: 'spring', stiffness: 420, damping: 26 }}
            className="text-[4.25rem] font-semibold leading-none tabular-nums text-foreground"
            dir="ltr"
          >
            {report.xpAwarded}
          </motion.span>
          <span className="text-body text-muted-foreground">نقطة</span>
        </div>

        {report.leveledUp && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 rounded-md border border-primary/60 bg-accent/40 p-3"
          >
            <ArrowUp className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
            <p className="text-meta font-semibold text-foreground" dir="rtl">
              المستوى <span dir="ltr">{report.levelAfter}</span> — {rank.label}
            </p>
          </motion.div>
        )}

        {report.masteryTierAfter > report.masteryTierBefore && (
          <div className="flex items-center gap-2 rounded-md border border-primary/60 bg-accent/40 p-3">
            <Trophy className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
            <p className="text-meta font-semibold text-foreground">
              رتبة إتقان جديدة: {MASTERY_LABELS[report.masteryTierAfter]}
            </p>
          </div>
        )}

        {/* Breakdown */}
        <ul className="space-y-1.5">
          {report.lines.map((line, index) => (
            <li
              key={`${line.label}-${index}`}
              className={cn(
                'flex items-baseline justify-between gap-3 rounded-sm px-2 py-1.5',
                line.multiplier ? 'bg-muted/60' : '',
              )}
            >
              <span className="min-w-0 truncate text-meta text-foreground">
                {line.label}
                {line.multiplier && (
                  <span className="ms-1.5 text-mini tabular-nums text-muted-foreground" dir="ltr">
                    ×{line.multiplier}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-meta font-semibold tabular-nums text-foreground" dir="ltr">
                +{line.amount}
              </span>
            </li>
          ))}
        </ul>

        {challengeTitles.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="app-section-label mb-2">تحديات مكتملة</p>
            <ul className="space-y-1">
              {challengeTitles.map((title) => (
                <li key={title} className="flex items-center gap-2 text-meta text-foreground">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.unlocked.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="app-section-label mb-2">إنجازات جديدة</p>
            <ul className="space-y-1">
              {report.unlocked.map((id) => {
                const achievement = findAchievement(id);
                if (!achievement) return null;
                return (
                  <li key={id} className="flex items-center gap-2 text-meta text-foreground">
                    <Trophy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    {achievement.title}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-button bg-primary text-body font-semibold text-primary-foreground transition-transform duration-normal ease-out-expo hover:-translate-y-0.5"
        >
          متابعة
        </button>
      </DialogContent>
    </Dialog>
  );
}

export const MatchReportDialog = memo(MatchReportDialogImpl);
export default MatchReportDialog;
