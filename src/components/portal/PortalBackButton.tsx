import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

import { useApp } from '@/contexts/AppContext';
import { House } from '@/lib/icons';
import { FLOATING_DOCK_OFFSET, FLOATING_DOCK_SIZE } from '@/lib/layout';

/**
 * Floating "return to portal" dock. Rendered globally by App.tsx and
 * hidden on the portal itself and on full-screen surfaces (auth, oauth
 * consent) where a floating chip would fight the UI.
 *
 * The bottom offset is applied via `bottom` only. The previous version set
 * BOTH `paddingBottom` and `marginBottom` to `env(safe-area-inset-bottom)`
 * on a fixed 44px button, which pushed the icon off-centre and moved the
 * button twice as far up as intended on devices with a home indicator.
 */
export default function PortalBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { dir } = useApp();

  const hidden =
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/.lovable/oauth');

  const sideClass = dir === 'rtl' ? 'right-4' : 'left-4';

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.button
          key="portal-back"
          type="button"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate('/')}
          aria-label="العودة إلى البوابة"
          className={`fixed ${sideClass} z-float flex items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-md backdrop-blur-md`}
          style={{
            width: FLOATING_DOCK_SIZE,
            height: FLOATING_DOCK_SIZE,
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${FLOATING_DOCK_OFFSET}px)`,
          }}
        >
          <House className="h-5 w-5" aria-hidden />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
