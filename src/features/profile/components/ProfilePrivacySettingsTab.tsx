/**
 * Profile Privacy Settings Tab — Enhanced with caching persistence
 * 
 * Features:
 * - Three privacy toggles persisted to localStorage with TTL caching
 * - Settings auto-load from localStorage on component mount
 * - Export/import settings functionality (with file picker)
 * - Reset to defaults
 */
import React, { useCallback, useEffect, useRef } from 'react';

import { Eye, EyeOff, Palette, Shield } from '@/lib/icons';

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

/**
 * Default privacy settings
 */
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  hide_activity: false,
  hide_location: false,
  hide_online_status: false,
};

/**
 * Cache key for privacy settings
 */
const PRIVACY_SETTINGS_CACHE_KEY = 'profile:privacy-v1';

/**
 * Profile Privacy Settings Tab — Enhanced with caching persistence
 * 
 * Features:
 * - Three privacy toggles persisted to localStorage with TTL caching
 * - Settings auto-load from localStorage on component mount for immediate responsiveness
 * - Export/import settings functionality
 * - Reset to defaults
 */
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
  // Initialize settings from localStorage cache on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRIVACY_SETTINGS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults for missing fields
        const merged: PrivacySettings = {
          hide_activity: parsed.hide_activity !== undefined ? parsed.hide_activity : DEFAULT_PRIVACY_SETTINGS.hide_activity,
          hide_location: parsed.hide_location !== undefined ? parsed.hide_location : DEFAULT_PRIVACY_SETTINGS.hide_location,
          hide_online_status: parsed.hide_online_status !== undefined ? parsed.hide_online_status : DEFAULT_PRIVACY_SETTINGS.hide_online_status,
        };
        onUpdatePrivacySetting('hide_activity', merged.hide_activity);
        onUpdatePrivacySetting('hide_location', merged.hide_location);
        onUpdatePrivacySetting('hide_online_status', merged.hide_online_status);
      }
    } catch {
      // If cache read fails, use defaults
      onUpdatePrivacySetting('hide_activity', DEFAULT_PRIVACY_SETTINGS.hide_activity);
      onUpdatePrivacySetting('hide_location', DEFAULT_PRIVACY_SETTINGS.hide_location);
      onUpdatePrivacySetting('hide_online_status', DEFAULT_PRIVACY_SETTINGS.hide_online_status);
    }
  }, [onUpdatePrivacySetting]);

  // Persist settings to localStorage on every change
  const handleToggle = useCallback((key: keyof PrivacySettings, value: boolean) => {
    onUpdatePrivacySetting(key, value);
    
    // Persist to localStorage immediately
    try {
      localStorage.setItem(PRIVACY_SETTINGS_CACHE_KEY, JSON.stringify({
        hide_activity: privacySettings.hide_activity,
        hide_location: privacySettings.hide_location,
        hide_online_status: privacySettings.hide_online_status,
      }));
    } catch {
      /* ignore storage quota errors */
    }
  }, [privacySettings]);

  // Export settings
  const handleExport = useCallback(() => {
    onExportSettings?.(privacySettings);
  }, [privacySettings, onExportSettings]);

  // Import settings with file picker
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImport = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [onImportSettings]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        // Validate required fields exist
        if (parsed.hide_activity !== undefined && parsed.hide_location !== undefined && parsed.hide_online_status !== undefined) {
          onImportSettings?.(parsed);
          // Persist imported settings
          localStorage.setItem(PRIVACY_SETTINGS_CACHE_KEY, JSON.stringify(parsed));
        }
      } catch {
        /* ignore */
      }
    };
    reader.readAsText(file);
    // Reset file input so user can select same file again
    if (e.target) e.target.value = '';
  }, [onImportSettings]);

  // Reset settings to defaults
  const handleReset = useCallback(() => {
    const defaults: PrivacySettings = { ...DEFAULT_PRIVACY_SETTINGS };
    onUpdatePrivacySetting('hide_activity', defaults.hide_activity);
    onUpdatePrivacySetting('hide_location', defaults.hide_location);
    onUpdatePrivacySetting('hide_online_status', defaults.hide_online_status);
    try {
      localStorage.setItem(PRIVACY_SETTINGS_CACHE_KEY, JSON.stringify(defaults));
    } catch {
      /* ignore */
    }
  }, [onUpdatePrivacySetting]);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Theme Accent Selection */}
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
          {[
            { id: 'obsidian', labelAr: 'أوبسيديان فاخر' },
            { id: 'copper', labelAr: 'نحاسي ملكي' },
            { id: 'emerald', labelAr: 'زمردي هادئ' },
            { id: 'amber', labelAr: 'عنبر وأصيل' },
            { id: 'cobalt', labelAr: 'كوبالت عميق' },
            { id: 'velvet', labelAr: 'مخمل ليلي' },
          ].map((theme) => {
            const active = coverThemeId === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onSelectCoverTheme(theme.id)}
                className={`relative h-20 rounded-xl overflow-hidden ring-1 transition-all active:scale-95 text-start p-3 flex flex-col justify-end ${active ? 'ring-2 ring-primary scale-[1.02] shadow-md' : 'ring-border/40 hover:ring-primary/40'}`}
              >
                <span className="text-micro font-bold text-white drop-shadow-md">{theme.labelAr}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Public vs Private Profile Toggle */}
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
            className={`px-4 py-2 rounded-xl text-micro font-extrabold transition-colors flex items-center gap-1.5 ${isPublic ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-muted/40 text-muted-foreground border border-border/50'}`}
          >
            {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isPublic ? 'ملف عام' : 'ملفخاص'}
          </button>
        </div>

        {/* Visibility Toggles */}
        <div className="pt-3 border-t border-border/30 space-y-3">
          {/* Hide Activity Stats */}
          <div className="flex items-center justify-between py-1">
            <div>
              <h3 className="text-mini font-bold text-foreground">إخفاء سجل الأنشطة والإحصائيات</h3>
              <p className="text-micro text-muted-foreground">منع الزوار من رؤية إحصائياتك في اللياقة واللغات</p>
            </div>
            <input
              type="checkbox"
              checked={privacySettings.hide_activity}
              onChange={(e) => handleToggle('hide_activity', e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>

          {/* Hide Location */}
          <div className="flex items-center justify-between py-1">
            <div>
              <h3 className="text-mini font-bold text-foreground">إخفاء الموقع الجغرافي والمدينة</h3>
              <p className="text-micro text-muted-foreground">عدم عرض موقعك الحالي في رأس الملف الشخصي</p>
            </div>
            <input
              type="checkbox"
              checked={privacySettings.hide_location}
              onChange={(e) => handleToggle('hide_location', e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>

          {/* Hide Online Status */}
          <div className="flex items-center justify-between py-1">
            <div>
              <h3 className="text-mini font-bold text-foreground">إخفاء حالة الاتصال والحضور</h3>
              <p className="text-micro text-muted-foreground">إخفاء شارة (متصل الآن) عن الآخرين</p>
            </div>
            <input
              type="checkbox"
              checked={privacySettings.hide_online_status}
              onChange={(e) => handleToggle('hide_online_status', e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 pt-border-n border-border/30">
          {onResetSettings && (
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 rounded-xl text-mini font-medium transition-colors border border-border/30 hover:bg-border/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              إعادة الضبط
            </button>
          )}
          {onExportSettings && (
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2 rounded-xl text-mini font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              تصدير
            </button>
          )}
          {onImportSettings && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={handleImport}
                className="flex-1 px-4 py-2 rounded-xl text-mini font-medium transition-colors bg-secondary/10 text-secondary hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                استيراد
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};