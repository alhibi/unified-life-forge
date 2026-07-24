import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { House } from '@/lib/icons';
import { useApp } from '@/contexts/AppContext';

/**
 * Floating "return to portal" button. Rendered globally by App.tsx and
 * hidden on the portal itself and on a couple of full-screen surfaces
 * (auth, oauth consent) where a floating chip would fight the UI.
 */
export default function PortalBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { language, dir } = useApp();

  const hidden =
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/.lovable/oauth');

  const label = language === 'ar' ? 'العودة إلى البوابة' : 'Zur Startseite';
  const sideClass = dir === 'rtl' ? 'right-4' : 'left-4';

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.button
          key="portal-back"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate('/')}
          aria-label={label}
          className={`fixed bottom-4 ${sideClass} z-40 h-11 w-11 rounded-full flex items-center justify-center backdrop-blur-md bg-background/90 border border-border/60 shadow-md text-foreground active:scale-[0.98] transition-transform`}
          style={{
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            marginBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <House className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}