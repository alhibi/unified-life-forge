import React from 'react';
import DiwanLibraryPage from './diwan/Library';

/**
 * نقطة دخول قسم الديوان.
 *
 * تاريخياً كانت هذه الصفحة تعرض "ديوان الشعر" المحلّي (شجرة عصور
 * + Literary Graph) وكانت "المكتبة الكبرى" تابعة في `/diwan/library`.
 * الآن المكتبة الكبرى هي الواجهة الأم لقسم الديوان: نُمرّر الـ Library
 * مباشرة كـ tab (بلا زر رجوع) لأنّ هذا التبويب نفسه هو الجذر.
 *
 * • الشجرة الأدبية انتقلت إلى داخل صفحة "البحث المتقدّم"
 *   (`/diwan/library/search`) كقسم قابل للطيّ.
 * • مسار `/diwan/library` لا يزال مدعوماً (alias لنفس الواجهة) للحفاظ
 *   على الروابط القديمة من خارج التطبيق.
 */
export default function DiwanPage() {
  return <DiwanLibraryPage tab />;
}
