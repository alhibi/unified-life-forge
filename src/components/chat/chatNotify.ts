// ─────────────────────────────────────────────────────────────────────────────
// Centralized chat-side notifications, validators and error-message mapping.
// All UI-facing messages are bilingual (ar/de). Keeps useChat / useVoiceRecording
// free from per-call toast boilerplate.
// ─────────────────────────────────────────────────────────────────────────────
import { toast } from 'sonner';
import { haptic, playChatSound } from './sounds';

// Limits (defensive). Storage bucket is already bandwidth-limited; these make
// the UX honest when a user drops a massive file instead of hanging.
export const MAX_TEXT_LENGTH      = 4096;          // chars per message
export const MAX_IMAGE_BYTES      = 20 * 1024 * 1024; // 20 MB per image
export const MAX_FILE_BYTES       = 50 * 1024 * 1024; // 50 MB per generic file
export const MAX_VOICE_BYTES      = 25 * 1024 * 1024; // 25 MB per voice clip
export const MAX_VOICE_SECONDS    = 10 * 60;       // 10 min recording cap
export const MAX_STAGED_IMAGES    = 10;            // max images in one send

type Pair = { ar: string; };

const M = {
  sendFailed:        { ar: 'تعذر إرسال الرسالة، حاول مرة أخرى', },
  editFailed:        { ar: 'تعذر حفظ التعديل', },
  deleteFailed:      { ar: 'تعذر حذف الرسالة', },
  reactionFailed:    { ar: 'تعذر إضافة التفاعل', },
  uploadFailed:      { ar: 'تعذر رفع الملف', },
  voiceUploadFailed: { ar: 'تعذر إرسال الرسالة الصوتية', },
  voicePlayFailed:   { ar: 'تعذر تشغيل الرسالة الصوتية', },
  voiceEmpty:        { ar: 'التسجيل قصير جداً', },
  voiceTooLong:      { ar: 'تم إيقاف التسجيل (الحد الأقصى 10 دقائق)', },
  micDenied:         { ar: 'يرجى السماح باستخدام الميكروفون', },
  micUnavailable:    { ar: 'الميكروفون غير متاح', },
  micBusy:           { ar: 'الميكروفون قيد الاستخدام', },
  fileTooLarge:      { ar: 'الملف كبير جداً', },
  imageTooLarge:     { ar: 'الصورة كبيرة جداً (الحد 20 م.ب)', },
  voiceTooBig:       { ar: 'التسجيل كبير جداً', },
  tooManyImages:     { ar: 'يمكن إرسال 10 صور كحد أقصى', },
  textTooLong:       { ar: 'الرسالة طويلة جداً', },
  searchFailed:      { ar: 'تعذر البحث، حاول لاحقاً', },
  userNotFound:      { ar: 'لم يتم العثور على المستخدم', },
  convStartFailed:   { ar: 'تعذر بدء المحادثة', },
  networkOffline:    { ar: 'لا يوجد اتصال بالإنترنت', },
  copied:            { ar: 'تم النسخ', },
  linkCopyFailed:    { ar: 'تعذر النسخ', },
  conversationGone:  { ar: 'المحادثة غير متاحة', },
  heicUnsupported:   { ar: 'لا يدعم متصفحك صور iPhone (HEIC). يرجى تصدير الصورة بصيغة JPEG.', },
  imageDecodeFailed: { ar: 'تعذر قراءة الصورة', },
} as const;

type Key = keyof typeof M;

function pick(pair: Pair, isAr: boolean) { return pair.ar; }

/** Soft error: brief destructive toast + error chirp + light haptic. */
export function chatError(key: Key, isAr: boolean, description?: string) {
  playChatSound('error');
  haptic('medium');
  toast.error(pick(M[key], isAr), description ? { description } : undefined);
}

/** Neutral info toast. */
export function chatInfo(key: Key, isAr: boolean) {
  toast(pick(M[key], isAr));
}

/** Success toast (used sparingly – most actions are visually obvious). */
export function chatSuccess(key: Key, isAr: boolean) {
  toast.success(pick(M[key], isAr));
}

/** Returns a user-friendly message for a caught supabase/fetch error. */
export function describeError(err: unknown, isAr: boolean): string {
  if (!err) return 'خطأ غير معروف';
  const e = err as { message?: string; error?: { message?: string } };
  const raw = e.message || e.error?.message || '';
  if (!raw) return '';
  if (/network|fetch|offline|failed to fetch/i.test(raw)) return pick(M.networkOffline, isAr);
  return raw.slice(0, 120);
}

/** Validate a file against its category. Returns true when OK, otherwise toasts. */
export function validateFile(
  file: File,
  category: 'image' | 'file' | 'voice',
  isAr: boolean,
): boolean {
  const size = file.size;
  if (category === 'image' && size > MAX_IMAGE_BYTES) { chatError('imageTooLarge', isAr); return false; }
  if (category === 'voice' && size > MAX_VOICE_BYTES) { chatError('voiceTooBig',   isAr); return false; }
  if (category === 'file'  && size > MAX_FILE_BYTES)  { chatError('fileTooLarge',  isAr); return false; }
  if (size === 0) { chatError(category === 'voice' ? 'voiceEmpty' : 'uploadFailed', isAr); return false; }
  return true;
}

/** Clip text to MAX_TEXT_LENGTH, returning clipped flag. */
export function clampText(text: string): { text: string; clipped: boolean } {
  if (text.length <= MAX_TEXT_LENGTH) return { text, clipped: false };
  return { text: text.slice(0, MAX_TEXT_LENGTH), clipped: true };
}

/** Map a getUserMedia error to a localized toast. */
export function reportMicError(err: unknown, isAr: boolean) {
  const name = (err as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') { chatError('micDenied', isAr); return; }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') { chatError('micUnavailable', isAr); return; }
  if (name === 'NotReadableError' || name === 'AbortError') { chatError('micBusy', isAr); return; }
  chatError('micUnavailable', isAr);
}
