import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * مسار /duas — توافق عكسي.
 *
 * المحتوى انتقل بالكامل إلى تبويب "الذكر" داخل /mihrab. نُحوّل هنا
 * أي زيارة قديمة لـ /duas إلى /mihrab بعد ضبط آخر تبويب مفتوح
 * ليكون "الذكر"، حتى يهبط المستخدم مباشرة في الواجهة الصحيحة.
 *
 * استخدام `<Navigate replace />` يضمن ألا يتراكم /duas في تاريخ
 * المتصفّح، فزر "الرجوع" يعيد المستخدم إلى الصفحة التي كان عليها
 * قبل النقر على الرابط القديم.
 */
export default function DuasPage() {
  useEffect(() => {
    try { localStorage.setItem('mihrab:lastTab', 'dhikr'); } catch { /* noop */ }
  }, []);
  return <Navigate to="/mihrab" replace />;
}
