import { useCallback, useEffect, useState } from 'react';

import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { Switch } from '@/components/ui/switch';
import { Keyboard, Palette, Sparkles, Trash2, Volume2, Wand2 } from '@/lib/icons';

import { resetFeedbackThrottle, tapFeedback } from '../lib/feedback';
import { clearLearnedDictionary, getDictionaryStats } from '../lib/prediction';
import {
  type HapticIntensity,
  type KeyboardHeight,
  type KeyboardSettings,
  type KeyboardTheme,
  type SoundTone,
  readKeyboardSettings,
  supportsSoftKeyboard,
  writeKeyboardSettings,
} from '../lib/preference';
import { deleteSnippet, resetSnippets, saveSnippet, type Snippet, getSnippets } from '../lib/snippets';
import { playKeyClickSound } from '../lib/sound';
import { keyboardSwatch } from '../lib/theme';

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

  // Read the local stores only while the sheet is actually open.
  useEffect(() => {
    if (!open) return;
    setStats(getDictionaryStats());
    setSnippets(getSnippets());
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
