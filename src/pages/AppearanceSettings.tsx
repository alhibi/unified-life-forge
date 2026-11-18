import { motion } from 'framer-motion';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import {
  AutoPrayerThemeSection,
  IconsSection,
  ModeSection,
  PaletteSection,
  TypographySection,
} from '@/features/appearance';
import { Palette } from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

/**
 * المظهر — one screen for colour and type.
 *
 * This replaces the two screens that used to split the appearance engine in
 * half: a theme page that could not show what a font choice did, and a font
 * page that could not show what a theme did. Everything that changes how the
 * app *reads* now lives together; everything that changes its *shape* lives on
 * the الواجهة screen.
 */
export default function AppearanceSettingsPage() {
  return (
    <PageShell
      header={
        <PageHeader
          title="المظهر"
          subtitle="الألوان والخطوط"
          backTo="/settings"
          sticky
          icon={
            <span className="row-icon">
              <Palette className="h-4 w-4" aria-hidden />
            </span>
          }
        />
      }
    >
      <SEO
        title="المظهر — SmartHub"
        description="اختر الوضع والثيم وأزواج الخطوط ومقياس النص في SmartHub."
        path="/settings/appearance"
      />
      <motion.div variants={stagger} initial="hidden" animate="show" className="app-stack">
        <ModeSection />
        <PaletteSection />
        <TypographySection />
        <IconsSection />
        <AutoPrayerThemeSection />
        <motion.p variants={item} className="text-center text-micro text-muted-foreground">
          كل تغيير يُطبَّق فوراً ويُحفظ مع حسابك
        </motion.p>
      </motion.div>
    </PageShell>
  );
}
