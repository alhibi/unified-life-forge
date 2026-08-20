import React from 'react';

import { Check, Eye, EyeOff, Lock, Palette, Shield } from '@/lib/icons';

import { PrivacySettings } from '../types';

export interface ProfilePrivacySettingsTabProps {
  isPublic: boolean;
  privacySettings: PrivacySettings;
  coverThemeId: string;
  onTogglePublic: (isPublic: boolean) => void;
  onUpdatePrivacySetting: (key: keyof PrivacySettings, value: boolean) => void;
  onSelectCoverTheme: (themeId: string) => void;
}

export const COVER_THEME_OPTIONS = [
  { id: 'obsidian', labelAr: 'أوبسيديان فاخر', css: 'linear-gradient(135deg, #111113 0%, #1a1a1e 100%)' },
  { id: 'copper', labelAr: 'نحاسي ملكي', css: 'linear-gradient(135deg, #2b1a17 0%, #4a2820 100%)' },
  { id: 'emerald', labelAr: 'زمردي هادئ', css: 'linear-gradient(135deg, #0e271d 0%, #184232 100%)' },
  { id: 'amber', labelAr: 'عنبر وأصيل', css: 'linear-gradient(135deg, #2f2110 0%, #4f361a 100%)' },
  { id: 'cobalt', labelAr: 'كوبالت عميق', css: 'linear-gradient(135deg, #101c2e 0%, #1d2f4a 100%)' },
  { id: 'velvet', labelAr: 'مخمل ليلي', css: 'linear-gradient(135deg, #221226 0%, #381b3f 100%)' },
];

export const ProfilePrivacySettingsTab: React.FC<ProfilePrivacySettingsTabProps> = ({
  isPublic,
  privacySettings,
  coverThemeId,
  onTogglePublic,
  onUpdatePrivacySetting,
  onSelectCoverTheme,
}) => {
  return (
    <div className="space-y-5" dir="rtl">
      {/* 1. Theme Accent Selection */}
      <section className="surface-depth rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-meta font-bold text-foreground">ثيم غلاف الملف الشخصي</h2>
            <p className="text-micro text-muted-foreground">اختر النمط البصري لغلاف حسابك الشخصي</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COVER_THEME_OPTIONS.map((theme) => {
            const active = coverThemeId === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onSelectCoverTheme(theme.id)}
                className={`relative h-20 rounded-xl overflow-hidden ring-1 transition-all active:scale-95 text-start p-3 flex flex-col justify-end ${
                  active ? 'ring-2 ring-primary scale-[1.02] shadow-md' : 'ring-border/40 hover:ring-primary/40'
                }`}
                style={{ background: theme.css }}
              >
                {active && (
                  <div className="absolute top-2 end-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <span className="text-micro font-bold text-white drop-shadow-md">
                  {theme.labelAr}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Public vs Private Profile Toggle */}
      <section className="surface-depth rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-meta font-bold text-foreground">الرؤية العامة للملف الشخصي</h2>
              <p className="text-micro text-muted-foreground">سماح للآخرين بالاطلاع على ملفك عبر الرابط العام</p>
            </div>
          </div>

          <button
            onClick={() => onTogglePublic(!isPublic)}
            className={`px-4 py-2 rounded-xl text-micro font-extrabold transition-colors flex items-center gap-1.5 ${
              isPublic
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-muted/40 text-muted-foreground border border-border/50'
            }`}
          >
            {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isPublic ? 'ملف عام' : 'ملف خاص'}
          </button>
        </div>

        {/* Visibility Toggles list */}
        <div className="pt-3 border-t border-border/30 space-y-3">
          <div className="flex items-center justify-between py-1">
            <div>
              <h3 className="text-mini font-bold text-foreground">إخفاء سجل الأنشطة والإحصائيات</h3>
              <p className="text-micro text-muted-foreground">منع الزوار من رؤية إحصائياتك في اللياقة واللغات</p>
            </div>
            <input
              type="checkbox"
              checked={privacySettings.hide_activity}
              onChange={(e) => onUpdatePrivacySetting('hide_activity', e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <h3 className="text-mini font-bold text-foreground">إخفاء الموقع الجغرافي والمدينة</h3>
              <p className="text-micro text-muted-foreground">عدم عرض موقعك الحالي في رأس الملف الشخصي</p>
            </div>
            <input
              type="checkbox"
              checked={privacySettings.hide_location}
              onChange={(e) => onUpdatePrivacySetting('hide_location', e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <h3 className="text-mini font-bold text-foreground">إخفاء حالة الاتصال والحضور</h3>
              <p className="text-micro text-muted-foreground">إخفاء شارة (متصل الآن) عن الآخرين</p>
            </div>
            <input
              type="checkbox"
              checked={privacySettings.hide_online_status}
              onChange={(e) => onUpdatePrivacySetting('hide_online_status', e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
