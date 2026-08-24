import React, { useState } from 'react';

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

const RARITY_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  common: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', label: 'عادي' },
  rare: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'نادر' },
  epic: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', label: 'ملحمي' },
  legendary: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'أسطوري' },
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
      <section className="surface-depth rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lead font-bold text-foreground">خزانة الأوسمة والإنجازات</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-micro font-extrabold">
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
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                  isFilled
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-muted/20 border-border/40 text-muted-foreground'
                }`}
              >
                <Pin className="w-4 h-4" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(Object.keys(CATEGORY_LABELS) as BadgeCategory[]).map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-micro font-bold whitespace-nowrap transition-all active:scale-95 ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
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
            <div
              key={badge.id}
              className={`surface-depth rounded-2xl p-4 relative flex flex-col justify-between space-y-3 transition-all ${
                isUnlocked
                  ? 'border-border/60 hover:border-primary/40'
                  : 'opacity-70 grayscale-[0.3] bg-muted/10'
              }`}
            >
              {/* Header: Icon, Rarity Badge, Pin Toggle */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isUnlocked
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {isUnlocked ? (
                      <Sparkles className="w-6 h-6 text-amber-400" />
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

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
                  <button
                    onClick={() => onToggleFeaturedBadge(badge.id)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      isPinned
                        ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40 scale-105'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                    }`}
                    title={isPinned ? 'إلغاء التثبيت' : 'تثبيت في رأس الملف'}
                  >
                    <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>

              {/* Description */}
              <p className="text-mini text-muted-foreground leading-relaxed">
                {badge.descriptionAr}
              </p>

              {/* Progress or Unlock Stamp */}
              <div className="pt-2 border-t border-border/30 flex items-center justify-between text-micro">
                {isUnlocked ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Check className="w-3.5 h-3.5" />
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
