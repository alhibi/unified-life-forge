/**
 * Profile Privacy Settings Tab — Deep Enhanced UI
 * ------------------------------------------------
 * Luxury dark-themed privacy & customization interface with
 * motion animations, refined visual hierarchy, and deep interaction design.
 * Uses the unified design system (OKLCH tokens, semantic Tailwind v4).
 */
import { AnimatePresence,motion } from 'framer-motion';
import React, { useCallback, useRef, useState } from 'react';

import {
Check, CircleDashed,
  Eye, EyeOff, Globe, Lock, Palette, Shield, ShieldCheck, Sparkles} from '@/lib/icons';

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

/* ─── Design Tokens (localized for this component) ─── */
const THEME_PRESETS: { id: string; labelAr: string; gradient: string; glow: string }[] = [
  { id: 'obsidian', labelAr: 'أوبسيديان فاخر', gradient: 'from-muted via-muted to-black', glow: 'shadow-foreground/20' },
  { id: 'copper', labelAr: 'نحاسي ملكي', gradient: 'from-signal via-signal to-signal', glow: 'shadow-signal/30' },
  { id: 'emerald', labelAr: 'زمردي هادئ', gradient: 'from-data-1 via-data-1 to-data-1', glow: 'shadow-data-1/30' },
  { id: 'amber', labelAr: 'عنبر وأصيل', gradient: 'from-signal via-signal to-signal', glow: 'shadow-signal/20' },
  { id: 'cobalt', labelAr: 'كوبالت عميق', gradient: 'from-data-4 via-data-6 to-muted', glow: 'shadow-data-4/30' },
  { id: 'velvet', labelAr: 'مخمل ليلي', gradient: 'from-data-6 via-data-6 to-data-6', glow: 'shadow-data-6/20' },
];

/* ─── Component ─── */
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
  const [animatingKey, setAnimatingKey] = useState<string | null>(null);
  const [hoverTheme, setHoverTheme] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* The account record is the single source of truth for privacy flags —
     no local cache is replayed over the loaded values on mount. */
  const handleToggle = useCallback((key: keyof PrivacySettings, value: boolean) => {
    setAnimatingKey(key);
    setTimeout(() => setAnimatingKey(null), 400);
    onUpdatePrivacySetting(key, value);
  }, [onUpdatePrivacySetting]);

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

  const activeTheme = THEME_PRESETS.find(t => t.id === coverThemeId) || THEME_PRESETS[0];

  /* Toggle label styling */
  const toggleConfig = [
    { key: 'hide_activity' as const, title: 'إخفاء سجل الأنشطة والإحصائيات', desc: 'منع الزوار من رؤية إحصائيات اللياقة واللغات والمعرفة', icon: Shield },
    { key: 'hide_location' as const, title: 'إخفاء الموقع الجغرافي', desc: 'عدم عرض موقعك الحالي في رأس الملف الشخصي', icon: Globe },
    { key: 'hide_online_status' as const, title: 'إخفاء حالة الاتصال', desc: 'إخفاء شارة (متصل الآن) عن الزوار الآخرين', icon: Lock },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* ═══════ Cover Theme Selection ═══════ */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="surface-depth rounded-[1.75rem] p-6 md:p-7 space-y-5 overflow-hidden relative"
      >
        {/* Ambient decorative glow (subtle, luxury touch) */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-gradient-to-br from-signal/5 via-transparent to-transparent blur-3xl -translate-x-1/3 -translate-y-1/3 pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-signal/20 to-signal/30 flex items-center justify-center shadow-inner ring-1 ring-signal/20">
            <Palette className="w-5 h-5 text-signal" />
          </div>
          <div>
            <h2 className="text-[1.05rem] font-extrabold text-foreground tracking-tight leading-tight">ثيم غلاف الملف الشخصي</h2>
            <p className="text-[0.7rem] text-muted-foreground font-medium tracking-wide">اختر النمط البصري الذي يعكس هويتك الرقمية</p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 relative z-10">
          {THEME_PRESETS.map((theme) => {
            const active = coverThemeId === theme.id;
            const isHovered = hoverTheme === theme.id;
            return (
              <motion.button
                key={theme.id}
                onMouseEnter={() => setHoverTheme(theme.id)}
                onMouseLeave={() => setHoverTheme(null)}
                onClick={() => onSelectCoverTheme(theme.id)}
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -3 }}
                className={`relative h-24 rounded-2xl overflow-hidden ring-1 transition-shadow duration-normal group ${
                  active
                    ? 'ring-2 ring-signal/60 shadow-lg shadow-signal/10 scale-[1.03]'
                    : 'ring-white/10 hover:ring-white/20 hover:shadow-xl'
                } ${isHovered ? theme.glow : ''}`}
                aria-label={theme.labelAr}
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-90`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                {/* Decorative sparkle */}
                <Sparkles className={`absolute top-2.5 end-2.5 w-3.5 h-3.5 transition-opacity duration-normal ${active ? 'text-signal/90 opacity-100' : 'text-white/20 opacity-0 group-hover:opacity-50'}`} />

                {/* Label */}
                <div className="absolute inset-x-0 bottom-2.5 px-2.5 flex flex-col items-center">
                  <span className="text-[0.65rem] font-extrabold text-white drop-shadow-lg tracking-wide leading-snug">{theme.labelAr}</span>
                </div>

                {/* Active ring indicator */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="absolute top-2 start-2 w-5 h-5 rounded-full bg-signal/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-signal/40"
                    >
                      <Check className="w-3 h-3 text-signal" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Subtle texture overlay */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_30%_20%,_white_1px,_transparent_1px)] bg-[length:12px_12px]" />
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* ═══════ Profile Visibility ═══════ */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="surface-depth rounded-[1.75rem] p-6 md:p-7 space-y-5 overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-gradient-to-bl from-data-6/5 via-transparent to-transparent blur-3xl -translate-y-1/4 translate-x-1/3 pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-data-6/15 to-data-6/20 flex items-center justify-center shadow-inner ring-1 ring-data-6/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-data-6" />
            </div>
            <div>
              <h2 className="text-[1.05rem] font-extrabold text-foreground tracking-tight">الرؤية العامة للملف</h2>
              <p className="text-[0.7rem] text-muted-foreground font-medium tracking-wide leading-relaxed">تحكم في من يرى هويتك الرقمية ومحتواك الشخصي</p>
            </div>
          </div>

          {/* Elegant toggle pill */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onTogglePublic(!isPublic)}
            className={`relative overflow-hidden rounded-2xl px-5 py-2.5 text-[0.75rem] font-extrabold transition-motion duration-normal shadow-lg min-w-[120px] ${
              isPublic
                ? 'bg-gradient-to-r from-data-1/15 to-data-1/10 text-data-1 ring-1 ring-data-1/30 shadow-data-1/10'
                : 'bg-gradient-to-r from-muted/40 to-muted/50 text-muted-foreground ring-1 ring-white/5 shadow-foreground/20'
            }`}
            aria-pressed={isPublic}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {isPublic ? 'ملف عام' : 'ملف خاص'}
            </span>
            {/* Animated background shimmer */}
            <motion.div
              layoutId="public-shimmer"
              className={`absolute inset-0 ${isPublic ? 'bg-gradient-to-r from-data-1/10 via-transparent to-transparent' : 'bg-gradient-to-r from-muted/10 via-transparent to-transparent'}`}
              transition={{ duration: 0.5 }}
            />
          </motion.button>
        </div>

        {/* Divider with decorative dots */}
        <div className="relative z-10 flex items-center gap-2 opacity-30">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-border" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Visibility toggles */}
        <div className="space-y-1 relative z-10">
          {toggleConfig.map((cfg) => {
            const active = privacySettings[cfg.key];
            const Icon = cfg.icon;
            const isAnimating = animatingKey === cfg.key;
            return (
              <motion.div
                key={cfg.key}
                layout
                className="group flex items-center justify-between rounded-2xl px-4 py-4 hover:bg-white/[0.02] transition-colors duration-fast"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-normal ${
                    active ? 'bg-data-6/15 text-data-6' : 'bg-muted/40 text-muted-foreground/60 group-hover:bg-muted/60'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[0.82rem] font-extrabold text-foreground tracking-tight">{cfg.title}</h3>
                    <p className="text-[0.65rem] text-muted-foreground/70 font-medium leading-relaxed">{cfg.desc}</p>
                  </div>
                </div>

                <motion.button
                  onClick={() => handleToggle(cfg.key, !active)}
                  aria-checked={active}
                  className={`relative w-11 h-6 rounded-full transition-motion duration-normal shadow-inner ${
                    active
                      ? 'bg-gradient-to-r from-data-6/30 to-data-6/20 shadow-data-6/10 ring-1 ring-data-6/25'
                      : 'bg-muted/60 ring-1 ring-white/5'
                  }`}
                  whileTap={{ scaleX: 0.92 }}
                >
                  {/* Track */}
                  <span className={`absolute inset-0 rounded-full transition-opacity duration-normal ${active ? 'opacity-100' : 'opacity-40'}`} />

                  {/* Thumb */}
                  <motion.span
                    layout
                    animate={{ x: active ? 22 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`absolute top-1 w-4 h-4 rounded-full shadow-md flex items-center justify-center ${
                      active ? 'bg-gradient-to-br from-data-6 to-data-6 shadow-data-6/30' : 'bg-secondary0 shadow-foreground/50'
                    }`}
                  >
                    <AnimatePresence>
                      {isAnimating && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CircleDashed className="w-2 h-2 text-white/80" />
                        </motion.div>
                      )}
                      {!isAnimating && active && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </AnimatePresence>
                  </motion.span>
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 relative z-10">
          {onResetSettings && (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="flex-1 px-5 py-3 rounded-2xl text-[0.75rem] font-bold text-muted-foreground bg-muted/30 hover:bg-muted/50 border border-white/[0.06] hover:border-white/[0.1] transition-motion duration-normal shadow-inner shadow-black/5"
            >
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                إعادة الضبط
              </span>
            </motion.button>
          )}
          {onExportSettings && (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              className="flex-1 px-5 py-3 rounded-2xl text-[0.75rem] font-extrabold text-signal bg-gradient-to-br from-signal/10 to-signal/5 hover:from-signal/20 hover:to-signal/10 border border-signal/20 hover:border-signal/30 transition-motion duration-normal shadow-lg shadow-signal/5"
            >
              <span className="flex items-center justify-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                تصدير الإعدادات
              </span>
            </motion.button>
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
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleImport}
                className="flex-1 px-5 py-3 rounded-2xl text-[0.75rem] font-extrabold text-data-6 bg-gradient-to-br from-data-6/10 to-data-6/5 hover:from-data-6/20 hover:to-data-6/10 border border-data-6/20 hover:border-data-6/30 transition-motion duration-normal shadow-lg shadow-data-6/5"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  استيراد الإعدادات
                </span>
              </motion.button>
            </>
          )}
        </div>
      </motion.section>

      {/* ═══════ Privacy Status Summary ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="surface-depth rounded-[1.75rem] p-5 md:p-6 overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-gradient-to-br from-data-1/5 via-transparent to-transparent blur-2xl -translate-x-1/3 -translate-y-1/4 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-data-1/15 to-data-1/20 flex items-center justify-center shadow-inner ring-1 ring-data-1/20">
            <Shield className="w-4 h-4 text-data-1" />
          </div>
          <div>
            <h3 className="text-[0.9rem] font-extrabold text-foreground">حالة الحماية الحالية</h3>
            <p className="text-[0.65rem] text-muted-foreground font-medium">ملخص سريع لإعدادات الخصوصية المفعلة</p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            { label: 'الرؤية العامة', value: isPublic ? 'عام' : 'خاص', active: true },
            { label: 'الأنشطة المخفية', value: privacySettings.hide_activity ? 'مخفي' : 'ظاهر', active: privacySettings.hide_activity },
            { label: 'الموقع مخفي', value: privacySettings.hide_location ? 'مخفي' : 'ظاهر', active: privacySettings.hide_location },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl p-3.5 text-center transition-motion duration-normal border ${
                item.active
                  ? 'bg-gradient-to-b from-data-1/[0.06] to-transparent border-data-1/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                  : 'bg-muted/20 border-white/[0.04] opacity-70'
              }`}
            >
              <div className={`text-[0.625rem] font-bold mb-1.5 tracking-wide ${item.active ? 'text-data-1/80' : 'text-muted-foreground/40'}`}>
                {item.label}
              </div>
              <div className={`text-[0.8rem] font-extrabold ${item.active ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Active settings badges */}
        <div className="relative z-10 flex flex-wrap gap-2 mt-4">
          {[
            { active: privacySettings.hide_activity, label: 'إخفاء الأنشطة' },
            { active: privacySettings.hide_location, label: 'إخفاء الموقع' },
            { active: privacySettings.hide_online_status, label: 'إخفاء الحالة' },
            { active: isPublic, label: 'ملف عام' },
          ].filter(s => s.active).map(s => (
            <span
              key={s.label}
              className="px-2.5 py-1 rounded-full text-[0.625rem] font-extrabold bg-gradient-to-r from-data-1/10 to-data-1/5 text-data-1/80 border border-data-1/15 shadow-inner shadow-data-1/5"
            >
              {s.label}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
