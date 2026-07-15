## الهدف
تقسيم `src/components/chat/useChat.ts` (1787 سطر) إلى وحدات صغيرة قابلة للقراءة، مع الحفاظ على واجهة `useChat` العامّة كما هي بالضبط — أي مكوّن `ChatDrawer` وبقية الملفات التي تستورد `useChat` لن تحتاج أي تعديل.

## المبدأ
- **لا نغيّر سلوكاً**: نفس الحالات، نفس القيم المُرجَعة، نفس ترتيب `useEffect`، نفس أسماء المتغيّرات.
- **نُخرج فقط الأجزاء المستقلّة**: الدوال النقيّة (pure) والـ hooks الفرعية التي لا تعتمد على أكثر من مدخلات محدّدة.
- **نتحقّق بعد كل خطوة**: `tsgo --noEmit` + تشغيل الشات يدوياً في المعاينة.

## الوحدات الخمسة الجديدة

```text
src/components/chat/
├── useChat.ts                 (الملف الأصلي — يتقلّص إلى ~600 سطر orchestrator)
├── internal/
│   ├── clientId.ts            (~15 سطر) توليد UUID
│   ├── useConversations.ts    (~250 سطر) تحميل + realtime + تصنيف المحادثات
│   ├── useMessages.ts         (~400 سطر) تحميل + realtime + إرسال + تعديل الرسائل
│   ├── useTypingChannel.ts    (~120 سطر) قناة "يكتب الآن"
│   └── useChatSearch.ts       (~100 سطر) البحث داخل الشات
```

## الخطوات (بالترتيب، خطوة تلو الأخرى)

### 1. `clientId.ts` — مخاطرة صفر
- نقل `newClientId()` والتعليقات فوقه.
- استيراده في `useChat.ts`.
- **تحقّق**: type-check.

### 2. `useTypingChannel.ts` — مخاطرة منخفضة
- استخراج `typingChannelRef`, `typingTimeoutRef`, `typingUser`, `typingByConv` والـ effect المتعلّق بها.
- يرجع: `{ typingUser, typingByConv, notifyTyping }`.
- **تحقّق**: افتح شاتاً، اكتب، تأكّد أن الطرف الآخر يرى "يكتب".

### 3. `useChatSearch.ts` — مخاطرة منخفضة
- استخراج `showSearch`, `chatSearchQuery`, `searchResults`, `searchIndex` والدوال المتعلّقة.
- **تحقّق**: افتح بحث الرسائل، ابحث عن كلمة.

### 4. `useConversations.ts` — مخاطرة متوسّطة
- استخراج `conversations`, `activeConv`, `loadConversations`, `conversationFilter`, realtime channel للمحادثات.
- **تحقّق**: تحميل قائمة المحادثات، تصفية All/Unread/Archived.

### 5. `useMessages.ts` — مخاطرة أعلى (يُنفَّذ أخيراً)
- استخراج `messages`, `sendMessage`, `editMessage`, `deleteMessage`, realtime للرسائل، mark_delivered/read.
- **تحقّق**: أرسل رسالة، عدّلها، احذفها، تأكّد من علامات التسليم والقراءة، تأكّد من الصور المرفوعة.

## قواعد الأمان أثناء التنفيذ
- **لا نغيّر منطقاً**: فقط `Cut → Paste → export/import`.
- **بعد كل خطوة**: type-check + قراءة `useChat.ts` للتأكّد أن السطور المتبقّية سليمة.
- **الـ refs المشتركة** (مثل `userIdRef`, `activeConvIdRef`) تبقى في `useChat.ts` وتُمرَّر للـ hooks الفرعية كوسيط.
- **إذا فشل type-check** بعد أي خطوة → إرجاع تلك الخطوة فقط والانتقال للتي بعدها.

## ما لن يتغيّر
- توقيع `useChat({ open, onUnreadChange })`.
- كل الحقول المُرجَعة (30+ حقلاً).
- ترتيب استدعاء الـ effects.
- سلوك الصوت، الاهتزاز، التمرير التلقائي.

## ما بعد الإنجاز
- `useChat.ts` النهائي: ~600 سطر تركيبي (يستدعي الـ hooks الفرعية ويربطها).
- تعديلات مستقبلية على "الرسائل فقط" أو "البحث فقط" تصبح في ملف صغير معزول.
- أي baseline test مستقبلي يمكن استهدافه بسهولة.

هل تبدأ بالخطوة 1؟