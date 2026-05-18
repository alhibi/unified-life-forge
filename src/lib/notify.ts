/**
 * Unified bilingual toast helper.
 *
 * Centralizes the dozens of `toast.success(isAr ? 'تم النسخ' : 'Copied')`
 * call-sites scattered across the app into a single consistent API,
 * so wording, duration and tone stay uniform.
 *
 * Language is auto-detected from `<html dir>` (rtl ⇒ Arabic, otherwise
 * German — the app's two locales). Pass `lang` explicitly to override.
 */
import { toast } from 'sonner';

type Lang = 'ar' | 'de';
type Pair = { ar: string; de: string };

function detectLang(): Lang {
  if (typeof document === 'undefined') return 'ar';
  return document.documentElement.dir === 'rtl' ? 'ar' : 'de';
}

function pick(p: Pair, lang?: Lang): string {
  return p[lang ?? detectLang()];
}

const M = {
  copied:           { ar: 'تم النسخ',                       de: 'Kopiert' },
  linkCopied:       { ar: 'تم نسخ الرابط',                  de: 'Link kopiert' },
  copyFailed:       { ar: 'تعذر النسخ',                     de: 'Kopieren fehlgeschlagen' },
  savedToClipboard: { ar: 'تم الحفظ في الحافظة',            de: 'In Zwischenablage gespeichert' },
  alreadySaved:     { ar: 'محفوظ مسبقاً',                   de: 'Bereits gespeichert' },
  deleted:          { ar: 'تم الحذف',                       de: 'Gelöscht' },
  refreshed:        { ar: 'تم التحديث',                     de: 'Aktualisiert' },
  refreshFailed:    { ar: 'فشل التحديث',                    de: 'Aktualisierung fehlgeschlagen' },
  networkOffline:   { ar: 'لا يوجد اتصال بالإنترنت',         de: 'Keine Internetverbindung' },
  signInRequired:   { ar: 'يلزم تسجيل الدخول',              de: 'Anmeldung erforderlich' },
  duplicateFeed:    { ar: 'هذا المصدر موجود بالفعل',        de: 'Diese Quelle ist bereits vorhanden' },
  feedAdded:        { ar: 'تمت إضافة المصدر',               de: 'Quelle hinzugefügt' },
  feedRemoved:      { ar: 'تم حذف المصدر',                  de: 'Quelle entfernt' },
} as const;

export const notify = {
  copied:           (lang?: Lang) => toast.success(pick(M.copied, lang)),
  linkCopied:       (lang?: Lang) => toast.success(pick(M.linkCopied, lang)),
  copyFailed:       (lang?: Lang) => toast.error(pick(M.copyFailed, lang)),
  savedToClipboard: (lang?: Lang) => toast.success(pick(M.savedToClipboard, lang)),
  alreadySaved:     (lang?: Lang) => toast.info(pick(M.alreadySaved, lang)),
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