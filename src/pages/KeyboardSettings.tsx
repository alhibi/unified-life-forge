import { motion } from 'framer-motion';
import { useState } from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, PageShell, Section } from '@/components/ui/app-shell';
import { Switch } from '@/components/ui/switch';
import {
  readKeyboardSettings,
  writeKeyboardSettings,
  type KeyboardSettings,
  type KeyboardTheme,
  type KeyboardHeight,
  type HapticIntensity,
  type DigitType,
  type ClipboardRetention,
} from '@/features/keyboard/lib/preference';
import {
  Check,
  Clipboard,
  Grid,
  Hash,
  Keyboard,
  Palette,
  Sliders,
  Sparkles,
  Volume2,
  Vibrate,
} from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

const THEME_OPTIONS: { id: KeyboardTheme; label: string; bg: string; text: string }[] = [
  { id: 'gboard-dark', label: 'داكن Gboard', bg: 'bg-[#202124]', text: 'text-neutral-100' },
  { id: 'gboard-light', label: 'فاتح Gboard', bg: 'bg-[#f8f9fa]', text: 'text-neutral-900' },
  { id: 'oled', label: 'أسود OLED', bg: 'bg-black', text: 'text-neutral-100' },
  { id: 'luxury-gold', label: 'ذهبي فاخر', bg: 'bg-[#181512]', text: 'text-[#f0e6d2]' },
  { id: 'sand', label: 'رملي كلاسيك', bg: 'bg-[#e2d8ce]', text: 'text-[#2c221e]' },
  { id: 'emerald', label: 'زمردي', bg: 'bg-[#0f241d]', text: 'text-[#d1fae5]' },
  { id: 'sapphire', label: 'ياقوتي', bg: 'bg-[#0f172a]', text: 'text-[#e2e8f0]' },
];

const HEIGHT_OPTIONS: { id: KeyboardHeight; label: string }[] = [
  { id: 'compact', label: 'مدمج (صغير)' },
  { id: 'normal', label: 'طبيعي (قياسي)' },
  { id: 'tall', label: 'مرتفع' },
  { id: 'extra-tall', label: 'مرتفع جداً' },
];

const DIGIT_OPTIONS: { id: DigitType; label: string; sample: string }[] = [
  { id: 'western', label: 'أرقام غربية', sample: '1 2 3 4 5' },
  { id: 'eastern', label: 'أرقام شرقية (عربية)', sample: '١ ٢ ٣ ٤ ٥' },
];

const HAPTIC_OPTIONS: { id: HapticIntensity; label: string }[] = [
  { id: 'off', label: 'إيقاف' },
  { id: 'light', label: 'خفيف' },
  { id: 'medium', label: 'متوسط' },
  { id: 'heavy', label: 'قوي' },
];

const CLIPBOARD_RETENTION_OPTIONS: { id: ClipboardRetention; label: string }[] = [
  { id: 'unlimited', label: 'لا نهائية (بلا حدود)' },
  { id: '30days', label: '30 يوماً' },
  { id: '7days', label: '7 أيام' },
  { id: '1day', label: '24 ساعة' },
  { id: 'session', label: 'الجلسة الحالية' },
];

export default function KeyboardSettingsPage() {
  const [settings, setSettings] = useState<KeyboardSettings>(() => readKeyboardSettings());

  const update = (patch: Partial<KeyboardSettings>) => {
    const next = writeKeyboardSettings(patch);
    setSettings(next);
  };

  return (
    <PageShell className="pt-10 pb-16">
      <SEO
        title="إعدادات لوحة المفاتيح — SmartHub"
        description="تخصيص كامل للوحة المفاتيح العربية والإنجليزية: الثيمات، الارتفاع، حافظة النصوص، والأرقام."
        path="/settings/keyboard"
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-6 max-w-lg mx-auto"
      >
        <motion.div variants={item}>
          <PageHeader title="تخصيص لوحة المفاتيح" backTo="/settings" hideBack={false} />
        </motion.div>

        {/* Master Toggle */}
        <motion.div variants={item}>
          <Section label="تفعيل لوحة مفاتيح التطبيق">
            <AppCard className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Keyboard className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-body font-bold text-foreground">
                    استخدام لوحة المفاتيح المدمجة
                  </h3>
                  <p className="text-micro text-muted-foreground mt-0.5">
                    تفعيل لوحة المفاتيح العربية الذكية مع الاقتراحات وحافظة النصوص المتقدمة
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.preference === 'app'}
                onCheckedChange={(checked) =>
                  update({ preference: checked ? 'app' : 'system' })
                }
              />
            </AppCard>
          </Section>
        </motion.div>

        {/* Themes Section */}
        <motion.div variants={item}>
          <Section label="المظهر والسمة (Themes)">
            <AppCard className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-mini font-semibold text-foreground">
                <Palette className="w-4 h-4 text-primary" />
                <span>اختر مظهراً للوحة المفاتيح</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = settings.theme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => update({ theme: theme.id })}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${theme.bg} ${theme.text} ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30 shadow-md scale-[1.02]'
                          : 'border-border/30 hover:border-border/60 opacity-90'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <span className="text-mini font-bold mt-1">{theme.label}</span>
                      <div className="flex gap-1 mt-2">
                        <span className="w-3 h-2 rounded bg-current opacity-40" />
                        <span className="w-5 h-2 rounded bg-current opacity-80" />
                        <span className="w-3 h-2 rounded bg-current opacity-40" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </AppCard>
          </Section>
        </motion.div>

        {/* Key Height & Geometry */}
        <motion.div variants={item}>
          <Section label="الأبعاد والارتفاع">
            <AppCard className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-mini font-semibold text-foreground">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>ارتفاع المفاتيح</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {HEIGHT_OPTIONS.map((height) => (
                    <button
                      key={height.id}
                      type="button"
                      onClick={() => update({ keyHeight: height.id })}
                      className={`p-2.5 rounded-xl border text-micro font-medium transition-all text-center ${
                        settings.keyHeight === height.id
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border/40 bg-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {height.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                <div>
                  <p className="text-mini font-medium text-foreground">حدود المفاتيح (Key Borders)</p>
                  <p className="text-micro text-muted-foreground">عرض إطار مميز حول كل حرف</p>
                </div>
                <Switch
                  checked={settings.keyBorders}
                  onCheckedChange={(checked) => update({ keyBorders: checked })}
                />
              </div>
            </AppCard>
          </Section>
        </motion.div>

        {/* Numbers & Typing Row */}
        <motion.div variants={item}>
          <Section label="الأرقام والإدخال العربي">
            <AppCard className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-mini font-medium text-foreground">سطر الأرقام العلوي</p>
                  <p className="text-micro text-muted-foreground">عرض الأرقام دائماً أعلى الأحرف العربية</p>
                </div>
                <Switch
                  checked={settings.showNumberRow}
                  onCheckedChange={(checked) => update({ showNumberRow: checked })}
                />
              </div>

              <div className="pt-3 border-t border-border/30 space-y-2">
                <p className="text-mini font-medium text-foreground">طراز الأرقام المفضلة</p>
                <div className="grid grid-cols-2 gap-2">
                  {DIGIT_OPTIONS.map((digit) => (
                    <button
                      key={digit.id}
                      type="button"
                      onClick={() => update({ digitType: digit.id })}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        settings.digitType === digit.id
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border/40 bg-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <p className="text-micro font-semibold">{digit.label}</p>
                      <p className="text-mini mt-1 opacity-80">{digit.sample}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                <div>
                  <p className="text-mini font-medium text-foreground">مكبر المعاينة عند الضغط (Popup)</p>
                  <p className="text-micro text-muted-foreground">إظهار مكبر الحرف فوق الأصبع مباشرة عند النقر</p>
                </div>
                <Switch
                  checked={settings.showKeyPressPopup}
                  onCheckedChange={(checked) => update({ showKeyPressPopup: checked })}
                />
              </div>

              <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                <div>
                  <p className="text-mini font-medium text-foreground">النقطة التلقائية عند الضغط المزدوج</p>
                  <p className="text-micro text-muted-foreground">إدراج " . " ومسافة عند النقر المزدوج على المسافة</p>
                </div>
                <Switch
                  checked={settings.autoPeriod}
                  onCheckedChange={(checked) => update({ autoPeriod: checked })}
                />
              </div>
            </AppCard>
          </Section>
        </motion.div>

        {/* Haptics & Feedback */}
        <motion.div variants={item}>
          <Section label="الاستجابة اللمسية والصوت">
            <AppCard className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-mini font-medium text-foreground">اهتزاز اللمس (Haptics)</p>
                  <p className="text-micro text-muted-foreground">اهتزاز خفيف مميز عند الضغط على كل مفتاح</p>
                </div>
                <Switch
                  checked={settings.vibrateOnKeyPress}
                  onCheckedChange={(checked) => update({ vibrateOnKeyPress: checked })}
                />
              </div>

              {settings.vibrateOnKeyPress && (
                <div className="pt-3 border-t border-border/30 space-y-2">
                  <p className="text-mini font-medium text-foreground">شدة الاهتزاز</p>
                  <div className="grid grid-cols-4 gap-2">
                    {HAPTIC_OPTIONS.map((hap) => (
                      <button
                        key={hap.id}
                        type="button"
                        onClick={() => update({ hapticIntensity: hap.id })}
                        className={`p-2 rounded-xl border text-micro text-center font-medium transition-all ${
                          settings.hapticIntensity === hap.id
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border/40 bg-card text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {hap.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </AppCard>
          </Section>
        </motion.div>

        {/* Advanced Unlimited Clipboard */}
        <motion.div variants={item}>
          <Section label="حافظة النصوص الذكية (Clipboard)">
            <AppCard className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-mini font-medium text-foreground">تفعيل حافظة النسخ</p>
                    <p className="text-micro text-muted-foreground">
                      حفظ النصوص المنسوخة تلقائياً وتسهيل اللصق المباشر
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.clipboardEnabled}
                  onCheckedChange={(checked) => update({ clipboardEnabled: checked })}
                />
              </div>

              {settings.clipboardEnabled && (
                <div className="pt-3 border-t border-border/30 space-y-2">
                  <p className="text-mini font-medium text-foreground">مدة الاحتفاظ بالنصوص المنسوخة</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CLIPBOARD_RETENTION_OPTIONS.map((ret) => (
                      <button
                        key={ret.id}
                        type="button"
                        onClick={() => update({ clipboardRetention: ret.id })}
                        className={`p-2.5 rounded-xl border text-start transition-all ${
                          settings.clipboardRetention === ret.id
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border/40 bg-card text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <p className="text-micro">{ret.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </AppCard>
          </Section>
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
