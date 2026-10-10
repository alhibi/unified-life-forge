import React, { lazy, Suspense } from 'react';

import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';

// Lazy load the great library page
const DiwanLibraryPage = lazy(() => import('./Library'));

const LibrarySkeleton = () => (
  <div className="space-y-2 pt-1">
    <div className="skeleton h-24 rounded-lg" />
    <div className="skeleton h-16 rounded-lg" />
    <div className="skeleton h-20 rounded-lg" />
  </div>
);

/**
 * مسار /diwan — صفحة مستقلة للأدب والشعر العربي الكلاسيكي. يستدعي
 * مكتبة الديوان الكبرى مباشرة كصفحة كاملة (مع هيكل تحميل من طبقة
 * .skeleton بدل بطاقات السطح الخام).
 */
export default function DiwanPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <LibrarySkeleton />
        </PageShell>
      }
    >
      <SEO
        title="الأدب العربي — المكتبة الكبرى"
        description="آلاف الشعراء وعشرات الآلاف من القصائد عبر العصور: الجاهلي، الأموي، العباسي، الأندلسي وما بعدها."
        path="/diwan"
      />
      <DiwanLibraryPage tab={false} />
    </Suspense>
  );
}
