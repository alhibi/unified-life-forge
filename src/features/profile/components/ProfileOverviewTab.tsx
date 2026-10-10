import React from 'react';

import { AppCard, AppList, AppRow, IconChip } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  Award,
  ExternalLink,
  Github,
  Globe,
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
import { SocialLinks } from '../types';

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
  statusText: _statusText,
  statusEmoji: _statusEmoji = '✨',
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
      <AppCard className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconChip size="sm" aria-hidden>
              <User className="h-4 w-4" />
            </IconChip>
            <h2 className="text-meta font-bold text-foreground">التعريف الشخصي</h2>
          </div>
          <Button variant="ghost" size="xs" className="gap-1" onClick={onEditClick}>
            <Pencil className="h-3 w-3" aria-hidden />
            تعديل
          </Button>
        </div>

        {bio ? (
          <p
            className="text-meta leading-relaxed text-foreground/90 bg-muted/20 p-4 rounded-lg border border-border/30 italic font-serif"
            dir="auto"
          >
            "{bio}"
          </p>
        ) : (
          <p className="text-mini text-muted-foreground italic py-2">
            لم تقم بإضافة نبذة شخصية بعد. انقر على تعديل لإضافة نبذتك.
          </p>
        )}
      </AppCard>

      {/* 2. Featured Badges Showcase */}
      <AppCard className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconChip size="sm" aria-hidden>
              <Award className="h-4 w-4" />
            </IconChip>
            <h2 className="text-meta font-bold text-foreground">الأوسمة المميزة</h2>
          </div>
          <Button variant="ghost" size="xs" onClick={onNavigateToBadges}>
            عرض الكل ({APP_BADGES.length})
          </Button>
        </div>

        {pinnedBadges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pinnedBadges.map((badge) => (
              <AppCard
                flat
                compact
                key={badge.id}
                className="flex flex-col items-center text-center space-y-1.5"
              >
                <IconChip aria-hidden>
                  <Sparkles className="h-5 w-5" />
                </IconChip>
                <h3 className="text-mini font-bold text-foreground">{badge.titleAr}</h3>
                <p className="text-micro text-muted-foreground line-clamp-1">{badge.descriptionAr}</p>
              </AppCard>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted/20 border border-border/30 text-center space-y-2">
            <p className="text-mini text-muted-foreground">
              يمكنك تثبيت حتى 3 أوسمة في أعلى ملفك الشخصي لإبراز إنجازاتك.
            </p>
            <Button variant="secondary" size="xs" onClick={onNavigateToBadges}>
              اختر أوسمتك المميزة
            </Button>
          </div>
        )}
      </AppCard>

      {/* 3. Identity Details & External Web */}
      <AppCard className="space-y-4">
        <h2 className="text-meta font-bold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" aria-hidden />
          التفاصيل المهنية والربط الرقمي
        </h2>

        <AppList>
          {title && <AppRow as="div" title="المسمى / الشغف" value={title} />}

          {location && (
            <AppRow
              as="div"
              title="الموقع / المدينة"
              value={
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden />
                  {location}
                </span>
              }
            />
          )}

          {websiteUrl && (
            <AppRow
              as="a"
              href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
              target="_blank"
              rel="noreferrer"
              leading={
                <IconChip size="sm" tone="plain" aria-hidden>
                  <ExternalLink className="h-4 w-4" />
                </IconChip>
              }
              title="الموقع الشخصي"
              value={
                <span dir="ltr" className="truncate">
                  {websiteUrl}
                </span>
              }
            />
          )}
        </AppList>

        {/* Social Links */}
        {socialItems.length > 0 && (
          <div className="pt-2 border-t border-border/30 space-y-2">
            <span className="text-micro font-bold text-muted-foreground">حسابات التواصل والتفاعل</span>
            <AppList>
              {socialItems.map((s) => {
                const IconComp = s.icon;
                const fullUrl = s.value?.startsWith('http') ? s.value : `${s.prefix}${s.value}`;
                return (
                  <AppRow
                    key={s.key}
                    as="a"
                    href={fullUrl}
                    target="_blank"
                    rel="noreferrer"
                    leading={
                      <IconChip size="sm" tone="plain" aria-hidden>
                        <IconComp className="h-4 w-4" />
                      </IconChip>
                    }
                    title={s.label}
                    value={<span dir="ltr">@{s.value}</span>}
                  />
                );
              })}
            </AppList>
          </div>
        )}
      </AppCard>
    </div>
  );
};
