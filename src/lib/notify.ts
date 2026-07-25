/**
 * Unified toast helper.
 *
 * Centralizes the dozens of copy/success/error toast call-sites
 * call-sites scattered across the app into a single consistent API,
 * so wording, duration and tone stay uniform.
 *
 * Language is auto-detected from `<html dir>`; the app defaults to Arabic.
 */
import { toast } from 'sonner';

type Lang = 'ar' | 'en';
type Pair = { ar: string; en: string };

function normaliseLang(lang?: Lang): Lang {
  if (lang === 'ar') return 'ar';
  if (lang === 'en') return 'en';
  return detectLang();
}

function detectLang(): Lang {
  if (typeof document === 'undefined') return 'ar';
  return document.documentElement.dir === 'rtl' ? 'ar' : 'en';
}

function pick(p: Pair, lang?: Lang): string {
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
  copied:           (lang?: Lang) => toast.success(pick(M.copied, lang)),
  linkCopied:       (lang?: Lang) => toast.success(pick(M.linkCopied, lang)),
  copyFailed:       (lang?: Lang) => toast.error(pick(M.copyFailed, lang)),
  deleted:          (lang?: Lang) => toast.success(pick(M.deleted, lang)),
  refreshed:        (lang?: Lang) => toast.success(pick(M.refreshed, lang)),
  refreshFailed:    (lang?: Lang) => toast.error(pick(M.refreshFailed, lang)),
  networkOffline:   (lang?: Lang) => toast.error(pick(M.networkOffline, lang)),
  signInRequired:   (lang?: Lang) => toast.error(pick(M.signInRequired, lang)),
  duplicateFeed:    (lang?: Lang) => toast.error(pick(M.duplicateFeed, lang)),
  feedAdded:        (lang?: Lang) => toast.success(pick(M.feedAdded, lang)),
  feedRemoved:      (lang?: Lang) => toast.success(pick(M.feedRemoved, lang)),

  /** Escape hatch — free-form bilingual message. */
  success: (pair: Pair, lang?: Lang) => toast.success(pick(pair, lang)),
  error:   (pair: Pair, lang?: Lang) => toast.error(pick(pair, lang)),
  info:    (pair: Pair, lang?: Lang) => toast.info(pick(pair, lang)),
};
