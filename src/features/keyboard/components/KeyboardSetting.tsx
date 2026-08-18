import { useState } from 'react';

import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { Switch } from '@/components/ui/switch';
import { Keyboard, Palette } from '@/lib/icons';

import {
  type KeyboardSettings,
  readKeyboardSettings,
  supportsSoftKeyboard,
  writeKeyboardSettings,
} from '../lib/preference';

interface KeyboardSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardSettingsModal({ open, onOpenChange }: KeyboardSettingsModalProps) {
  const [settings, setSettings] = useState<KeyboardSettings>(() => readKeyboardSettings());

  const update = (patch: Partial<KeyboardSettings>) => {
    const next = writeKeyboardSettings(patch);
    setSettings(next);
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="تخصيص لوحة المفاتيح"
      description="إعدادات متقدمة للوحة المفاتيح الذكية"
    >
      <div className="space-y-4 p-4 text-start" dir="rtl">
        {/* Theme Options */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-mini font-semibold text-foreground">
            <Palette className="h-4 w-4 text-[hsl(var(--live))]" />
            <span>المظهر والسمة (Theme)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'gboard-dark', label: 'داكن Gboard' },
              { id: 'gboard-light', label: 'فاتح Gboard' },
              { id: 'oled', label: 'أسود OLED' },
              { id: 'luxury-gold', label: 'ذهبي فاخر' },
              { id: 'sand', label: 'رملي كلاسيك' },
            ].map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => update({ theme: theme.id as any })}
                className={`flex h-10 items-center justify-center rounded-xl border text-micro font-medium transition-all ${
                  settings.theme === theme.id
                    ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/20 text-[hsl(var(--live))] font-semibold'
                    : 'border-border/40 bg-[hsl(var(--surface-2))] text-muted-foreground hover:text-foreground'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Height Options */}
        <div className="space-y-2 pt-2 border-t border-border/30">
          <label className="flex items-center gap-2 text-mini font-semibold text-foreground">
            <Keyboard className="h-4 w-4 text-[hsl(var(--live))]" />
            <span>ارتفاع لوحة المفاتيح</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'compact', label: 'مدمج' },
              { id: 'normal', label: 'طبيعي' },
              { id: 'tall', label: 'مرتفع' },
            ].map((height) => (
              <button
                key={height.id}
                type="button"
                onClick={() => update({ keyHeight: height.id as any })}
                className={`flex h-9 items-center justify-center rounded-xl border text-micro font-medium transition-all ${
                  settings.keyHeight === height.id
                    ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/20 text-[hsl(var(--live))] font-semibold'
                    : 'border-border/40 bg-[hsl(var(--surface-2))] text-muted-foreground hover:text-foreground'
                }`}
              >
                {height.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">التصحيح التلقائي الخفيف</p>
              <p className="text-micro text-muted-foreground">استبدال الأخطاء الشائعة تلقائياً مع إمكانية التراجع بـ Backspace</p>
            </div>
            <Switch
              checked={settings.autoCorrectionEnabled}
              onCheckedChange={(checked) => update({ autoCorrectionEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">سطر الأرقام العلوي</p>
              <p className="text-micro text-muted-foreground">عرض سطر الأرقام دائماً أعلى الحروف</p>
            </div>
            <Switch
              checked={settings.showNumberRow}
              onCheckedChange={(checked) => update({ showNumberRow: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">معاينة الحروف عند الضغط Popup</p>
              <p className="text-micro text-muted-foreground">عرض مكبّر الحرف أعلى الإصبع عند النقر</p>
            </div>
            <Switch
              checked={settings.showKeyPressPopup}
              onCheckedChange={(checked) => update({ showKeyPressPopup: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">صوت الضغط على المفاتيح</p>
              <p className="text-micro text-muted-foreground">تفعيل صوت نقر خفيف عند الكتابة</p>
            </div>
            <Switch
              checked={settings.soundOnClick}
              onCheckedChange={(checked) => update({ soundOnClick: checked, soundEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">الاهتزاز والتغذية الراجعة (Haptics)</p>
              <p className="text-micro text-muted-foreground">اهتزاز خفيف عند النقر على المفاتيح</p>
            </div>
            <Switch
              checked={settings.vibrateOnKeyPress}
              onCheckedChange={(checked) => update({ vibrateOnKeyPress: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">حافظة النصوص والنسخ السريع</p>
              <p className="text-micro text-muted-foreground">حفظ النصوص المنسوخة لاستخدامها في اللوحة</p>
            </div>
            <Switch
              checked={settings.clipboardEnabled}
              onCheckedChange={(checked) => update({ clipboardEnabled: checked })}
            />
          </div>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}

/**
 * Settings Row Component for Keyboard Settings page.
 */
export default function KeyboardSetting() {
  const [settings, setSettings] = useState<KeyboardSettings>(() => readKeyboardSettings());
  const [modalOpen, setModalOpen] = useState(false);
  const [touch] = useState(() => supportsSoftKeyboard());

  if (!touch) return null;

  return (
    <>
      <div className="arch-plate flex items-center gap-3 rounded-[var(--r-lg)] p-4">
        <span className="row-icon">
          <Keyboard className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-meta text-foreground font-medium">لوحة مفاتيح التطبيق الذكية</p>
          <p className="text-micro text-muted-foreground">
            تجربة احترافية شبيهة بـ Google Keyboard: اقتراحات ذكية، حافظة نصوص، إموجي، وتشكيل
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settings.preference === 'app' && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-[hsl(var(--surface-2))] px-2.5 py-1.5 text-micro font-semibold text-foreground hover:bg-[hsl(var(--live))]/20"
            >
              تخصيص
            </button>
          )}
          <Switch
            checked={settings.preference === 'app'}
            onCheckedChange={(next) => {
              const updated = writeKeyboardSettings({ preference: next ? 'app' : 'system' });
              setSettings(updated);
            }}
            aria-label="لوحة مفاتيح التطبيق"
          />
        </div>
      </div>

      <KeyboardSettingsModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
