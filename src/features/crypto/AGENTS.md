## ميزة مراقبة العملات الرقمية (Crypto Watchlist)

- **الجدول**: `public.crypto_watchlist` (`user_id`, `chain_id`, `pair_address`, `token_symbol`, `label`) — RLS: كل مستخدم يرى ويعدّل صفوفه فقط، مع قيد فريد على `(user_id, chain_id, pair_address)` وقيد CHECK على الشبكات المدعومة.
- **الدالة الطرفية**: `supabase/functions/dexscreener-proxy` — عمليتان: `search` و`batch`، مع تخزين مؤقت (TTL)، قاطع دائرة يعيد بيانات قديمة بعلَم `stale`، تحديد معدّل لكل مستخدم، وتحقّق Zod للمخارج والمداخل. لا مفاتيح على العميل.
- **قائمة الشبكات المعتمدة**: مصدر واحد فقط في `src/features/crypto/types.ts` (`SUPPORTED_CHAINS`) — لا تُكرَّر في أي مكان آخر.
- **الأسعار**: تُنقل كسلاسل نصية من البداية للنهاية (لا تحويل إلى أرقام عائمة) لحفظ دقة العملات الصغيرة، وتُعرض بخطوط `tabular-nums`.
