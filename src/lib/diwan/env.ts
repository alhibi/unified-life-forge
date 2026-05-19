/**
 * فحص جاهزية Supabase لقسم الديوان.
 *
 * نُصدّر دالة وحيدة بدلاً من حقن المنطق في كلٍّ من api.ts و hooks.ts،
 * لأنّ التمييز بين "Supabase غير مكوّن" (وضع تجريبي متعمَّد) و
 * "Supabase مكوّن لكن فشل" (مشكلة شبكة) يُغيّر تماماً ما يُعرض في
 * مؤشّر الحالة على الـ UI.
 */
export function isSupabaseReady(): boolean {
  const url = import.meta.env?.VITE_SUPABASE_URL;
  const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  return !!(url && key && !String(url).includes('placeholder'));
}
