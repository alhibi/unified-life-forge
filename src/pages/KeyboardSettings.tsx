import { motion } from 'framer-motion';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { KeyboardSetting } from '@/features/keyboard';
import { Keyboard } from '@/lib/icons';
import { pageStagger as stagger } from '@/lib/motion';

/**
 * /settings/keyboard — الوجهة الوحيدة لإعدادات لوحة المفاتيح.
 *
 * Previously this page shipped a second, bespoke editor (352 lines with its
 * own hardcoded-hex theme swatches) while the SAME controls were also
 * embedded at the bottom of /settings/interface — two surfaces, one truth,
 * a violation of the one-place-per-information law. The page now hosts the
 * shared `KeyboardSetting` surface (the same component the soft keyboard
 * itself opens), so every preference has exactly one editor and one place.
 */
export default function KeyboardSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="لوحة المفاتيح — SmartHub"
        description="تفعيل لوحة مفاتيح التطبيق الذكية وتخصيص سماتها وارتفاعها وأصواتها وردود فعل اللمس في SmartHub."
        path="/settings/keyboard"
      />
      <PageHeader
        title="لوحة المفاتيح"
        subtitle="اللوحة الذكية والإدخال"
        backTo="/settings"
        sticky
        icon={
          <span className="row-icon">
            <Keyboard className="h-4 w-4" aria-hidden />
          </span>
        }
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg space-y-6 px-4 pb-page pt-4"
      >
        <KeyboardSetting />
      </motion.div>
    </div>
  );
}
