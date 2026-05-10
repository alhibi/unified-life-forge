import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Date / time formatters
// ─────────────────────────────────────────────────────────────────────────────

/** Preview time shown in the conversation list (e.g. "Jetzt", "5 Min", "Mo", "15 Apr"). */
export function formatTime(dateStr: string, isAr: boolean): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return isAr ? 'الآن' : 'Jetzt';
  if (diffMins < 60) return isAr ? `${diffMins} د` : `${diffMins} Min`;
  if (diffHours < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return d.toLocaleDateString(isAr ? 'ar' : 'de', { weekday: 'short' });
  return d.toLocaleDateString(isAr ? 'ar' : 'de', { day: 'numeric', month: 'short' });
}

/** Time-only (HH:mm) shown inside bubbles. */
export function formatClockTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** "Today / Yesterday / 15 April" separator. */
export function formatDateSeparator(dateStr: string, isAr: boolean): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return isAr ? 'اليوم' : 'Heute';
  if (d.toDateString() === yesterday.toDateString()) return isAr ? 'أمس' : 'Gestern';
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString(isAr ? 'ar' : 'de', { weekday: 'long' });
  return d.toLocaleDateString(isAr ? 'ar' : 'de', { day: 'numeric', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

/** Format a recording / audio duration like "0:07". */
export function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Self-destruct chip: "30s", "5m", "1h", "1d". */
export function formatSelfDestructLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage URLs (Supabase signed URLs for chat-files bucket)
// ─────────────────────────────────────────────────────────────────────────────
export const getSignedFileUrl = async (fileUrl: string): Promise<string> => {
  if (!fileUrl) return '';

  if (fileUrl.startsWith('http')) {
    if (!fileUrl.includes('/chat-files/')) return fileUrl;
    const match = fileUrl.match(/chat-files\/(.+?)(?:\?|$)/);
    if (!match) return fileUrl;
    const path = decodeURIComponent(match[1]);
    const { data, error } = await supabase.storage.from('chat-files').createSignedUrl(path, 3600);
    return error ? fileUrl : data.signedUrl;
  }

  const { data, error } = await supabase.storage.from('chat-files').createSignedUrl(fileUrl, 3600);
  return error ? '' : data.signedUrl;
};

// ─────────────────────────────────────────────────────────────────────────────
// Message previews (used for conversation list, reply preview, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/** Human-friendly preview of a message (with emoji prefixes for media). */
export function getMessagePreview(msg: Pick<Message, 'content' | 'message_type' | 'deleted' | 'file_name'>, isAr: boolean): string {
  if (msg.deleted) return isAr ? '🚫 تم حذف الرسالة' : '🚫 Nachricht gelöscht';
  switch (msg.message_type) {
    case 'image': return '📷 ' + (isAr ? 'صورة' : 'Foto');
    case 'voice': return '🎤 ' + (isAr ? 'رسالة صوتية' : 'Sprachnachricht');
    case 'file':  return '📎 ' + (msg.file_name || (isAr ? 'ملف' : 'Datei'));
    default:      return msg.content || '';
  }
}

/** Shorter version used in reply-to previews inside bubbles. */
export function getReplyPreviewText(msg: Message | undefined, isAr: boolean): string {
  if (!msg) return isAr ? 'رسالة محذوفة' : 'Gelöschte Nachricht';
  if (msg.deleted) return isAr ? 'رسالة محذوفة' : 'Gelöschte Nachricht';
  if (msg.message_type === 'image') return '📷 ' + (isAr ? 'صورة' : 'Foto');
  if (msg.message_type === 'voice') return '🎤 ' + (isAr ? 'رسالة صوتية' : 'Sprachnachricht');
  if (msg.message_type === 'file')  return '📎 ' + (msg.file_name || '');
  return msg.content.length > 80 ? msg.content.slice(0, 80) + '…' : msg.content;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rich-text rendering. Supports WhatsApp/Telegram-style inline formatting:
//   *bold*  _italic_  ~strike~  `code`
// AND auto-linkifies URLs.
//
// The output is a flat React node tree - safe because we never use innerHTML.
// ─────────────────────────────────────────────────────────────────────────────

type Token =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'strike'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'link'; value: string; href: string };

// URL detection (http(s)://, www.). Tight enough to avoid false positives.
const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,;:!?"'])/gi;

// Inline markers: delimiter must have non-space boundaries, like WhatsApp.
// Order matters: code (backticks) first so * and _ inside code are preserved.
function tokenize(raw: string): Token[] {
  const out: Token[] = [];
  if (!raw) return out;

  // Split out code spans first
  let rest = raw;
  while (rest.length) {
    const codeMatch = rest.match(/`([^`\n]+?)`/);
    if (!codeMatch || codeMatch.index === undefined) {
      out.push(...tokenizeInline(rest));
      break;
    }
    if (codeMatch.index > 0) out.push(...tokenizeInline(rest.slice(0, codeMatch.index)));
    out.push({ kind: 'code', value: codeMatch[1] });
    rest = rest.slice(codeMatch.index + codeMatch[0].length);
  }
  return out;
}

function tokenizeInline(text: string): Token[] {
  const tokens: Token[] = [];
  // Linkify first – split by URL, then apply *_~ to non-link spans
  const linkParts = text.split(URL_REGEX);
  for (let i = 0; i < linkParts.length; i++) {
    const part = linkParts[i];
    if (!part) continue;
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      const href = part.startsWith('http') ? part : `https://${part}`;
      tokens.push({ kind: 'link', value: part, href });
    } else {
      tokens.push(...tokenizeStyles(part));
    }
    URL_REGEX.lastIndex = 0;
  }
  return tokens;
}

function tokenizeStyles(text: string): Token[] {
  // Apply *bold*, _italic_, ~strike~ in one pass (non-greedy, with \S boundaries)
  // We process left-to-right and recurse for correctness of nested styles.
  const tokens: Token[] = [];
  const patterns: Array<{ regex: RegExp; kind: Token['kind'] }> = [
    { regex: /\*(\S(?:[^*\n]*\S)?)\*/, kind: 'bold' },
    { regex: /_(\S(?:[^_\n]*\S)?)_/,   kind: 'italic' },
    { regex: /~(\S(?:[^~\n]*\S)?)~/,   kind: 'strike' },
  ];

  let best: { index: number; match: RegExpExecArray; kind: Token['kind'] } | null = null;
  for (const p of patterns) {
    const m = p.regex.exec(text);
    if (m && (best === null || m.index < best.index)) {
      best = { index: m.index, match: m, kind: p.kind };
    }
  }

  if (!best) {
    if (text) tokens.push({ kind: 'text', value: text });
    return tokens;
  }

  const { index, match, kind } = best;
  if (index > 0) tokens.push({ kind: 'text', value: text.slice(0, index) });
  // Recursively tokenize the inner content to allow nested styles (e.g. *_bold italic_*)
  const inner = match[1];
  const innerTokens = tokenizeStyles(inner);
  // If the inner is plain text only, use simple styled token
  if (innerTokens.length === 1 && innerTokens[0].kind === 'text') {
    tokens.push({ kind, value: innerTokens[0].value } as Token);
  } else {
    // Wrap each inner token with our style; for simplicity we merge by rendering
    // with outer style applied via a wrapper in renderRichText.
    tokens.push({ kind, value: inner } as Token);
  }
  const after = text.slice(index + match[0].length);
  tokens.push(...tokenizeStyles(after));
  return tokens;
}

/** Render parsed rich-text tokens as React nodes. */
export function renderRichText(raw: string): React.ReactNode[] {
  const tokens = tokenize(raw);
  return tokens.map((t, i) => {
    switch (t.kind) {
      case 'bold':   return React.createElement('strong', { key: i, className: 'font-semibold' }, t.value);
      case 'italic': return React.createElement('em',     { key: i, className: 'italic' }, t.value);
      case 'strike': return React.createElement('span',   { key: i, className: 'line-through opacity-70' }, t.value);
      case 'code':   return React.createElement('code',   { key: i, className: 'px-1 py-[1px] rounded-md bg-muted/40 font-mono text-[0.92em]' }, t.value);
      case 'link':   return React.createElement('a',      { key: i, href: t.href, target: '_blank', rel: 'noopener noreferrer', className: 'underline underline-offset-2 text-primary break-all', onClick: (e: React.MouseEvent) => e.stopPropagation() }, t.value);
      default:       return React.createElement(React.Fragment, { key: i }, t.value);
    }
  });
}

/** Strip formatting markers from content for copy-as-plain and the conversation preview. */
export function stripMarkers(text: string): string {
  return text
    .replace(/`([^`\n]+?)`/g, '$1')
    .replace(/\*(\S(?:[^*\n]*\S)?)\*/g, '$1')
    .replace(/_(\S(?:[^_\n]*\S)?)_/g, '$1')
    .replace(/~(\S(?:[^~\n]*\S)?)~/g, '$1');
}
