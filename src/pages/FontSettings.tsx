import { motion } from 'framer-motion';

import PageHeader from '@/components/PageHeader';
import { Slider } from '@/components/ui/slider';
import { useApp } from '@/contexts/AppContext';
import {
  FONT_OPTIONS,
  FONT_SIZE_STEPS,
  FONT_WEIGHTS,
  MAX_FONT_WEIGHT,
  MIN_FONT_WEIGHT,
  resolveFontId,
  resolveFontSize,
} from '@/lib/fonts';
import { ALargeSmall, Bold, Check, Eye, Type } from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

export default function FontSettingsPage() {
  const { fontFamily, setFontFamily, fontSize, setFontSize, fontWeight, setFontWeight, fontOpacity, setFontOpacity } =
    useApp();

  const activeFontId = resolveFontId(fontFamily);
  const activeSizeId = resolveFontSize(fontSize);
  const currentFont = FONT_OPTIONS.find((f) => f.id === activeFontId) ?? FONT_OPTIONS[0];
  const currentSize = FONT_SIZE_STEPS.find((s) => s.id === activeSizeId) ?? FONT_SIZE_STEPS[1];
  const currentWeightLabel =
    FONT_WEIGHTS.find((w) => w.value === fontWeight)?.label ?? String(fontWeight);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="الخط"
        subtitle="نوع الخط وحجمه وسماكته"
        backTo="/settings"
        sticky
        icon={
          <span className="row-icon">
            <Type className="h-4 w-4" aria-hidden />
          </span>
        }
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg space-y-6 px-4 pb-10 pt-4"
      >
        {/* ── نوع الخط ── */}
        <motion.section variants={item} aria-labelledby="font-family-label">
          <p id="font-family-label" className="app-section-label">
            نوع الخط
          </p>
          <div className="space-y-2">
            {FONT_OPTIONS.map((f) => {
              const isActive = activeFontId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFontFamily(f.id)}
                  aria-pressed={isActive}
                  className={`app-card app-card-pressable flex w-full items-center justify-between gap-3 text-start ${
                    isActive ? 'border-primary/50' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-foreground">{f.label}</span>
                    <span
                      className="mt-1 block truncate text-lead text-muted-foreground"
                      style={{ fontFamily: f.family }}
                    >
                      بسم الله الرحمن الرحيم
                    </span>
                    <span className="mt-1 block text-mini text-muted-foreground/80">{f.note}</span>
                  </span>
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary"
                    >
                      <Check className="h-4 w-4 stroke-[2.5] text-primary-foreground" aria-hidden />
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* ── حجم الخط ── */}
        <motion.section variants={item} aria-labelledby="font-size-label">
          <p id="font-size-label" className="app-section-label flex items-center gap-1.5">
            <ALargeSmall className="h-4 w-4" aria-hidden />
            حجم الخط
          </p>
          <div className="app-card flex gap-1.5 p-2">
            {FONT_SIZE_STEPS.map((s) => {
              const isActive = activeSizeId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFontSize(s.id)}
                  aria-pressed={isActive}
                  className={`relative flex-1 rounded-md py-3 text-body font-medium ${
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="fontSizeIndicator"
                      className="absolute inset-0 rounded-md bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-raised">{s.label}</span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* ── سماكة الخط ── */}
        <motion.section variants={item} aria-labelledby="font-weight-label">
          <p id="font-weight-label" className="app-section-label flex items-center gap-1.5">
            <Bold className="h-4 w-4" aria-hidden />
            سماكة الخط
          </p>
          <div className="app-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-mini text-muted-foreground">عادي</span>
              <span className="text-meta font-semibold text-foreground">{currentWeightLabel}</span>
              <span className="text-mini text-muted-foreground">سميك</span>
            </div>
            <Slider
              value={[fontWeight]}
              onValueChange={([v]) => setFontWeight(v)}
              min={MIN_FONT_WEIGHT}
              max={MAX_FONT_WEIGHT}
              step={100}
              aria-label="سماكة الخط"
            />
            <div className="flex justify-between px-1">
              {FONT_WEIGHTS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setFontWeight(w.value)}
                  aria-label={`سماكة ${w.label}`}
                  className={`h-2 w-2 rounded-full ${
                    fontWeight === w.value ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── شفافية النص ── */}
        <motion.section variants={item} aria-labelledby="font-opacity-label">
          <p id="font-opacity-label" className="app-section-label flex items-center gap-1.5">
            <Eye className="h-4 w-4" aria-hidden />
            شفافية النص
          </p>
          <div className="app-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-mini text-muted-foreground">60%</span>
              <span className="text-meta font-semibold text-foreground">
                {Math.round(fontOpacity * 100)}%
              </span>
              <span className="text-mini text-muted-foreground">100%</span>
            </div>
            {/* Floor raised from 30% to 60%: below that the body text fell
                under the WCAG AA contrast threshold on every theme. */}
            <Slider
              value={[fontOpacity * 100]}
              onValueChange={([v]) => setFontOpacity(v / 100)}
              min={60}
              max={100}
              step={5}
              aria-label="شفافية النص"
            />
          </div>
        </motion.section>

        {/* ── معاينة ── */}
        <motion.section variants={item} aria-labelledby="font-preview-label">
          <p id="font-preview-label" className="app-section-label">
            معاينة
          </p>
          <div className="app-card space-y-3">
            <p
              className="leading-relaxed text-foreground"
              style={{
                fontFamily: currentFont.family,
                fontSize: `${currentSize.scale}rem`,
                fontWeight,
                opacity: fontOpacity,
              }}
            >
              بسم الله الرحمن الرحيم. هذا نص تجريبي لمعاينة إعدادات الخط المختارة مع جميع التعديلات.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[currentFont.label, currentSize.label, currentWeightLabel, `${Math.round(fontOpacity * 100)}%`].map(
                (chip) => (
                  <span
                    key={chip}
                    className="rounded-sm bg-secondary/60 px-2 py-1 text-mini text-muted-foreground"
                  >
                    {chip}
                  </span>
                ),
              )}
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
