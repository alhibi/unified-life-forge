/**
 * Profile Privacy Settings Tab — unified design system.
 *
 * Was: a dark "luxury" wall of gradients, glows and hand-rolled switch knobs
 * (14 shadows + 20 gradients in one file). Now: grouped AppList rows, the
 * shared Switch, and flat surfaces. The persistence contract is unchanged —
 * same PrivacySettings keys and the same public / reset / export / import
 * callbacks.
 */
import React, { useCallback, useRef } from 'react';

import { AppCard, AppList, AppRow, IconChip, Stat, StatGrid } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Check,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Palette,
  Shield,
  ShieldCheck,
  Sparkles,
} from '@/lib/icons';

import { PrivacySettings } from '../types';

export interface ProfilePrivacySettingsTabProps {
  isPublic: boolean;
  privacySettings: PrivacySettings;
  coverThemeId: string;
  onTogglePublic: (isPublic: boolean) => void;
  onUpdatePrivacySetting: (key: keyof PrivacySettings, value: boolean) => void;
  onSelectCoverTheme: (themeId: string) => void;
  onExportSettings?: (settings: PrivacySettings) => void;
  onImportSettings?: (settings: PrivacySettings) => void;
  onResetSettings?: () => void;
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  hide_activity: false,
  hide_location: false,
  hide_online_status: false,
};

/** Cover themes are identity keys — labels only, no gradient art. */
const THEME_PRESETS: { id: string; labelAr: string }[] = [
  { id: 'obsidian', labelAr: 'أوبسيديان فاخر' },
  { id: 'copper', labelAr: 'نحاسي ملكي' },
  { id: 'emerald', labelAr: 'زمردي هادئ' },
  { id: 'amber', labelAr: 'عنبر وأصيل' },
  { id: 'cobalt', labelAr: 'كوبالت عميق' },
  { id: 'velvet', labelAr: 'مخمل ليلي' },
];

const TOGGLE_CONFIG = [
  {
    key: 'hide_activity' as const,
    title: 'إخفاء سجل الأنشطة والإحصائيات',
    desc: 'منع الزوار من رؤية إحصائيات اللياقة واللغات والمعرفة',
    icon: Shield,
  },
  {
    key: 'hide_location' as const,
    title: 'إخفاء الموقع الجغرافي',
    desc: 'عدم عرض موقعك الحالي في رأس الملف الشخصي',
    icon: Globe,
  },
  {
    key: 'hide_online_status' as const,
    title: 'إخفاء حالة الاتصال',
    desc: 'إخفاء شارة (متصل الآن) عن الزوار الآخرين',
    icon: Lock,
  },
];

export const ProfilePrivacySettingsTab: React.FC<ProfilePrivacySettingsTabProps> = ({
  isPublic,
  privacySettings,
  coverThemeId,
  onTogglePublic,
  onUpdatePrivacySetting,
  onSelectCoverTheme,
  onExportSettings,
  onImportSettings,
  onResetSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* The account record is the single source of truth for privacy flags —
     no local cache is replayed over the loaded values on mount. */
  const handleExport = useCallback(() => {
    onExportSettings?.(privacySettings);
  }, [onExportSettings, privacySettings]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.hide_activity !== undefined && parsed.hide_location !== undefined && parsed.hide_online_status !== undefined) {
          onImportSettings?.(parsed);
        }
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  }, [onImportSettings]);

  const handleReset = useCallback(() => {
    const defaults: PrivacySettings = { ...DEFAULT_PRIVACY_SETTINGS };
    onUpdatePrivacySetting('hide_activity', defaults.hide_activity);
    onUpdatePrivacySetting('hide_location', defaults.hide_location);
    onUpdatePrivacySetting('hide_online_status', defaults.hide_online_status);
  }, [onUpdatePrivacySetting]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ═══════ Cover Theme Selection ═══════ */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <IconChip size="sm" aria-hidden>
            <Palette className="h-4 w-4" />
          </IconChip>
          <div>
            <h2 className="text-body font-bold text-foreground">ثيم غلاف الملف الشخصي</h2>
            <p className="text-micro text-muted-foreground">اختر النمط البصري الذي يعكس هويتك الرقمية</p>
          </div>
        </div>

        <AppList>
          {THEME_PRESETS.map((theme) => {
            const active = coverThemeId === theme.id;
            return (
              <AppRow
                key={theme.id}
                onClick={() => onSelectCoverTheme(theme.id)}
                title={theme.labelAr}
                aria-pressed={active}
              >
                {active && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
              </AppRow>
            );
          })}
        </AppList>
      </section>

      {/* ═══════ Profile Visibility ═══════ */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <IconChip size="sm" aria-hidden>
            <ShieldCheck className="h-4 w-4" />
          </IconChip>
          <div>
            <h2 className="text-body font-bold text-foreground">الرؤية العامة للملف</h2>
            <p className="text-micro text-muted-foreground">تحكم في من يرى هويتك الرقمية ومحتواك الشخصي</p>
          </div>
        </div>

        <AppList>
          <AppRow
            as="div"
            leading={
              <IconChip size="sm" tone={isPublic ? 'success' : 'plain'} aria-hidden>
                {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </IconChip>
            }
            title={isPublic ? 'ملف عام' : 'ملف خاص'}
          >
            <Switch
              checked={isPublic}
              onCheckedChange={onTogglePublic}
              aria-label="الرؤية العامة للملف"
            />
          </AppRow>

          {TOGGLE_CONFIG.map((cfg) => {
            const active = privacySettings[cfg.key];
            const Icon = cfg.icon;
            return (
              <AppRow
                key={cfg.key}
                as="div"
                leading={
                  <IconChip size="sm" tone="plain" aria-hidden>
                    <Icon className="h-4 w-4" />
                  </IconChip>
                }
                title={cfg.title}
                subtitle={cfg.desc}
              >
                <Switch
                  checked={active}
                  onCheckedChange={(value) => onUpdatePrivacySetting(cfg.key, value)}
                  aria-label={cfg.title}
                />
              </AppRow>
            );
          })}
        </AppList>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {onResetSettings && (
            <Button variant="secondary" className="flex-1 gap-2" onClick={handleReset}>
              <Lock className="w-3.5 h-3.5" aria-hidden />
              إعادة الضبط
            </Button>
          )}
          {onExportSettings && (
            <Button variant="secondary" className="flex-1 gap-2" onClick={handleExport}>
              <Shield className="w-3.5 h-3.5" aria-hidden />
              تصدير الإعدادات
            </Button>
          )}
          {onImportSettings && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                aria-hidden="true"
              />
              <Button variant="secondary" className="flex-1 gap-2" onClick={handleImport}>
                <Sparkles className="w-3.5 h-3.5" aria-hidden />
                استيراد الإعدادات
              </Button>
            </>
          )}
        </div>
      </section>

      {/* ═══════ Privacy Status Summary ═══════ */}
      <AppCard className="space-y-4">
        <div className="flex items-center gap-3">
          <IconChip size="sm" aria-hidden>
            <Shield className="h-4 w-4" />
          </IconChip>
          <div>
            <h3 className="text-meta font-bold text-foreground">حالة الحماية الحالية</h3>
            <p className="text-micro text-muted-foreground">ملخص سريع لإعدادات الخصوصية المفعلة</p>
          </div>
        </div>

        <StatGrid cols={3}>
          <Stat value={isPublic ? 'عام' : 'خاص'} label="الرؤية العامة" />
          <Stat
            value={privacySettings.hide_activity ? 'مخفي' : 'ظاهر'}
            label="الأنشطة المخفية"
          />
          <Stat
            value={privacySettings.hide_location ? 'مخفي' : 'ظاهر'}
            label="الموقع مخفي"
          />
        </StatGrid>

        {/* Active settings badges */}
        <div className="flex flex-wrap gap-2">
          {[
            { active: privacySettings.hide_activity, label: 'إخفاء الأنشطة' },
            { active: privacySettings.hide_location, label: 'إخفاء الموقع' },
            { active: privacySettings.hide_online_status, label: 'إخفاء الحالة' },
            { active: isPublic, label: 'ملف عام' },
          ]
            .filter((s) => s.active)
            .map((s) => (
              <span
                key={s.label}
                className="px-2.5 py-1 rounded-full text-micro font-bold bg-primary/10 text-primary"
              >
                {s.label}
              </span>
            ))}
        </div>
      </AppCard>
    </div>
  );
};
