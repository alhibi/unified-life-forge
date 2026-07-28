import React, { lazy, Suspense } from 'react';

import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';

// Lazy load the great library page
const DiwanLibraryPage = lazy(() => import('./Library'));

const LibrarySkeleton = () => (
  <div className="space-y-2 pt-1 min-h-screen bg-[#16130F] p-5">
    <div className="h-24 rounded-xl animate-pulse bg-[#1D1811]" />
    <div className="h-16 rounded-xl animate-pulse bg-[#1D1811]" />
    <div className="h-20 rounded-xl animate-pulse bg-[#1D1811]" />
  </div>
);

/**
 * مسار /diwan — أصبح صفحة مستقلة تماماً للأدب والشعر العربي الكلاسيكي.
 * يستدعي مكتبة الديوان الكبرى مباشرة كصفحة كاملة مع زر رجوع للرئيسي.
 */
export default function DiwanPage() {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <SEO
        title="الأدب العربي — المكتبة الكبرى"
        description="آلاف الشعراء وعشرات الآلاف من القصائد عبر العصور: الجاهلي، الأموي، العباسي، الأندلسي وما بعدها."
        path="/diwan"
      />
      <DiwanLibraryPage tab={false} />
    </Suspense>
  );
}
