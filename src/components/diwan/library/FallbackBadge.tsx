import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, FlaskConical } from 'lucide-react';
import { useFallbackStatus } from '@/lib/diwan/fallback-status';

/**
 * شارة صغيرة تُعلم المستخدم متى يُعرض محتوى من البيانات المحلية بدلاً
 * من Supabase. توضع في رؤوس صفحات المكتبة تحت العنوان مباشرةً.
 *
 * ثلاث حالات:
 *   • none    — مخفية تماماً (Supabase تردّ بنجاح)
 *   • demo    — "وضع تجريبي" (Supabase غير مكوَّن أو فارغة)
 *   • offline — "غير متصل بالخادم" (الاستدعاء فشل، البيانات قد تنقص)
 *
 * نتعمّد ألاّ نعرض رسالة خطأ صاخبة: المستخدم يبصر شارة بنبرة هادئة
 * فيعرف "ما أراه قد يكون أقلّ من المتاح فعلياً". هذا أفضل بكثير من
 * فشل صامت.
 */
export default function FallbackBadge() {
  const { kind } = useFallbackStatus();

  return (
    <AnimatePresence>
      {kind !== 'none' && (
        <motion.div
          key={kind}
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
            kind === 'offline'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              : 'bg-muted/60 text-muted-foreground border border-border/30'
          }`}
          role="status"
          aria-live="polite"
        >
          {kind === 'offline' ? (
            <>
              <WifiOff className="w-3 h-3" aria-hidden />
              <span>غير متصل بالخادم</span>
            </>
          ) : (
            <>
              <FlaskConical className="w-3 h-3" aria-hidden />
              <span>وضع تجريبي</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
