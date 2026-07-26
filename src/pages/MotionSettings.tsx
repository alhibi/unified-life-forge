import { motion } from 'framer-motion';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { MotionSection } from '@/features/motion';
import { Gauge } from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';

/**
 * /settings/motion — الحركة والأداء.
 *
 * The motion platform: the navigation character, the easing family, the scroll
 * behaviour, how transient surfaces appear, the three global multipliers, the
 * back gesture, the frame budget, the adaptive governor, and a live readout of
 * the frames the user is actually getting.
 *
 * Nothing on this screen is cosmetic. Every control either mutates the shared
 * `MOTION` token object that framer-motion reads on its next transition, or
 * publishes a CSS custom property / data attribute that `index.css` reads — and
 * usually both, which is why one change is felt by framer-motion, Radix,
 * tailwindcss-animate, vaul, sonner and the native press feedback at once.
 *
 * The page shell matches `/settings/interface` exactly (SEO + PageHeader +
 * a staggered column) so the two halves of the platform read as one product.
 */
export default function MotionSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="الحركة والأداء — SmartHub"
        description="منصة متقدمة لضبط انتقالات الشاشات ومنحنيات التسارع ونعومة التمرير وميزانية الإطارات في SmartHub."
        path="/settings/motion"
      />
      <PageHeader
        title="منصة الحركة"
        subtitle="الانتقال والتمرير والإطارات"
        backTo="/settings"
        sticky
        icon={
          <span className="row-icon">
            <Gauge className="h-4 w-4" aria-hidden />
          </span>
        }
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg space-y-6 px-4 pb-page pt-4"
      >
        <MotionSection />
        <motion.p variants={item} className="text-center text-micro text-muted-foreground">
          إعداد واحد يترجم إلى مضاعف أو منحنى على جذر المستند، فيصل إلى كل حركة في التطبيق فوراً
        </motion.p>
      </motion.div>
    </div>
  );
}
