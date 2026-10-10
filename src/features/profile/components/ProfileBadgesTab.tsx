import React, { useState } from 'react';

import { AppCard, IconButton, IconChip } from '@/components/ui/app-shell';
import { Check, Lock, Pin, Sparkles } from '@/lib/icons';

import { APP_BADGES } from '../data/badges';
import { BadgeCategory, ProfileBadge } from '../types';

export interface ProfileBadgesTabProps {
  badges?: ProfileBadge[];
  featuredBadges?: string[];
  onToggleFeaturedBadge: (badgeId: string) => void;
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  all: 'الكل',
  knowledge: 'المعرفة والذاكرة',
  fitness: 'اللياقة والصحة',
  german: 'النادي الألماني',
  diwan: 'الديوان والشعر',
  travel: 'الأطلس والأسفار',
  spiritual: 'الأذكار والروحانيات',
};

/** Rarity is a documented colour key — tokens only, no raw colours. */
const RARITY_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  common: { bg: 'bg-secondary', text: 'text-muted-foreground', border: 'border-border', label: 'عادي' },
  rare: { bg: 'bg-data-4/10', text: 'text-data-4', border: 'border-data-4/20', label: 'نادر' },
  epic: { bg: 'bg-data-6/10', text: 'text-data-6', border: 'border-data-6/20', label: 'ملحمي' },
  legendary: { bg: 'bg-signal/10', text: 'text-signal', border: 'border-signal/20', label: 'أسطوري' },
};

export const ProfileBadgesTab: React.FC<ProfileBadgesTabProps> = ({
  badges = APP_BADGES,
  featuredBadges = [],
  onToggleFeaturedBadge,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory>('all');

  const filteredBadges = badges.filter((badge) => {
    if (selectedCategory === 'all') return true;
    return badge.category === selectedCategory;
  });

  const unlockedCount = badges.filter((b) => b.progressPercent >= 100).length;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Metrics Banner */}
      <AppCard className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lead font-bold text-foreground">خزانة الأوسمة والإنجازات</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-micro font-extrabold tabular-nums">
              {unlockedCount} / {badges.length} مكتسب
            </span>
          </div>
          <p className="text-micro text-muted-foreground mt-0.5">
            يمكنك تثبيت حتى 3 أوسمة في أعلى ملفك الشخصي بالضغط على أيقونة الدبوس
          </p>
        </div>

        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => {
            const isFilled = i < featuredBadges.length;
            return (
              <div
                key={i}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-motion ${
                  isFilled
                    ? 'bg-signal/10 border-signal/30 text-signal'
                    : 'bg-muted/20 border-border/40 text-muted-foreground'
                }`}
                aria-hidden
              >
                <Pin className="w-4 h-4" />
              </div>
            );
          })}
        </div>
      </AppCard>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(Object.keys(CATEGORY_LABELS) as BadgeCategory[]).map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              aria-pressed={active}
              className={`px-3.5 py-1.5 rounded-full text-micro font-bold whitespace-nowrap transition-motion ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary border border-border/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredBadges.map((badge) => {
          const isUnlocked = badge.progressPercent >= 100;
          const isPinned = featuredBadges.includes(badge.id);
          const rarity = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;

          return (
            <AppCard
              key={badge.id}
              className={`relative flex flex-col justify-between space-y-3 border transition-motion ${
                isUnlocked
                  ? 'border-border/60 hover:border-primary/40'
                  : 'opacity-70 bg-muted/10'
              }`}
            >
              {/* Header: Icon, Rarity Badge, Pin Toggle */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <IconChip tone={isUnlocked ? 'accent' : 'plain'} aria-hidden>
                    {isUnlocked ? (
                      <Sparkles className="w-6 h-6" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </IconChip>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-meta font-bold text-foreground">{badge.titleAr}</h3>
                      <span
                        className={`text-micro font-extrabold px-2 py-0.5 rounded-md border ${rarity.bg} ${rarity.text} ${rarity.border}`}
                      >
                        {rarity.label}
                      </span>
                    </div>
                    <span className="text-micro font-mono text-muted-foreground" dir="ltr">
                      {badge.titleEn}
                    </span>
                  </div>
                </div>

                {/* Pin Badge Button */}
                {isUnlocked && (
                  <IconButton
                    onClick={() => onToggleFeaturedBadge(badge.id)}
                    className={
                      isPinned
                        ? 'bg-signal/20 text-signal ring-1 ring-signal/40'
                        : undefined
                    }
                    title={isPinned ? 'إلغاء التثبيت' : 'تثبيت في رأس الملف'}
                    aria-label={isPinned ? 'إلغاء التثبيت' : 'تثبيت في رأس الملف'}
                    aria-pressed={isPinned}
                  >
                    <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} aria-hidden />
                  </IconButton>
                )}
              </div>

              {/* Description */}
              <p className="text-mini text-muted-foreground leading-relaxed">
                {badge.descriptionAr}
              </p>

              {/* Progress or Unlock Stamp */}
              <div className="pt-2 border-t border-border/30 flex items-center justify-between text-micro">
                {isUnlocked ? (
                  <div className="flex items-center gap-1.5 text-success font-bold">
                    <Check className="w-3.5 h-3.5" aria-hidden />
                    <span>تم الاكتساب ({badge.milestoneLabelAr})</span>
                  </div>
                ) : (
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-muted-foreground font-semibold">
                      <span>التقدم</span>
                      <span>{badge.progressPercent}% ({badge.milestoneLabelAr})</span>
                    </div>
                    <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${badge.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </AppCard>
          );
        })}
      </div>
    </div>
  );
};
