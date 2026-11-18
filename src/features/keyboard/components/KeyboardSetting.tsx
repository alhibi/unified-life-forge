import { useCallback, useEffect, useRef, useState } from 'react';

import { AppCard, AppList, AppRow, IconChip, Section } from '@/components/ui/app-shell';
import { Input } from '@/components/ui/input';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { Switch } from '@/components/ui/switch';
import {
  ALargeSmall,
  Clipboard,
  Gauge,
  HandHeart,
  Keyboard,
  Languages,
  LayoutGrid,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Vibrate,
  Volume2,
  Wand2,
} from '@/lib/icons';

import { resetFeedbackThrottle, tapFeedback } from '../lib/feedback';
import { clearLearnedDictionary, getDictionaryStats } from '../lib/prediction';
import {
  type HapticIntensity,
  type KeyboardHeight,
  type KeyboardSettings,
  type KeyboardTheme,
  readKeyboardSettings,
  type SoundTone,
  supportsSoftKeyboard,
  writeKeyboardSettings,
} from '../lib/preference';
import { deleteSnippet, getSnippets,resetSnippets, saveSnippet, type Snippet } from '../lib/snippets';
import { playKeyClickSound } from '../lib/sound';
import { keyboardPaletteVars, keyboardSwatch } from '../lib/theme';
import SoftKeyboardToggle from './SoftKeyboardToggle';

interface KeyboardSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEME_OPTIONS: ReadonlyArray<{ id: KeyboardTheme; label: string }> = [
  { id: 'gboard-dark', label: 'داكن Gboard' },
  { id: 'gboard-light', label: 'فاتح Gboard' },
  { id: 'oled', label: 'أسود OLED' },
  { id: 'luxury-gold', label: 'ذهبي فاخر' },
  { id: 'sand', label: 'رملي كلاسيك' },
  { id: 'emerald', label: 'زمردي' },
  { id: 'sapphire', label: 'أزرق ياقوتي' },
];

/** Compact names for the 4-up swatch grid; the full label stays in the title. */
const THEME_SHORT_LABELS: Record<KeyboardTheme, string> = {
  'gboard-dark': 'داكن',
  'gboard-light': 'فاتح',
  oled: 'OLED',
  'luxury-gold': 'ذهبي',
  sand: 'رملي',
  emerald: 'زمردي',
  sapphire: 'ياقوتي',
};

const TONE_OPTIONS: ReadonlyArray<{ id: SoundTone; label: string }> = [
  { id: 'default', label: 'ناعم كلاسيك' },
  { id: 'click', label: 'نقرة حادة' },
  { id: 'mechanical', label: 'ميكانيكي' },
  { id: 'soft', label: 'هامس' },
];

const HAPTIC_OPTIONS: ReadonlyArray<{ id: HapticIntensity; label: string }> = [
  { id: 'off', label: 'بدون' },
  { id: 'light', label: 'خفيف' },
  { id: 'medium', label: 'متوسط' },
  { id: 'heavy', label: 'قوي' },
];

const HEIGHT_OPTIONS: ReadonlyArray<{ id: KeyboardHeight; label: string }> = [
  { id: 'compact', label: 'مدمج' },
  { id: 'normal', label: 'طبيعي' },
  { id: 'tall', label: 'مرتفع' },
  { id: 'extra-tall', label: 'مرتفع جداً' },
];

export function KeyboardSettingsModal({ open, onOpenChange }: KeyboardSettingsModalProps) {
  const [settings, setSettings] = useState<KeyboardSettings>(() => readKeyboardSettings());
  const [stats, setStats] = useState(() => ({ words: 0, pairs: 0 }));
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [draft, setDraft] = useState({ trigger: '', text: '' });

  // Read the local stores only while the sheet is actually open. Deferred to
  // the next task so the effect does not synchronously cascade a second render
  // (react-hooks/set-state-in-effect); the sheet paints its skeleton first.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      setStats(getDictionaryStats());
      setSnippets(getSnippets());
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const update = (patch: Partial<KeyboardSettings>) => {
    const next = writeKeyboardSettings(patch);
    setSettings(next);
  };

  const addSnippet = useCallback(() => {
    if (!draft.trigger.trim() || !draft.text.trim()) return;
    setSnippets(saveSnippet(draft.trigger, draft.text));
    setDraft({ trigger: '', text: '' });
  }, [draft]);


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
            {THEME_OPTIONS.map((theme) => {
              const [surface, accent] = keyboardSwatch(theme.id);
              const active = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => update({ theme: theme.id })}
                  aria-pressed={active}
                  className={`flex flex-col items-stretch gap-1.5 rounded-xl border p-1.5 text-micro font-medium transition-motion ${
                    active
                      ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/15 text-[hsl(var(--live))] font-semibold'
                      : 'border-border/40 bg-[hsl(var(--surface-2))] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {/* Miniature keyboard: panel tint, two key faces, action key. */}
                  <span
                    className="flex h-7 items-end gap-1 rounded-lg p-1"
                    style={{ background: surface }}
                    aria-hidden
                  >
                    <span className="h-3 flex-1 rounded-[3px] bg-white/20" />
                    <span className="h-3 flex-1 rounded-[3px] bg-white/20" />
                    <span className="h-3 flex-1 rounded-[3px]" style={{ background: accent }} />
                  </span>
                  <span className="truncate">{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Height Options */}
        <div className="space-y-2 pt-2 border-t border-border/30">
          <label className="flex items-center gap-2 text-mini font-semibold text-foreground">
            <Keyboard className="h-4 w-4 text-[hsl(var(--live))]" />
            <span>ارتفاع لوحة المفاتيح</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {HEIGHT_OPTIONS.map((height) => (
              <button
                key={height.id}
                type="button"
                onClick={() => update({ keyHeight: height.id, keyHeightPx: null })}
                className={`flex h-9 items-center justify-center rounded-xl border text-micro font-medium transition-motion ${
                  settings.keyHeight === height.id && settings.keyHeightPx === null
                    ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/20 text-[hsl(var(--live))] font-semibold'
                    : 'border-border/40 bg-[hsl(var(--surface-2))] text-muted-foreground hover:text-foreground'
                }`}
              >
                {height.label}
              </button>
            ))}
          </div>
          <p className="text-micro text-muted-foreground">
            {settings.keyHeightPx !== null
              ? `ارتفاع مخصص بالسحب: ${settings.keyHeightPx} نقطة — انقر أحد الخيارات للعودة للمقاسات الجاهزة.`
              : 'يمكنك أيضاً سحب المقبض أعلى اللوحة لضبط الارتفاع بدقة (نقرة مزدوجة للإرجاع).'}
          </p>
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
              <p className="text-mini font-medium text-foreground">حدود المفاتيح</p>
              <p className="text-micro text-muted-foreground">إظهار خط رقيق حول كل مفتاح لبروز أوضح</p>
            </div>
            <Switch
              checked={settings.keyBorders}
              onCheckedChange={(checked) => update({ keyBorders: checked })}
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

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">شريط الاقتراحات</p>
              <p className="text-micro text-muted-foreground">عرض الكلمات المقترحة أعلى اللوحة أثناء الكتابة</p>
            </div>
            <Switch
              checked={settings.suggestionsEnabled}
              onCheckedChange={(checked) => update({ suggestionsEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">التعلّم من كتابتك</p>
              <p className="text-micro text-muted-foreground">
                تحفظ اللوحة كلماتك وتسلسلها على هذا الجهاز فقط لتصبح الاقتراحات أدق مع الوقت (تُستثنى حقول كلمات المرور)
              </p>
            </div>
            <Switch
              checked={settings.learningEnabled}
              onCheckedChange={(checked) => update({ learningEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">اختصارات النص</p>
              <p className="text-micro text-muted-foreground">توسيع الاختصارات المحفوظة عند الضغط على المسافة</p>
            </div>
            <Switch
              checked={settings.snippetsEnabled}
              onCheckedChange={(checked) => update({ snippetsEnabled: checked })}
            />
          </div>
        </div>

        {/* Tap feedback: sound + haptics */}
        <div className="space-y-3 border-t border-border/30 pt-3">
          <label className="flex items-center gap-2 text-mini font-semibold text-foreground">
            <Volume2 className="h-4 w-4 text-[hsl(var(--live))]" />
            <span>النقر والاهتزاز</span>
          </label>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">صوت الضغط على المفاتيح</p>
              <p className="text-micro text-muted-foreground">نقرة مسموعة عند الكتابة</p>
            </div>
            <Switch
              checked={settings.soundOnClick}
              onCheckedChange={(checked) => update({ soundOnClick: checked, soundEnabled: checked })}
            />
          </div>

          {settings.soundOnClick && (
            <div className="space-y-2 rounded-xl bg-[hsl(var(--surface-2))] p-2.5">
              <div className="grid grid-cols-4 gap-1.5">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => {
                      update({ soundTone: tone.id });
                      playKeyClickSound('letter', settings.soundVolume, tone.id);
                    }}
                    aria-pressed={settings.soundTone === tone.id}
                    className={`h-8 rounded-lg border text-micro transition-motion ${
                      settings.soundTone === tone.id
                        ? 'border-[hsl(var(--live))] text-[hsl(var(--live))] font-semibold'
                        : 'border-border/40 text-muted-foreground'
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-micro text-muted-foreground">
                <span className="w-14 shrink-0">شدة الصوت</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={settings.soundVolume}
                  onChange={(e) => update({ soundVolume: Number(e.target.value) })}
                  onPointerUp={() => playKeyClickSound('letter', settings.soundVolume, settings.soundTone)}
                  className="h-1.5 min-w-0 flex-1 accent-[hsl(var(--live))]"
                  aria-label="شدة صوت النقر"
                />
                <span className="w-8 text-end tabular-nums">{Math.round(settings.soundVolume * 100)}</span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-mini font-medium text-foreground">الاهتزاز عند النقر</p>
              <p className="text-micro text-muted-foreground">تغذية راجعة لمسية عند كل مفتاح</p>
            </div>
            <Switch
              checked={settings.vibrateOnKeyPress}
              onCheckedChange={(checked) => update({ vibrateOnKeyPress: checked })}
            />
          </div>

          {settings.vibrateOnKeyPress && (
            <div className="grid grid-cols-4 gap-1.5">
              {HAPTIC_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    update({ hapticIntensity: option.id });
                    if (option.id !== 'off') {
                      resetFeedbackThrottle();
                      tapFeedback('letter', {
                        enabled: true,
                        intensity: option.id,
                        soundEnabled: false,
                        soundVolume: 0,
                        soundTone: settings.soundTone,
                      });
                    }
                  }}
                  aria-pressed={settings.hapticIntensity === option.id}
                  className={`h-8 rounded-lg border text-micro transition-motion ${
                    settings.hapticIntensity === option.id
                      ? 'border-[hsl(var(--live))] bg-[hsl(var(--live))]/15 text-[hsl(var(--live))] font-semibold'
                      : 'border-border/40 bg-[hsl(var(--surface-2))] text-muted-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-micro text-muted-foreground">
            <span className="w-24 shrink-0">زمن الضغط المطوّل</span>
            <input
              type="range"
              min={160}
              max={600}
              step={20}
              value={settings.holdDelayMs}
              onChange={(e) => update({ holdDelayMs: Number(e.target.value) })}
              className="h-1.5 min-w-0 flex-1 accent-[hsl(var(--live))]"
              aria-label="زمن الضغط المطوّل بالمللي ثانية"
            />
            <span className="w-14 text-end tabular-nums">{settings.holdDelayMs} م.ث</span>
          </label>
        </div>

        {/* Personal dictionary */}
        <div className="space-y-2 border-t border-border/30 pt-3">
          <label className="flex items-center gap-2 text-mini font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-[hsl(var(--live))]" />
            <span>القاموس الشخصي</span>
          </label>
          <p className="text-micro text-muted-foreground">
            {stats.words} كلمة و{stats.pairs} تسلسل محفوظ على هذا الجهاز.
          </p>
          <button
            type="button"
            onClick={() => {
              clearLearnedDictionary();
              setStats(getDictionaryStats());
            }}
            className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-micro font-semibold text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>مسح القاموس المتعلّم</span>
          </button>
        </div>

        {/* Snippets */}
        <div className="space-y-2 border-t border-border/30 pt-3">
          <label className="flex items-center gap-2 text-mini font-semibold text-foreground">
            <Wand2 className="h-4 w-4 text-[hsl(var(--live))]" />
            <span>اختصارات النص</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {snippets.map((snippet) => (
              <button
                key={snippet.trigger}
                type="button"
                onClick={() => setSnippets(deleteSnippet(snippet.trigger))}
                title={`حذف الاختصار: ${snippet.text}`}
                className="flex items-center gap-1 rounded-lg bg-[hsl(var(--surface-2))] px-2 py-1 text-micro text-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <span className="font-semibold">{snippet.trigger}</span>
                <span className="max-w-[10rem] truncate text-muted-foreground">{snippet.text}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={draft.trigger}
              onChange={(e) => setDraft((d) => ({ ...d, trigger: e.target.value }))}
              placeholder="الاختصار"
              className="w-24 rounded-lg border border-border/40 bg-[hsl(var(--surface-2))] px-2 py-1.5 text-base text-foreground"
            />
            <input
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              placeholder="النص الكامل"
              className="min-w-0 flex-1 rounded-lg border border-border/40 bg-[hsl(var(--surface-2))] px-2 py-1.5 text-base text-foreground"
            />
            <button
              type="button"
              onClick={addSnippet}
              className="rounded-lg bg-[hsl(var(--live))]/20 px-3 text-micro font-semibold text-[hsl(var(--live))]"
            >
              إضافة
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSnippets(resetSnippets())}
            className="text-micro text-muted-foreground underline-offset-2 hover:underline"
          >
            إرجاع الاختصارات الافتراضية
          </button>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}

/**
 * Settings surface for the keyboard page.
 *
 * The page is the one place a person decides how writing works: whether the
 * in-app keyboard is used at all, what its surface looks like, how it behaves
 * on a phone, and where the advanced sheet lives. Every control here writes
 * through the same `writeKeyboardSettings` store the soft keyboard reads, so
 * there is no second copy of a preference and no control without a consumer.
 */
export default function KeyboardSetting() {
  const [settings, setSettings] = useState<KeyboardSettings>(() => readKeyboardSettings());
  const [modalOpen, setModalOpen] = useState(false);
  const [snippetCount, setSnippetCount] = useState(() => getSnippets().length);
  const [touch] = useState(() => supportsSoftKeyboard());
  const demoRef = useRef<HTMLInputElement | null>(null);

  // The advanced sheet writes the same store; resync when it closes so the
  // quick controls never show a stale value.
  useEffect(() => {
    if (modalOpen) return;
    setSettings(readKeyboardSettings());
    setSnippetCount(getSnippets().length);
  }, [modalOpen]);

  if (!touch) return null;

  const update = (patch: Partial<KeyboardSettings>) => {
    setSettings(writeKeyboardSettings(patch));
  };
  const enabled = settings.preference === 'app';
  const themeLabel = THEME_OPTIONS.find((t) => t.id === settings.theme)?.label ?? '';
  const heightLabel = HEIGHT_OPTIONS.find((h) => h.id === settings.keyHeight && settings.keyHeightPx === null)?.label
    ?? (settings.keyHeightPx !== null ? String(settings.keyHeightPx) + ' نقطة' : 'طبيعي');

  return (
    <>
      <Section label={'التشغيل'}>
        <AppCard>
          <div className="flex items-start gap-3">
            <IconChip tone="accent">
              <Keyboard className="h-4 w-4" aria-hidden />
            </IconChip>
            <div className="min-w-0 flex-1">
              <p className="text-meta font-semibold text-foreground">لوحة مفاتيح التطبيق الذكية</p>
              <p className="text-mini leading-relaxed text-muted-foreground">
                اقتراحات عربية، حافظة نصوص، إموجي وتشكيل — بديل كامل للوحة النظام داخل التطبيق.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(next) => update({ preference: next ? 'app' : 'system' })}
              aria-label={'تفعيل لوحة مفاتيح التطبيق'}
            />
          </div>
          <p className="mt-3 border-t border-track pt-3 text-mini leading-relaxed text-muted-foreground">
            {enabled
              ? 'مفعّلة. لا تفتح تلقائياً عند لمس حقل: تُفتح من زر اللوحة، فلا تغطي الحقل ولا زر الإجراء الأساسي.'
              : 'معطّلة. تُستخدم لوحة النظام في كل الحقول؛ يمكنك تفعيلها في أي وقت.'}
          </p>
        </AppCard>
      </Section>

      <Section label={'سطح اللوحة'}>
        <AppCard>
          <KeyboardSurfacePreview theme={settings.theme} />
          <div className="mt-3 grid gap-2.5">
            <div className="flex items-center gap-2">
              <Input
                ref={demoRef}
                type="text"
                placeholder={'جرّب الكتابة هنا…'}
                aria-label={'تجربة لوحة المفاتيح'}
                className={'flex-1 text-body'}
              />
              <SoftKeyboardToggle target={demoRef} label={'فتح لوحة المفاتيح للتجربة'} />
            </div>
            <p className="text-micro leading-relaxed text-muted-foreground">
              المعاينة تعرض السمة المختارة. زر اللوحة يفتحها للحقل — ولا شيء آخر يفتحها.
            </p>
          </div>

          <div className="mt-4 border-t border-track pt-3">
            <p className="mb-2 text-micro font-semibold text-foreground">السمة</p>
            <div className="grid grid-cols-4 gap-2">
              {THEME_OPTIONS.map((theme) => {
                const active = settings.theme === theme.id;
                const [surface, accent] = keyboardSwatch(theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => update({ theme: theme.id })}
                    aria-pressed={active}
                    title={theme.label}
                    className={
                      'app-pressable app-focus-ring flex min-h-11 flex-col items-stretch justify-center gap-1 rounded-sm border p-1.5 text-micro font-medium transition-motion '
                      + (active
                        ? 'border-primary text-foreground'
                        : 'border-track bg-secondary text-secondary-muted hover:text-foreground')
                    }
                  >
                    <span className="flex h-6 items-end gap-1 rounded-xs p-1" style={{ background: surface }} aria-hidden>
                      <span className="h-2 flex-1 rounded-[2px] bg-white/25" />
                      <span className="h-2 flex-1 rounded-[2px] bg-white/25" />
                      <span className="h-2 flex-1 rounded-[2px]" style={{ background: accent }} />
                    </span>
                    <span className="truncate">{THEME_SHORT_LABELS[theme.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </AppCard>
      </Section>

      <Section label={'التخطيط واللمس'}>
        <AppCard className={'p-0'}>
          <div className={'divide-y divide-track'}>
            <QuickControlRow
              icon={<LayoutGrid className="h-4 w-4" aria-hidden />}
              title={'سطر الأرقام'}
              description={'عرض صف الأرقام دائماً فوق الحروف'}
            >
              <Switch
                checked={settings.showNumberRow}
                onCheckedChange={(next) => update({ showNumberRow: next })}
                aria-label={'سطر الأرقام'}
              />
            </QuickControlRow>

            <QuickControlRow
              icon={<ALargeSmall className="h-4 w-4" aria-hidden />}
              title={'شكل الأرقام'}
            >
              <SegmentedChoice
                label={'شكل الأرقام'}
                value={settings.digitType}
                options={[{ id: 'western', label: '123' }, { id: 'eastern', label: '١٢٣' }]}
                onChange={(next) => update({ digitType: next as KeyboardSettings['digitType'] })}
              />
            </QuickControlRow>

            <QuickControlRow
              icon={<HandHeart className="h-4 w-4" aria-hidden />}
              title={'الكتابة بيد واحدة'}
              description={'يُقرب اللوحة إلى جانب الإبهام'}
            >
              <SegmentedChoice
                label={'الكتابة بيد واحدة'}
                value={settings.oneHandedMode}
                options={[
                  { id: 'off', label: 'معطّل' },
                  { id: 'left', label: 'يسار' },
                  { id: 'right', label: 'يمين' },
                ]}
                onChange={(next) => update({ oneHandedMode: next as KeyboardSettings['oneHandedMode'] })}
              />
            </QuickControlRow>

            <QuickControlRow
              icon={<Gauge className="h-4 w-4" aria-hidden />}
              title={'ارتفاع المفاتيح'}
              description={'الارتفاع الحالي: ' + heightLabel}
            >
              <SegmentedChoice
                label={'ارتفاع المفاتيح'}
                value={settings.keyHeightPx === null ? settings.keyHeight : ''}
                options={HEIGHT_OPTIONS.map((h) => ({ id: h.id, label: h.label }))}
                onChange={(next) => update({ keyHeight: next as KeyboardHeight, keyHeightPx: null })}
              />
            </QuickControlRow>

            <QuickControlRow
              icon={<Languages className="h-4 w-4" aria-hidden />}
              title={'لغات اللوحة'}
              description={'عربية وإنجليزية (تبديل من مقبض اللغة داخل اللوحة)'}
            >
              <span className={'text-mini text-muted-foreground'}>AR / EN</span>
            </QuickControlRow>
          </div>
        </AppCard>
      </Section>

      <Section label={'الصوت والاهتزاز'}>
        <AppCard className={'p-0'}>
          <div className={'divide-y divide-track'}>
            <QuickControlRow
              icon={<Volume2 className="h-4 w-4" aria-hidden />}
              title={'صوت المفاتيح'}
              description={'نقرة مسموعة عند الكتابة'}
            >
              <Switch
                checked={settings.soundOnClick}
                onCheckedChange={(next) => update({ soundOnClick: next, soundEnabled: next })}
                aria-label={'صوت المفاتيح'}
              />
            </QuickControlRow>
            <QuickControlRow
              icon={<Vibrate className="h-4 w-4" aria-hidden />}
              title={'اهتزاز اللمس'}
              description={'تغذية راجعة لمسية عند كل مفتاح'}
            >
              <SegmentedChoice
                label={'شدة الاهتزاز'}
                value={settings.vibrateOnKeyPress ? settings.hapticIntensity : 'off'}
                options={HAPTIC_OPTIONS.map((h) => ({ id: h.id, label: h.label }))}
                onChange={(next) => {
                  if (next === 'off') {
                    update({ vibrateOnKeyPress: false, hapticIntensity: 'off' });
                    return;
                  }
                  update({ vibrateOnKeyPress: true, hapticIntensity: next as HapticIntensity });
                  resetFeedbackThrottle();
                  tapFeedback('letter', {
                    enabled: true,
                    intensity: next as HapticIntensity,
                    soundEnabled: false,
                    soundVolume: 0,
                    soundTone: settings.soundTone,
                  });
                }}
              />
            </QuickControlRow>
          </div>
        </AppCard>
      </Section>

      <Section label={'العبارات والاختصارات'}>
        <AppList>
          <AppRow
            leading={<IconChip><Wand2 className="h-4 w-4" aria-hidden /></IconChip>}
            title={'اختصارات النص'}
            subtitle={'عبارات قصيرة تُوسَّع تلقائياً عند المسافة'}
            value={snippetCount + ' محفوظة'}
            chevron
            onClick={() => setModalOpen(true)}
          />
          <AppRow
            leading={<IconChip><Clipboard className="h-4 w-4" aria-hidden /></IconChip>}
            title={'الحافظة النصية'}
            subtitle={'حفظ النصوص المنسوخة لإعادة استخدامها من اللوحة'}
            value={settings.clipboardEnabled ? 'مفعّلة' : 'معطّلة'}
            chevron
            onClick={() => setModalOpen(true)}
          />
        </AppList>
      </Section>

      <Section label={'الإعدادات الكاملة'}>
        <AppList>
          <AppRow
            leading={<IconChip><SlidersHorizontal className="h-4 w-4" aria-hidden /></IconChip>}
            title={'تخصيص اللوحة'}
            subtitle={'السمة، الارتفاع الدقيق، الأصوات، الاقتراحات، القاموس الشخصي والتشكيل'}
            value={themeLabel + ' · ' + heightLabel}
            chevron
            onClick={() => setModalOpen(true)}
          />
        </AppList>
      </Section>

      <KeyboardSettingsModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

/** One labelled line inside the quick-control surfaces. */
function QuickControlRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={'flex flex-wrap items-center gap-3 px-4 py-3'}>
      <span className={'shrink-0 text-primary [&>svg]:h-[18px] [&>svg]:w-[18px]'}>{icon}</span>
      <div className={'min-w-0 flex-1'}>
        <p className={'text-meta font-medium text-foreground'}>{title}</p>
        {description && (
          <p className={'text-micro leading-snug text-muted-foreground'}>{description}</p>
        )}
      </div>
      <div className={'shrink-0'}>{children}</div>
    </div>
  );
}

/** Compact radio group for the quick controls; 44px tall targets. */
function SegmentedChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  onChange: (next: string) => void;
}) {
  return (
    <div role={'group'} aria-label={label} className={'flex flex-wrap items-center justify-end gap-1.5'}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type={'button'}
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={
              'app-pressable app-focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-3 text-mini font-semibold transition-motion '
              + (active
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-muted hover:text-foreground')
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Read-only preview of the keyboard surface with the selected palette.
 *
 * Decorative by design (aria-hidden): it previews the material a person just
 * picked, it is not a second input. Colours come from the keyboard palette
 * registry — the same source every key in the real panel reads (X5).
 */
function KeyboardSurfacePreview({ theme }: { theme: KeyboardTheme }) {
  const row = ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح'];
  const row2 = ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك'];
  const row3 = ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'];
  return (
    <div
      aria-hidden
      className={'rounded-md p-2'}
      style={{ ...keyboardPaletteVars(theme), backgroundColor: 'hsl(var(--kb-bg))' }}
    >
      <div className={'mb-1 flex gap-1'}>
        {row.map((key) => (
          <span
            key={key}
            className={'flex h-8 flex-1 items-center justify-center rounded-sm bg-[hsl(var(--kb-key))] text-mini font-medium text-[hsl(var(--kb-fg))] shadow-[var(--kb-key-shadow)]'}
          >
            {key}
          </span>
        ))}
      </div>
      <div className={'mb-1 flex gap-1'}>
        {row2.map((key) => (
          <span
            key={key}
            className={'flex h-8 flex-1 items-center justify-center rounded-sm bg-[hsl(var(--kb-key))] text-mini font-medium text-[hsl(var(--kb-fg))] shadow-[var(--kb-key-shadow)]'}
          >
            {key}
          </span>
        ))}
      </div>
      <div className={'flex gap-1'}>
        <span className={'flex h-8 flex-[1.6] items-center justify-center rounded-sm bg-[hsl(var(--kb-key-mod))] text-micro text-[hsl(var(--kb-fg-muted))]'}>⇧</span>
        {row3.map((key) => (
          <span
            key={key}
            className={'flex h-8 flex-1 items-center justify-center rounded-sm bg-[hsl(var(--kb-key))] text-mini font-medium text-[hsl(var(--kb-fg))] shadow-[var(--kb-key-shadow)]'}
          >
            {key}
          </span>
        ))}
        <span className={'flex h-8 flex-[1.6] items-center justify-center rounded-sm bg-[hsl(var(--kb-key-mod))] text-micro text-[hsl(var(--kb-fg-muted))]'}>⌫</span>
      </div>
      <div className={'mt-1 flex gap-1'}>
        <span className={'flex h-8 flex-[1.2] items-center justify-center rounded-sm bg-[hsl(var(--kb-key-mod))] text-micro text-[hsl(var(--kb-fg-muted))]'}>123</span>
        <span className={'flex h-8 flex-[1.2] items-center justify-center rounded-sm bg-[hsl(var(--kb-key-mod))] text-micro text-[hsl(var(--kb-fg-muted))]'}>🌐</span>
        <span className={'flex h-8 flex-[4] items-center justify-center rounded-sm bg-[hsl(var(--kb-key))] text-micro text-[hsl(var(--kb-fg-muted))]'}>مسافة</span>
        <span className={'flex h-8 flex-[1.6] items-center justify-center rounded-sm bg-[hsl(var(--kb-accent))] text-micro font-semibold text-[hsl(var(--kb-accent-fg))]'}>تم</span>
      </div>
    </div>
  );
}
