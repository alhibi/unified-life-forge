/**
 * Unified bilingual toast helper.
 *
 * Centralizes the dozens of `toast.success(isAr ? 'تم النسخ' : 'Copied')`
 * call-sites scattered across the app into a single consistent API,
 * so wording, duration and tone stay uniform.
 *
 * Language is auto-detected from `<html dir>` (rtl ⇒ Arabic, otherwise
 * English — the app's two locales). Pass `lang` explicitly to override.
 *
 * Note: callers may still pass the legacy 'de' string for backward
 * compatibility — it's silently treated as 'en'. This avoids touching
 * every legacy call-site while we migrate the codebase.
 */
import { toast } from 'sonner';

type Lang = 'ar' | 'en';
type LegacyLang = Lang | 'de';
type Pair = { ar: string; en: string };

function normaliseLang(lang?: LegacyLang): Lang {
  if (lang === 'ar') return 'ar';
  if (lang === 'en' || lang === 'de') return 'en';
  return detectLang();
}

function detectLang(): Lang {
  if (typeof document === 'undefined') return 'ar';
  return document.documentElement.dir === 'rtl' ? 'ar' : 'en';
}

function pick(p: Pair, lang?: LegacyLang): string {
  return p[normaliseLang(lang)];
}

const M = {
  copied:           { ar: 'تم النسخ',                       en: 'Copied' },
  linkCopied:       { ar: 'تم نسخ الرابط',                  en: 'Link copied' },
  copyFailed:       { ar: 'تعذر النسخ',                     en: 'Copy failed' },
  deleted:          { ar: 'تم الحذف',                       en: 'Deleted' },
  refreshed:        { ar: 'تم التحديث',                     en: 'Refreshed' },
  refreshFailed:    { ar: 'فشل التحديث',                    en: 'Refresh failed' },
  networkOffline:   { ar: 'لا يوجد اتصال بالإنترنت',         en: 'No internet connection' },
  signInRequired:   { ar: 'يلزم تسجيل الدخول',              en: 'Sign-in required' },
  duplicateFeed:    { ar: 'هذا المصدر موجود بالفعل',        en: 'This feed already exists' },
  feedAdded:        { ar: 'تمت إضافة المصدر',               en: 'Feed added' },
  feedRemoved:      { ar: 'تم حذف المصدر',                  en: 'Feed removed' },
} as const;

export const notify = {
  copied:           (lang?: LegacyLang) => toast.success(pick(M.copied, lang)),
  linkCopied:       (lang?: LegacyLang) => toast.success(pick(M.linkCopied, lang)),
  copyFailed:       (lang?: LegacyLang) => toast.error(pick(M.copyFailed, lang)),
  deleted:          (lang?: LegacyLang) => toast.success(pick(M.deleted, lang)),
  refreshed:        (lang?: LegacyLang) => toast.success(pick(M.refreshed, lang)),
  refreshFailed:    (lang?: LegacyLang) => toast.error(pick(M.refreshFailed, lang)),
  networkOffline:   (lang?: LegacyLang) => toast.error(pick(M.networkOffline, lang)),
  signInRequired:   (lang?: LegacyLang) => toast.error(pick(M.signInRequired, lang)),
  duplicateFeed:    (lang?: LegacyLang) => toast.error(pick(M.duplicateFeed, lang)),
  feedAdded:        (lang?: LegacyLang) => toast.success(pick(M.feedAdded, lang)),
  feedRemoved:      (lang?: LegacyLang) => toast.success(pick(M.feedRemoved, lang)),

  /** Escape hatch — free-form bilingual message. */
  success: (pair: Pair, lang?: LegacyLang) => toast.success(pick(pair, lang)),
  error:   (pair: Pair, lang?: LegacyLang) => toast.error(pick(pair, lang)),
  info:    (pair: Pair, lang?: LegacyLang) => toast.info(pick(pair, lang)),
};
