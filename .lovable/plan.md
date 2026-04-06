
## خطة التحويل إلى تجربة موبايل أصلية

### المرحلة 1: CSS العام والأساسيات
- إزالة تأثيرات المتصفح (tap highlight, text selection, scrollbars)
- إضافة overscroll-behavior و momentum scrolling
- إضافة touch feedback عالمي (scale animation)
- تعيين safe-area insets للأعلى والأسفل
- تحسين viewport meta tag (منع الزوم)
- تعيين خط النظام العربي

### المرحلة 2: شريط التنقل السفلي
- تحسين frosted glass effect
- إضافة safe-area padding
- تحسين انتقالات التبويب النشط

### المرحلة 3: انتقالات الصفحات
- slide من اليمين للصفحات الفرعية
- fade سريع لتبديل التبويبات
- منع الوميض الأبيض

### المرحلة 4: Error Boundary عربي
- مكون ErrorBoundary بواجهة عربية ودودة
- تغليف الأقسام الرئيسية

### المرحلة 5: أداء وتحسينات
- التأكد من lazy loading
- إضافة skeleton loaders
- تحسين الكاروسيل الأفقي (scroll-snap)

### المرحلة 6: PWA و meta tags
- manifest.json للتثبيت
- theme-color
- منع context menu على عناصر UI
