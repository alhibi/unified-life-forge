import { useEffect, useRef, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, RefreshCcw, Save, Trash2, Upload } from '@/lib/icons';
import {
  createSavedInterfaceProfile,
  INTERFACE_PROFILES_STORAGE_KEY,
  INTERFACE_PROFILES_VERSION,
  type InterfaceProfileSettings,
  MAX_INTERFACE_PROFILE_IMPORT_BYTES,
  MAX_INTERFACE_PROFILES,
  parseInterfaceProfilesImport,
  readInterfaceProfiles,
  type SavedInterfaceProfile,
  writeInterfaceProfiles,
} from '@/lib/interfaceProfiles';
import { DENSITY_LEVELS, SURFACE_MATERIAL_OPTIONS, WIDTH_OPTIONS } from '@/lib/interfaceScale';

import { FeedbackLine, SettingsSection } from '../AppearancePrimitives';

interface InterfaceProfilesProps {
  /** Snapshot the full current configuration for saving. */
  capture: () => InterfaceProfileSettings;
  /** Apply a complete configuration, geometry and advanced alike. */
  apply: (settings: InterfaceProfileSettings) => void;
  /** Restore only the interface platform to its shipped values. */
  reset: () => void;
  icon: React.ReactNode;
}

/**
 * Named, portable interface profiles.
 *
 * A profile carries the complete 26-field configuration and nothing else: no
 * identity, no account data, no other feature's settings. Documents exported
 * before the v3 upgrade still import — the fields they lack resolve to their
 * defaults, which is exactly the geometry they were saved with.
 */
export default function InterfaceProfiles({ capture, apply, reset, icon }: InterfaceProfilesProps) {
  const [profiles, setProfiles] = useState<SavedInterfaceProfile[]>(readInterfaceProfiles);
  const [profileName, setProfileName] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncProfiles = (event: StorageEvent) => {
      if (event.key === INTERFACE_PROFILES_STORAGE_KEY || event.key === null) {
        setProfiles(readInterfaceProfiles());
      }
    };
    window.addEventListener('storage', syncProfiles);
    return () => window.removeEventListener('storage', syncProfiles);
  }, []);

  const saveProfile = () => {
    const currentProfiles = readInterfaceProfiles();
    if (currentProfiles.length >= MAX_INTERFACE_PROFILES) {
      setProfiles(currentProfiles);
      setFeedback({ tone: 'error', message: 'وصلت إلى الحد الأقصى: ٨ ملفات واجهة.' });
      return;
    }
    const name = profileName.trim() || `ملف واجهة ${currentProfiles.length + 1}`;
    const next = writeInterfaceProfiles([
      ...currentProfiles,
      createSavedInterfaceProfile(name, capture()),
    ]);
    setProfiles(next);
    setProfileName('');
    setFeedback({ tone: 'success', message: `حُفظ «${name}» بإعدادات الواجهة الحالية.` });
  };

  const applyProfile = (profile: SavedInterfaceProfile) => {
    apply(profile.settings);
    setFeedback({ tone: 'success', message: `طُبّق «${profile.name}» بالكامل.` });
  };

  const deleteProfile = (id: string) => {
    const currentProfiles = readInterfaceProfiles();
    const profile = currentProfiles.find((item) => item.id === id);
    const next = writeInterfaceProfiles(currentProfiles.filter((item) => item.id !== id));
    setProfiles(next);
    setFeedback({
      tone: 'success',
      message: profile ? `حُذف «${profile.name}».` : 'حُذف ملف الواجهة.',
    });
  };

  const exportProfiles = () => {
    const currentProfiles = readInterfaceProfiles();
    setProfiles(currentProfiles);
    if (currentProfiles.length === 0) {
      setFeedback({ tone: 'error', message: 'احفظ ملف واجهة واحداً على الأقل قبل التصدير.' });
      return;
    }
    const blob = new Blob(
      [JSON.stringify({ version: INTERFACE_PROFILES_VERSION, profiles: currentProfiles }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'interface-profiles.json';
    document.body.appendChild(anchor);
    try {
      anchor.click();
      setFeedback({ tone: 'success', message: 'صُدّرت ملفات الواجهة بصيغة JSON.' });
    } finally {
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  };

  const importProfiles = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_INTERFACE_PROFILE_IMPORT_BYTES) {
      setFeedback({
        tone: 'error',
        message: 'حجم ملف الواجهة أكبر من الحد المسموح (٢٥٦ كيلوبايت).',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      const imported = parseInterfaceProfilesImport(await file.text());
      if (!imported) {
        setFeedback({ tone: 'error', message: 'تعذر قراءة الملف. اختر ملف واجهة JSON صالحاً.' });
        return;
      }
      const currentProfiles = readInterfaceProfiles();
      const room = MAX_INTERFACE_PROFILES - currentProfiles.length;
      if (room <= 0) {
        setProfiles(currentProfiles);
        setFeedback({ tone: 'error', message: 'احذف ملفاً محفوظاً قبل الاستيراد.' });
        return;
      }
      const stamp = Date.now();
      const additions = imported.slice(0, room).map((profile, index) => ({
        ...profile,
        id: `imported-${stamp}-${index}`,
      }));
      const skipped = imported.length - additions.length;
      const next = writeInterfaceProfiles([...currentProfiles, ...additions]);
      setProfiles(next);
      setFeedback({
        tone: 'success',
        message:
          skipped > 0
            ? `استُورد ${additions.length} وتُرك ${skipped} لبلوغ حد الملفات الثمانية.`
            : `استُورد ${additions.length} من ملفات الواجهة بنجاح.`,
      });
    } catch {
      setFeedback({ tone: 'error', message: 'حدث خطأ أثناء قراءة ملف الاستيراد.' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resetInterface = () => {
    reset();
    setFeedback({ tone: 'success', message: 'عادت إعدادات الواجهة فقط إلى قيمها الافتراضية.' });
  };

  const summarize = (settings: InterfaceProfileSettings) => {
    const density = DENSITY_LEVELS.find((entry) => entry.id === settings.density)?.label;
    const material = SURFACE_MATERIAL_OPTIONS.find(
      (entry) => entry.id === settings.surfaceMaterial,
    )?.label;
    const width = WIDTH_OPTIONS.find((entry) => entry.id === settings.width)?.label;
    return `${Math.round(settings.uiScale * 100)}٪ · ${density} · ${width} · ${material}`;
  };

  return (
    <SettingsSection
      title="ملفات الواجهة"
      subtitle="احفظ إعدادات الواجهة وحدها أو انقلها بصيغة JSON"
      icon={icon}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
          maxLength={48}
          placeholder={`ملف واجهة ${profiles.length + 1}`}
          aria-label="اسم ملف الواجهة"
        />
        <Button
          type="button"
          onClick={saveProfile}
          disabled={profiles.length >= MAX_INTERFACE_PROFILES}
        >
          <Save aria-hidden />
          حفظ الحالي
        </Button>
      </div>

      {profiles.length > 0 ? (
        <div className="space-y-2" aria-label="ملفات الواجهة المحفوظة">
          {profiles.map((profile) => (
            <AppCard key={profile.id} compact flat className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyProfile(profile)}
                className="min-h-[var(--ui-touch-min)] min-w-0 flex-1 text-start"
              >
                <span className="block truncate text-body font-medium text-foreground">
                  {profile.name}
                </span>
                <span className="block truncate text-mini text-muted-foreground">
                  {summarize(profile.settings)}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteProfile(profile.id)}
                aria-label={`حذف ${profile.name}`}
              >
                <Trash2 aria-hidden />
              </Button>
            </AppCard>
          ))}
        </div>
      ) : (
        <p className="text-mini text-muted-foreground">لا توجد ملفات محفوظة بعد.</p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button type="button" variant="secondary" onClick={exportProfiles}>
          <Download aria-hidden />
          تصدير
        </Button>
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload aria-hidden />
          استيراد
        </Button>
        <Button type="button" variant="outline" onClick={resetInterface}>
          <RefreshCcw aria-hidden />
          إعادة الضبط
        </Button>
      </div>
      <Input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="اختيار ملف واجهة JSON للاستيراد"
        onChange={(event) => void importProfiles(event.target.files?.[0])}
      />

      {feedback ? <FeedbackLine tone={feedback.tone} message={feedback.message} /> : null}
      <p className="text-micro text-muted-foreground">
        الحد الأقصى ٨ ملفات. يحفظ الملف ٢٦ إعداداً كاملاً، ولا يتضمن بيانات الحساب أو إعدادات
        الميزات الأخرى.
      </p>
    </SettingsSection>
  );
}
