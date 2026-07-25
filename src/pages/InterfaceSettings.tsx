import { motion } from 'framer-motion';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { InterfaceSection } from '@/features/appearance';
import { SlidersHorizontal } from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

/**
 * الواجهة — the geometry of the app.
 *
 * Corners, density, measure, hairlines and surface lift. None of these are
 * colour and none of them are type, and until the appearance engine was rebuilt
 * none of them were adjustable at all: they were rem literals scattered through
 * index.css.
 */
export default function InterfaceSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="الواجهة — SmartHub"
        description="اضبط الحواف وكثافة العناصر وعرض المحتوى وقوة الحدود في SmartHub."
        path="/settings/interface"
      />
      <PageHeader
        title="الواجهة"
        subtitle="الحواف والكثافة والأبعاد"
        backTo="/settings"
        sticky
        icon={
          <span className="row-icon">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
          </span>
        }
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg space-y-6 px-4 pb-page pt-4"
      >
        <InterfaceSection />
        <motion.p variants={item} className="text-center text-micro text-muted-foreground">
          الأرقام هنا تكتب متغيرات CSS على جذر الصفحة، فيتحرك التطبيق كله معاً
        </motion.p>
      </motion.div>
    </div>
  );
}
