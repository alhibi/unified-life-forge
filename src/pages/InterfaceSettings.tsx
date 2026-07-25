import { motion } from 'framer-motion';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { InterfaceSection } from '@/features/appearance';
import { SlidersHorizontal } from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

/**
 * الواجهة — منصة الشكل والسلوك على مستوى التطبيق.
 *
 * المقياس المستقل، التكيف، الحواف، الكثافة، العرض، الحدود، الخامات،
 * استجابة التفاعل وأدوات الإتاحة. جميعها تُترجم إلى رموز جذرية واحدة،
 * وتُستعاد قبل React لمنع قفزة التخطيط عند الإقلاع.
 */
export default function InterfaceSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="الواجهة — SmartHub"
        description="منصة متقدمة لضبط مقياس الواجهة والتكيف والخامات والتفاعل والإتاحة في SmartHub."
        path="/settings/interface"
      />
      <PageHeader
        title="منصة الواجهة"
        subtitle="الشكل والسلوك والإتاحة"
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
          إعداد واحد يترجم إلى رموز جذرية ثابتة ويصل إلى كل واجهات التطبيق فوراً
        </motion.p>
      </motion.div>
    </div>
  );
}
