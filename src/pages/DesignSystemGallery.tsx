import { useMemo, useState } from 'react';

import PageHeader from '@/components/PageHeader';
import {
  AppCard,
  AppList,
  AppRow,
  IconButton,
  IconChip,
  PageShell,
  Section,
  Stat,
  StatGrid,
} from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { StateView } from '@/components/ui/state-view';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { BookOpen, Check, Flame, Search } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { generateThemeTokens, themePresets, type ThemeStyle } from '@/utils/themeEngine';

/**
 * /dev/design-system — the reference gallery.
 *
 * This is not a product screen: it is the surface a designer, a reviewer or an
 * agent opens to see one system instead of inferring it from thirty screens.
 * It renders the real primitives against the real token engine, so a broken
 * family or a missing role is visible here before it reaches a feature.
 *
 * Development route only; deliberately absent from navigation and search.
 */

function hsl(triple: string | undefined) {
  return triple ? 'hsl(' + triple + ')' : undefined;
}

function Swatch({ value, label }: { value: string | undefined; label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span
        className="h-9 w-full rounded-sm border border-border"
        style={{ background: hsl(value) }}
        aria-hidden
      />
      <span className="truncate text-micro text-muted-foreground">{label}</span>
    </div>
  );
}

function ThemeCard({
  id,
  name,
  nameEn,
  philosophy,
  lightCanvas,
  lightAccent,
  darkCanvas,
  darkAccent,
  onPick,
  active,
}: {
  id: string;
  name: string;
  nameEn: string;
  philosophy: string;
  lightCanvas: string;
  lightAccent: string;
  darkCanvas: string;
  darkAccent: string;
  onPick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        'app-card app-card-pressable app-focus-ring flex flex-col gap-2 p-3 text-start',
        active && 'border-primary',
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-meta font-semibold text-foreground">{name}</span>
          <span className="block truncate text-micro text-muted-foreground" dir="ltr">
            {nameEn} · {id}
          </span>
        </span>
        {active ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
      </span>
      {/* Two labelled pairs, because four unlabelled chips read as one
          arbitrary palette instead of the same palette in two modes. */}
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5">
          <span className="w-9 shrink-0 text-micro text-muted-foreground">فاتح</span>
          <span className="h-6 flex-1 rounded-xs border border-border" style={{ background: lightCanvas }} title="light canvas" />
          <span className="h-6 flex-1 rounded-xs border border-border" style={{ background: lightAccent }} title="light accent" />
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-9 shrink-0 text-micro text-muted-foreground">داكن</span>
          <span className="h-6 flex-1 rounded-xs border border-border" style={{ background: darkCanvas }} title="dark canvas" />
          <span className="h-6 flex-1 rounded-xs border border-border" style={{ background: darkAccent }} title="dark accent" />
        </span>
      </span>
      <span className="line-clamp-2 text-micro leading-relaxed text-muted-foreground">{philosophy}</span>
    </button>
  );
}

function TypeRow({ role, sample, note }: { role: string; sample: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-28 shrink-0 text-micro text-muted-foreground" dir="ltr">
        {role}
      </span>
      <span className={cn('min-w-0 flex-1 text-foreground', role)}>{sample}</span>
      <span className="shrink-0 text-micro text-muted-foreground-subtle">{note}</span>
    </div>
  );
}

function GrammarCard({
  code,
  title,
  description,
  children,
}: {
  code: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <AppCard className="flex flex-col gap-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-meta font-semibold text-foreground">{title}</span>
        <span className="text-micro tabular-nums text-muted-foreground" dir="ltr">{code}</span>
      </div>
      <div className="flex h-24 gap-1.5 rounded-sm bg-muted/40 p-2" aria-hidden>{children}</div>
      <p className="text-micro leading-relaxed text-muted-foreground">{description}</p>
    </AppCard>
  );
}

export default function DesignSystemGallery() {
  const { theme, setTheme, colorTheme, setColorTheme, paletteStyle, setPaletteStyle } = useApp();
  const isDark = theme === 'dark';
  const style: ThemeStyle = paletteStyle === 'rainbow' ? 'tonal' : (paletteStyle as ThemeStyle);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [sliderValue, setSliderValue] = useState([62]);

  // Each card shows the SAME preset in both modes, so it needs two token sets.
  // Computing one set from the active mode made the "light" row dark as well.
  const families = useMemo(
    () =>
      themePresets.map((preset) => ({
        preset,
        light: generateThemeTokens(preset, style, false, false),
        dark: generateThemeTokens(preset, style, true, false),
      })),
    [style],
  );

  return (
    <PageShell width="workspace" header={<PageHeader title="معرض نظام التصميم" subtitle="سطح تطوير — 14 عائلة، مكوّنات، حالات، RTL" />}>
      <div className="app-stack pb-page">
        {/* ── Controls ─────────────────────────────────────────────── */}
        <div className="app-card flex flex-col gap-3 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-meta font-semibold text-foreground">الوضع</span>
            <Button size="sm" variant={isDark ? 'default' : 'secondary'} onClick={() => setTheme('dark')}>
              داكن
            </Button>
            <Button size="sm" variant={!isDark ? 'default' : 'secondary'} onClick={() => setTheme('light')}>
              فاتح
            </Button>
            <span className="ms-2 text-meta font-semibold text-foreground">نمط اللوحة</span>
            {(['neutral', 'tonal', 'vibrant', 'expressive'] as const).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={paletteStyle === item ? 'default' : 'outline'}
                onClick={() => setPaletteStyle(item)}
              >
                {item}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {themePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setColorTheme(preset.id as Parameters<typeof setColorTheme>[0])}
                aria-pressed={colorTheme === preset.id}
                className={cn(
                  'app-focus-ring min-h-11 rounded-button border px-3 text-mini transition-colors duration-fast',
                  colorTheme === preset.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── 1. Theme families ────────────────────────────────────── */}
        <Section label="1 · عائلات الثيم (14)">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {families.map(({ preset, light, dark }) => (
              <ThemeCard
                key={preset.id}
                id={preset.id}
                name={preset.name}
                nameEn={preset.nameEn}
                philosophy={preset.artDirection.philosophy}
                lightCanvas={hsl(light['--background']) ?? '#000'}
                lightAccent={hsl(light['--primary']) ?? '#333'}
                darkCanvas={hsl(dark['--background']) ?? '#111'}
                darkAccent={hsl(dark['--primary']) ?? '#555'}
                active={colorTheme === preset.id}
                onPick={() => setColorTheme(preset.id as Parameters<typeof setColorTheme>[0])}
              />
            ))}
          </div>
        </Section>

        {/* ── 2. Semantic roles ────────────────────────────────────── */}
        <Section label="2 · الأدوار الدلالية (الثيم الحالي)">
          <AppCard className="p-4">
            {(() => {
              const active = themePresets.find((preset) => preset.id === colorTheme) ?? themePresets[0];
              const t = generateThemeTokens(active, style, isDark, false);
              const roles = [
                ['اللوحة', '--background'],
                ['السطح 1', '--card'],
                ['السطح 2', '--surface-2'],
                ['السطح 3', '--surface-3'],
                ['الإجراء', '--primary'],
                ['حاوية الإجراء', '--primary-container'],
                ['الثانوي', '--secondary'],
                ['الثالثي', '--tertiary'],
                ['نجاح', '--success'],
                ['تحذير', '--warning'],
                ['خطأ', '--destructive'],
                ['إشارة', '--signal'],
                ['المسار', '--track'],
                ['التنقّل', '--navigation'],
              ] as const;
              return (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
                  {roles.map(([label, role]) => (
                    <Swatch key={role} value={t[role]} label={label} />
                  ))}
                </div>
              );
            })()}
            <div className="mt-4 grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <Swatch
                  key={index}
                  value={generateThemeTokens(
                    themePresets.find((preset) => preset.id === colorTheme) ?? themePresets[0],
                    style,
                    isDark,
                    false,
                  )['--data-' + index]}
                  label={'data-' + index}
                />
              ))}
            </div>
          </AppCard>
        </Section>

        {/* ── 3. Typography ────────────────────────────────────────── */}
        <Section label="3 · الطباعة">
          <AppCard className="px-4 py-2">
            <TypeRow role="type-display" sample="محراب" note="وصول المجال · hero" />
            <TypeRow role="type-title" sample="المكتبة الكبرى" note="عنوان صفحة · display" />
            <TypeRow role="type-section" sample="أقسام اليوم" note="عنوان قسم · title" />
            <TypeRow role="text-body" sample="نص أساسي للقراءة اليومية يمتد على سطرين لاختبار الإيقاع والمسافة بين الأسطر." note="body · 16" />
            <TypeRow role="text-lead" sample="مقدمة بارزة تقود إلى الفعل الأساسي" note="lead · 18" />
            <TypeRow role="text-meta" sample="نص مساعد يشرح سياق القيمة" note="meta · 14" />
            <TypeRow role="text-mini" sample="بيانات ثانوية ووحدات" note="mini · 12.6" />
            <TypeRow role="text-micro" sample="تسمية دقيقة · 12" note="micro · 12" />
            <div className="flex flex-wrap items-baseline gap-4 py-3 text-foreground">
              <span className="tabular-nums text-title">1٬248</span>
              <span className="tabular-nums text-body">12.6</span>
              <span className="text-body" dir="ltr">Kaffee · 3.16</span>
              <span className="font-amiri text-title">وَقِفْ بِالطُّلُولِ</span>
            </div>
          </AppCard>
        </Section>

        {/* ── 4. Surfaces, lists, metrics ──────────────────────────── */}
        <Section label="4 · الأسطح والقوائم والقياس">
          <div className="grid gap-3 lg:grid-cols-2">
            <AppCard className="p-4">
              <h2 className="text-section text-foreground">بطاقة سطح</h2>
              <p className="mt-1 text-mini text-muted-foreground">
                سطح واحد، حدّ شعري، ومسافة تحمل الفصل. لا ظل افتراضي.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <IconChip><BookOpen className="h-4 w-4" aria-hidden /></IconChip>
                <Button size="sm">إجراء أساسي</Button>
                <Button size="sm" variant="outline">ثانوي</Button>
              </div>
            </AppCard>
            <AppList>
              <AppRow
                title="ورد القرآن"
                subtitle="10 صفحات كل يوم"
                leading={<IconChip><BookOpen className="h-4 w-4" aria-hidden /></IconChip>}
                value="٦٤٪"
                chevron
              />
              <AppRow
                title="سلسلة اليوم"
                subtitle="12 يوماً متتابعاً"
                leading={<IconChip tone="success"><Flame className="h-4 w-4" aria-hidden /></IconChip>}
                value="12"
              />
              <AppRow
                title="بحث"
                subtitle="ابحث في المكتبة"
                leading={<IconChip tone="plain"><Search className="h-4 w-4" aria-hidden /></IconChip>}
                chevron
              />
            </AppList>
          </div>
          <AppCard className="p-2">
            <StatGrid cols={3}>
              <Stat value="1٬248" label="بيت" />
              <Stat value="934" label="قصيدة" />
              <Stat value="170" label="شاعر" />
            </StatGrid>
          </AppCard>
        </Section>

        {/* ── 5. Controls ──────────────────────────────────────────── */}
        <Section label="5 · التحكم">
          <AppCard className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button>أساسي</Button>
              <Button variant="secondary">ثانوي</Button>
              <Button variant="outline">محدَّد</Button>
              <Button variant="tonal">حاوية</Button>
              <Button variant="ghost">هادئ</Button>
              <Button variant="destructive">خطر</Button>
              <Button variant="link">رابط</Button>
              <Button size="sm">صغير</Button>
              <Button size="lg">كبير</Button>
              <IconButton aria-label="بحث"><Search className="h-4 w-4" aria-hidden /></IconButton>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-label text-foreground">حقل نص</span>
                <Input placeholder="اكتب هنا…" />
                <span className="text-micro text-muted-foreground">نص مساعد تحت الحقل</span>
              </label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-body text-foreground">مفتاح تشغيل</span>
                  <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-label text-foreground">قيمة: {sliderValue[0]}٪</span>
                  <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
                </label>
              </div>
            </div>
            <Tabs defaultValue="one">
              <TabsList>
                <TabsTrigger value="one">الكل</TabsTrigger>
                <TabsTrigger value="two">المحفوظات</TabsTrigger>
                <TabsTrigger value="three">غير مقروء</TabsTrigger>
              </TabsList>
              <TabsContent value="one" className="pt-3">
                <p className="text-mini text-muted-foreground">محتوى التبويب الأول.</p>
              </TabsContent>
              <TabsContent value="two" className="pt-3">
                <p className="text-mini text-muted-foreground">محتوى التبويب الثاني.</p>
              </TabsContent>
              <TabsContent value="three" className="pt-3">
                <p className="text-mini text-muted-foreground">محتوى التبويب الثالث.</p>
              </TabsContent>
            </Tabs>
            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">افتح حواراً</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>سطح الحوار</DialogTitle>
                    <DialogDescription>
                      الحوار يستخدم سطح الطبقة الثالثة والتعتيم الوحيد في التطبيق.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button onClick={() => setDialogOpen(false)}>تأكيد</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </AppCard>
        </Section>

        {/* ── 6. States ────────────────────────────────────────────── */}
        <Section label="6 · الحالات">
          <div className="grid gap-3 md:grid-cols-2">
            <StateView
              compact
              kind="empty"
              title="لا ورد بعد"
              body="حدّد قدراً يومياً لتبدأ المتابعة."
              action={{ label: 'حدّد الورد', onClick: () => undefined }}
            />
            <StateView
              compact
              kind="search"
              title="لا نتائج"
              body="جرّب كلمة أقصر أو أزل الفلاتر."
              action={{ label: 'امسح البحث', onClick: () => undefined }}
            />
            <StateView compact kind="offline" title="لا اتصال" body="المحتوى المحفوظ متاح؛ سنعيد المحاولة تلقائياً." />
            <StateView compact kind="error" title="تعذّر التحميل" body="الخدمة لم تستجب. أعد المحاولة بعد قليل." action={{ label: 'إعادة المحاولة', onClick: () => undefined }} />
          </div>
          <AppCard className="p-4">
            <Skeleton className="h-6 w-40" />
            <SkeletonText className="mt-3" lines={3} />
          </AppCard>
        </Section>

        {/* ── 7. Page grammars ─────────────────────────────────────── */}
        <Section label="7 · قواعد الصفحات">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <GrammarCard code="G1" title="بوابة/نظرة عامة" description="ترويسة هوية + منطقة اليوم + أقسام وشبكة.">
              <div className="flex flex-1 flex-col gap-1"><div className="h-4 rounded-xs bg-primary/30" /><div className="h-10 rounded-sm bg-surface-1" /><div className="flex flex-1 gap-1"><div className="flex-1 rounded-sm bg-surface-1" /><div className="flex-1 rounded-sm bg-surface-1" /></div></div>
            </GrammarCard>
            <GrammarCard code="G2" title="تحريري/قراءة" description="عمود قراءة ضيق وعنوان وصول كبير.">
              <div className="mx-auto flex w-2/3 flex-col gap-1"><div className="h-3 rounded-xs bg-foreground/30" /><div className="h-2 rounded-xs bg-foreground/15" /><div className="h-2 rounded-xs bg-foreground/15" /><div className="h-2 w-4/5 rounded-xs bg-foreground/15" /><div className="h-2 rounded-xs bg-foreground/15" /></div>
            </GrammarCard>
            <GrammarCard code="G3" title="بيانات/قياس" description="قياسات ثم مخطط بعرض مساحة العمل.">
              <div className="flex flex-1 flex-col gap-1"><div className="flex gap-1"><div className="h-5 flex-1 rounded-xs bg-data-1/25" /><div className="h-5 flex-1 rounded-xs bg-data-2/25" /><div className="h-5 flex-1 rounded-xs bg-data-3/25" /></div><div className="flex-1 rounded-sm bg-surface-1" /></div>
            </GrammarCard>
            <GrammarCard code="G4" title="قوائم ومراجع" description="قائمة سطحها واحد وصفّها وحدة.">
              <div className="flex flex-1 flex-col justify-center gap-1"><div className="h-4 rounded-xs bg-surface-1" /><div className="h-4 rounded-xs bg-surface-1" /><div className="h-4 rounded-xs bg-surface-1" /></div>
            </GrammarCard>
            <GrammarCard code="G5" title="محادثة" description="تسلسل زمني وحقل ثابت.">
              <div className="flex flex-1 flex-col justify-end gap-1"><div className="h-4 w-2/3 self-start rounded-button bg-surface-1" /><div className="h-4 w-1/2 self-end rounded-button bg-primary/30" /><div className="h-5 rounded-button bg-surface-1" /></div>
            </GrammarCard>
            <GrammarCard code="G6" title="خرائط/فضاء" description="خريطة تملأ الإطار وأدوات عائمة.">
              <div className="relative flex-1 rounded-sm bg-data-4/20"><div className="absolute end-1 top-1 h-4 w-4 rounded-xs bg-surface-1" /><div className="absolute bottom-1 start-1 h-6 w-1/2 rounded-sm bg-surface-1" /></div>
            </GrammarCard>
            <GrammarCard code="G7" title="ألعاب/سطح كائني" description="إطار لعب وتحكم محيط.">
              <div className="flex flex-1 flex-col gap-1"><div className="flex-1 rounded-sm bg-foreground/20" /><div className="flex gap-1"><div className="h-4 flex-1 rounded-xs bg-surface-1" /><div className="h-4 flex-1 rounded-xs bg-surface-1" /><div className="h-4 flex-1 rounded-xs bg-surface-1" /></div></div>
            </GrammarCard>
          </div>
        </Section>

        {/* ── 8. RTL + mixed content ───────────────────────────────── */}
        <Section label="8 · RTL والمحتوى المختلط">
          <AppCard className="flex flex-col gap-2 p-4">
            <p className="text-body text-foreground">
              العربية هي التدفّق الأساسي. الكلمات الألمانية تُعرض موضعياً:{' '}
              <span dir="ltr" className="inline-block font-semibold">der Kaffee ist heiß</span>{' '}
              ثم يعود السطر إلى العربية. الأرقام أيضاً موضعية:{' '}
              <span dir="ltr" className="inline-block tabular-nums">3.16</span> و
              <span dir="ltr" className="inline-block tabular-nums">1,248</span>.
            </p>
            <p className="text-mini text-muted-foreground">
              البداية في اليمين، السهم يتقدّم يساراً، والرجوع يميناً. الحقول والصفوف والقوائم كلها بخصائص منطقية.
            </p>
          </AppCard>
        </Section>
      </div>
    </PageShell>
  );
}
