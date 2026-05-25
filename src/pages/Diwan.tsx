import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * مسار /diwan — توافق عكسي.
 *
 * المكتبة الكبرى انتقلت لتكون تبويب "الأدب" داخل /mihrab. أمّا
 * المسارات التفصيلية (/diwan/library, /diwan/library/poets, …)
 * فلا تزال تعمل وتُعرض كصفحات عميقة بزر رجوع.
 *
 * نضبط هنا آخر تبويب مفتوح في mihrab على "الأدب" قبل التحويل، حتى
 * يهبط المستخدم على المكان الصحيح مباشرة. `replace` يحافظ على نظافة
 * الـhistory.
 */
export default function DiwanPage() {
  useEffect(() => {
    try { localStorage.setItem('mihrab:lastTab', 'literature'); } catch { /* noop */ }
  }, []);
  return <Navigate to="/mihrab" replace />;
}
