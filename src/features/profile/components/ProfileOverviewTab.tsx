import { motion } from 'framer-motion';
import React from 'react';

import {
  Award,
  ExternalLink,
  Globe,
  Globe2,
  Github,
  Instagram,
  Linkedin,
  MapPin,
  Pencil,
  Send,
  Sparkles,
  Twitter,
  User,
} from '@/lib/icons';

import { APP_BADGES } from '../data/badges';
import { ProfileBadge, SocialLinks } from '../types';

export interface ProfileOverviewTabProps {
  bio?: string | null;
  title?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  socialLinks?: SocialLinks | null;
  statusText?: string | null;
  statusEmoji?: string | null;
  featuredBadges?: string[];
  onEditClick: () => void;
  onNavigateToBadges: () => void;
}

export const ProfileOverviewTab: React.FC<ProfileOverviewTabProps> = ({
  bio,
  title,
  location,
  websiteUrl,
  socialLinks,
  statusText,
  statusEmoji = '✨',
  featuredBadges = [],
  onEditClick,
  onNavigateToBadges,
}) => {
  const pinnedBadges = APP_BADGES.filter((b) => featuredBadges.includes(b.id));

  const socialItems = [
    { key: 'github', label: 'GitHub', icon: Github, value: socialLinks?.github, prefix: 'https://github.com/' },
    { key: 'twitter', label: 'X (Twitter)', icon: Twitter, value: socialLinks?.twitter, prefix: 'https://x.com/' },
    { key: 'telegram', label: 'Telegram', icon: Send, value: socialLinks?.telegram, prefix: 'https://t.me/' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, value: socialLinks?.linkedin, prefix: 'https://linkedin.com/in/' },
    { key: 'instagram', label: 'Instagram', icon: Instagram, value: socialLinks?.instagram, prefix: 'https://instagram.com/' },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="space-y-5" dir="rtl">
      {/* 1. Bio & Personal Statement */}
      <section className="surface-depth rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-4 h-4" />
            </div>
            <h2 className="text-meta font-bold text-foreground">التعريف الشخصي</h2>
          </div>
          <button
            onClick={onEditClick}
            className="text-micro font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            تعديل
          </button>
        </div>

        {bio ? (
          <p className="text-meta leading-relaxed text-foreground/90 bg-muted/20 p-4 rounded-xl border border-border/30 italic font-serif" dir="auto">
            "{bio}"
          </p>
        ) : (
          <p className="text-mini text-muted-foreground italic py-2">
            لم تقم بإضافة نبذة شخصية بعد. انقر على تعديل لإضافة نبذتك.
          </p>
        )}
      </section>

      {/* 2. Featured Badges Showcase */}
      <section className="surface-depth rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <h2 className="text-meta font-bold text-foreground">الأوسمة المميزة</h2>
          </div>
          <button
            onClick={onNavigateToBadges}
            className="text-micro font-semibold text-primary hover:underline flex items-center gap-1"
          >
            عرض الكل ({APP_BADGES.length})
          </button>
        </div>

        {pinnedBadges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pinnedBadges.map((badge) => (
              <div
                key={badge.id}
                className="p-3 rounded-xl bg-card border border-border/50 flex flex-col items-center text-center space-y-1.5 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lead">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-mini font-bold text-foreground">{badge.titleAr}</h3>
                <p className="text-micro text-muted-foreground line-clamp-1">{badge.descriptionAr}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-center space-y-2">
            <p className="text-mini text-muted-foreground">
              يمكنك تثبيت حتى 3 أوسمة في أعلى ملفك الشخصي لإبراز إنجازاتك.
            </p>
            <button
              onClick={onNavigateToBadges}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-micro font-bold hover:bg-primary/20 transition-colors"
            >
              اختر أوسمتك المميزة
            </button>
          </div>
        )}
      </section>

      {/* 3. Identity Details & External Web */}
      <section className="surface-depth rounded-2xl p-5 space-y-4">
        <h2 className="text-meta font-bold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          التفاصيل المهنية والربط الرقمي
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {title && (
            <div className="p-3 rounded-xl bg-card border border-border/40 space-y-0.5">
              <span className="text-micro font-semibold text-muted-foreground">المسمى / الشغف</span>
              <p className="text-mini font-bold text-foreground">{title}</p>
            </div>
          )}

          {location && (
            <div className="p-3 rounded-xl bg-card border border-border/40 space-y-0.5">
              <span className="text-micro font-semibold text-muted-foreground">الموقع / المدينة</span>
              <p className="text-mini font-bold text-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {location}
              </p>
            </div>
          )}

          {websiteUrl && (
            <div className="p-3 rounded-xl bg-card border border-border/40 space-y-0.5 sm:col-span-2">
              <span className="text-micro font-semibold text-muted-foreground">الموقع الشخصي</span>
              <a
                href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-mini font-bold text-primary hover:underline flex items-center gap-1 truncate"
                dir="ltr"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                {websiteUrl}
              </a>
            </div>
          )}
        </div>

        {/* Social Links Grid */}
        {socialItems.length > 0 && (
          <div className="pt-2 border-t border-border/30 space-y-2">
            <span className="text-micro font-bold text-muted-foreground">حسابات التواصل والتفاعل</span>
            <div className="flex flex-wrap gap-2">
              {socialItems.map((s) => {
                const IconComp = s.icon;
                const fullUrl = s.value?.startsWith('http') ? s.value : `${s.prefix}${s.value}`;
                return (
                  <a
                    key={s.key}
                    href={fullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/50 text-mini font-medium text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <IconComp className="w-4 h-4 text-primary" />
                    <span dir="ltr">@{s.value}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
