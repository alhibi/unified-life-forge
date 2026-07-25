// ─────────────────────────────────────────────────────────────────────────────
// Typed error classes for the chat module.
//
// Why typed errors instead of plain Error:
//
//   • UI code can render a tailored toast per error code without parsing
//     message strings (which are localized).
//   • Retries are safer: we know exactly which failures are transient
//     (NetworkError, RateLimited) and which aren't (Forbidden, NotFound).
//   • Logging / Sentry integrations can group by code instead of by
//     message text that varies between locales.
// ─────────────────────────────────────────────────────────────────────────────

export type ChatErrorCode =
  | 'NETWORK'
  | 'NOT_CONFIGURED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_INPUT'
  | 'STORAGE_QUOTA'
  | 'UNKNOWN';

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  readonly retriable: boolean;
  readonly cause: unknown;
  constructor(code: ChatErrorCode, message: string, opts?: { retriable?: boolean; cause?: unknown }) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.retriable = opts?.retriable ?? (code === 'NETWORK' || code === 'RATE_LIMITED');
    this.cause = opts?.cause;
  }
}

/** Wrap an unknown thrown value into a ChatError with a best-guess code. */
export function toChatError(err: unknown, fallback: ChatErrorCode = 'UNKNOWN'): ChatError {
  if (err instanceof ChatError) return err;
  const e = err as { message?: string; code?: string; status?: number; name?: string } | null;
  const msg = e?.message ?? '';
  const code = e?.code ?? '';
  const status = typeof e?.status === 'number' ? e.status : 0;

  if (msg === 'supabase_not_configured' || code === 'supabase_not_configured') {
    return new ChatError('NOT_CONFIGURED', 'Supabase is not configured', { retriable: false, cause: err });
  }
  if (
    e?.name === 'TypeError' ||
    /network|fetch|offline|failed to fetch|aborted/i.test(msg)
  ) {
    return new ChatError('NETWORK', msg || 'Network error', { retriable: true, cause: err });
  }
  if (status === 401 || /jwt|invalid_token|invalid jwt/i.test(msg)) {
    return new ChatError('UNAUTHENTICATED', msg || 'Not signed in', { retriable: false, cause: err });
  }
  if (status === 403 || /denied|permission|policy/i.test(msg)) {
    return new ChatError('FORBIDDEN', msg || 'Forbidden', { retriable: false, cause: err });
  }
  if (status === 404 || /not found/i.test(msg)) {
    return new ChatError('NOT_FOUND', msg || 'Not found', { retriable: false, cause: err });
  }
  if (code === '23505' || /duplicate|conflict/i.test(msg)) {
    return new ChatError('CONFLICT', msg || 'Duplicate', { retriable: false, cause: err });
  }
  if (status === 429 || /rate limit/i.test(msg)) {
    return new ChatError('RATE_LIMITED', msg || 'Rate limited', { retriable: true, cause: err });
  }
  if (status === 413 || /too large|payload|413/i.test(msg)) {
    return new ChatError('PAYLOAD_TOO_LARGE', msg || 'Payload too large', { retriable: false, cause: err });
  }
  if (/quota|exceeded|usage limit/i.test(msg)) {
    return new ChatError('STORAGE_QUOTA', msg || 'Storage quota exceeded', { retriable: false, cause: err });
  }
  if (/invalid|required|must|too long|too short/i.test(msg)) {
    return new ChatError('INVALID_INPUT', msg || 'Invalid input', { retriable: false, cause: err });
  }
  return new ChatError(fallback, msg || 'Unknown error', { cause: err });
}

/** Bilingual surface message for a ChatError. */
export function describeChatError(e: ChatError): string {
  switch (e.code) {
    case 'NETWORK':           return 'لا يوجد اتصال — حاول مرة أخرى';
    case 'NOT_CONFIGURED':    return 'الخدمة غير مهيّأة';
    case 'UNAUTHENTICATED':   return 'يلزم تسجيل الدخول';
    case 'FORBIDDEN':         return 'لا تملك الصلاحية';
    case 'NOT_FOUND':         return 'لم يتم العثور';
    case 'CONFLICT':          return 'حدث تعارض';
    case 'RATE_LIMITED':      return 'محاولات كثيرة، انتظر قليلاً';
    case 'PAYLOAD_TOO_LARGE': return 'الحجم كبير جداً';
    case 'INVALID_INPUT':     return 'إدخال غير صالح';
    case 'STORAGE_QUOTA':     return 'تم استنفاذ مساحة التخزين';
    default:                  return 'حدث خطأ';
  }
}
