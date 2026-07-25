// ─────────────────────────────────────────────────────────────────────────────
// Centralized chat-side notifications, validators and error-message mapping.
// Keeps useChat / useVoiceRecording free from per-call toast boilerplate.
//
// The message table used to be a locale map (`{ ar, de }`) read through a
// `pick()` indirection, and every notifier took an `isAr: boolean` it never
// used. Both are gone: the app is Arabic-only, so the table is plain strings.
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

const M = {
  sendFailed:        'تعذر إرسال الرسالة، حاول مرة أخرى',
  editFailed:        'تعذر حفظ التعديل',
  deleteFailed:      'تعذر حذف الرسالة',
  reactionFailed:    'تعذر إضافة التفاعل',
  uploadFailed:      'تعذر رفع الملف',
  voiceUploadFailed: 'تعذر إرسال الرسالة الصوتية',
  voicePlayFailed:   'تعذر تشغيل الرسالة الصوتية',
  voiceEmpty:        'التسجيل قصير جداً',
  voiceTooLong:      'تم إيقاف التسجيل (الحد الأقصى 10 دقائق)',
  micDenied:         'يرجى السماح باستخدام الميكروفون',
  micUnavailable:    'الميكروفون غير متاح',
  micBusy:           'الميكروفون قيد الاستخدام',
  fileTooLarge:      'الملف كبير جداً',
  imageTooLarge:     'الصورة كبيرة جداً (الحد 20 م.ب)',
  voiceTooBig:       'التسجيل كبير جداً',
  tooManyImages:     'يمكن إرسال 10 صور كحد أقصى',
  textTooLong:       'الرسالة طويلة جداً',
  searchFailed:      'تعذر البحث، حاول لاحقاً',
  userNotFound:      'لم يتم العثور على المستخدم',
  convStartFailed:   'تعذر بدء المحادثة',
  networkOffline:    'لا يوجد اتصال بالإنترنت',
  copied:            'تم النسخ',
  linkCopyFailed:    'تعذر النسخ',
  conversationGone:  'المحادثة غير متاحة',
  heicUnsupported:   'لا يدعم متصفحك صور iPhone (HEIC). يرجى تصدير الصورة بصيغة JPEG.',
  imageDecodeFailed: 'تعذر قراءة الصورة',
} as const;

type Key = keyof typeof M;

/** Soft error: brief destructive toast + error chirp + light haptic. */
export function chatError(key: Key, description?: string) {
  playChatSound('error');
  haptic('medium');
  toast.error(M[key], description ? { description } : undefined);
}

/** Neutral info toast. */
export function chatInfo(key: Key) {
  toast(M[key]);
}

/** Success toast (used sparingly – most actions are visually obvious). */
export function chatSuccess(key: Key) {
  toast.success(M[key]);
}

/** Returns a user-friendly message for a caught supabase/fetch error. */
export function describeError(err: unknown): string {
  if (!err) return 'خطأ غير معروف';
  const e = err as { message?: string; error?: { message?: string } };
  const raw = e.message || e.error?.message || '';
  if (!raw) return '';
  if (/network|fetch|offline|failed to fetch/i.test(raw)) return M.networkOffline;
  return raw.slice(0, 120);
}

/** Validate a file against its category. Returns true when OK, otherwise toasts. */
export function validateFile(
  file: File,
  category: 'image' | 'file' | 'voice',
): boolean {
  const size = file.size;
  if (category === 'image' && size > MAX_IMAGE_BYTES) { chatError('imageTooLarge'); return false; }
  if (category === 'voice' && size > MAX_VOICE_BYTES) { chatError('voiceTooBig'); return false; }
  if (category === 'file'  && size > MAX_FILE_BYTES)  { chatError('fileTooLarge'); return false; }
  if (size === 0) { chatError(category === 'voice' ? 'voiceEmpty' : 'uploadFailed'); return false; }
  return true;
}

/** Clip text to MAX_TEXT_LENGTH, returning clipped flag. */
export function clampText(text: string): { text: string; clipped: boolean } {
  if (text.length <= MAX_TEXT_LENGTH) return { text, clipped: false };
  return { text: text.slice(0, MAX_TEXT_LENGTH), clipped: true };
}

/** Map a getUserMedia error to a localized toast. */
export function reportMicError(err: unknown) {
  const name = (err as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') { chatError('micDenied'); return; }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') { chatError('micUnavailable'); return; }
  if (name === 'NotReadableError' || name === 'AbortError') { chatError('micBusy'); return; }
  chatError('micUnavailable');
}
