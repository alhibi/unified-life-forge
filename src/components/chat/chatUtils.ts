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
export function getMessagePreview(
  msg: Pick<Message, 'content' | 'message_type' | 'deleted' | 'file_name' | 'hidden_for'>,
  isAr: boolean,
  viewerUserId?: string,
): string {
  // A message hidden by the viewer (delete-for-me) becomes "[hidden]" in
  // their list preview; the sender still sees the original.
  if (viewerUserId && msg.hidden_for?.includes(viewerUserId)) {
    return isAr ? '🚫 رسالة مخفية' : '🚫 Versteckt';
  }
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

// Tokenize returns base Token[], but tokenizeStyles enriches styled tokens
// with a `children` field for nested style support — see RichToken below.


// URL detection (http(s)://, www.). Tight enough to avoid false positives.
// The regex is intentionally NOT module-level with `g` flag — sharing a
// stateful regex across renders caused `RegExp.lastIndex` to leak between
// calls and produce non-deterministic matches. Build a fresh one per call.
const URL_PATTERN = String.raw`(?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,;:!?"']`;
const buildUrlSplitRegex = () => new RegExp(`(${URL_PATTERN})`, 'gi');
const buildUrlTestRegex = () => new RegExp(`^${URL_PATTERN}$`, 'i');

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
  // Linkify first – split by URL, then apply *_~ to non-link spans.
  // Each call gets fresh regex instances so `lastIndex` can't leak.
  const splitRe = buildUrlSplitRegex();
  const testRe = buildUrlTestRegex();
  const linkParts = text.split(splitRe);
  for (let i = 0; i < linkParts.length; i++) {
    const part = linkParts[i];
    if (!part) continue;
    if (testRe.test(part)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      tokens.push({ kind: 'link', value: part, href });
    } else {
      tokens.push(...tokenizeStyles(part));
    }
  }
  return tokens;
}

// Styled token may hold either a plain string OR a nested token tree so that
// patterns like `*hello _world_*` render as bold-then-bold-italic correctly
// instead of leaking the inner markers as literal text.
type StyledToken = Extract<Token, { kind: 'bold' | 'italic' | 'strike' }>;
export type RichToken = Token | (StyledToken & { children: RichToken[] });

function tokenizeStyles(text: string): RichToken[] {
  const tokens: RichToken[] = [];
  const patterns: Array<{ regex: RegExp; kind: 'bold' | 'italic' | 'strike' }> = [
    { regex: /\*(\S(?:[^*\n]*\S)?)\*/, kind: 'bold' },
    { regex: /_(\S(?:[^_\n]*\S)?)_/,   kind: 'italic' },
    { regex: /~(\S(?:[^~\n]*\S)?)~/,   kind: 'strike' },
  ];

  let best: { index: number; match: RegExpExecArray; kind: 'bold' | 'italic' | 'strike' } | null = null;
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
  const inner = match[1];
  const innerTokens = tokenizeStyles(inner);
  tokens.push({ kind, value: inner, children: innerTokens });
  const after = text.slice(index + match[0].length);
  tokens.push(...tokenizeStyles(after));
  return tokens;
}

function renderToken(t: RichToken, key: number | string): React.ReactNode {
  switch (t.kind) {
    case 'bold': {
      const children = 'children' in t ? t.children.map((c, i) => renderToken(c, i)) : t.value;
      return React.createElement('strong', { key, className: 'font-semibold' }, children);
    }
    case 'italic': {
      const children = 'children' in t ? t.children.map((c, i) => renderToken(c, i)) : t.value;
      return React.createElement('em', { key, className: 'italic' }, children);
    }
    case 'strike': {
      const children = 'children' in t ? t.children.map((c, i) => renderToken(c, i)) : t.value;
      return React.createElement('span', { key, className: 'line-through opacity-70' }, children);
    }
    case 'code':
      return React.createElement('code', { key, className: 'px-1 py-[1px] rounded-md bg-muted/40 font-mono text-[0.92em]' }, t.value);
    case 'link':
      return React.createElement('a', { key, href: t.href, target: '_blank', rel: 'noopener noreferrer', className: 'underline underline-offset-2 text-primary break-all', onClick: (e: React.MouseEvent) => e.stopPropagation() }, t.value);
    default:
      return React.createElement(React.Fragment, { key }, t.value);
  }
}

/** Render parsed rich-text tokens as React nodes. */
function renderRichTextUncached(raw: string): React.ReactNode[] {
  const tokens = tokenize(raw) as RichToken[];
  return tokens.map((t, i) => renderToken(t, i));
}

// LRU-ish memoization. The previous implementation re-tokenized + re-rendered
// every message body on every re-render of the messages list (200 messages
// * keystroke = 200 tokenizations). Cap at 500 entries — chat windows rarely
// hold more than a few hundred unique strings simultaneously, and React
// nodes themselves are tiny stable references.
const RICH_TEXT_CACHE_MAX = 500;
const richTextCache = new Map<string, React.ReactNode[]>();

export function renderRichText(raw: string): React.ReactNode[] {
  if (!raw) return [];
  const cached = richTextCache.get(raw);
  if (cached) return cached;
  const rendered = renderRichTextUncached(raw);
  // Map preserves insertion order; oldest entries are first. Drop a
  // handful at a time so we don't churn on every miss past the limit.
  if (richTextCache.size >= RICH_TEXT_CACHE_MAX) {
    let i = 0;
    for (const k of richTextCache.keys()) {
      richTextCache.delete(k);
      if (++i > 32) break;
    }
  }
  richTextCache.set(raw, rendered);
  return rendered;
}

/** Strip formatting markers from content for copy-as-plain and the conversation preview. */
export function stripMarkers(text: string): string {
  return text
    .replace(/`([^`\n]+?)`/g, '$1')
    .replace(/\*(\S(?:[^*\n]*\S)?)\*/g, '$1')
    .replace(/_(\S(?:[^_\n]*\S)?)_/g, '$1')
    .replace(/~(\S(?:[^~\n]*\S)?)~/g, '$1');
}

/**
 * Render a string with `query` substring highlighted. Markers (*, _, ~, `)
 * are stripped before matching so a user search for "hello" still highlights
 * "hello" inside "*hello*". This is intentionally simpler than
 * renderRichText so it can stack on top of search results without
 * recomputing token nesting.
 */
export function renderHighlighted(raw: string, query: string): React.ReactNode {
  if (!query) return raw;
  const plain = stripMarkers(raw);
  const haystack = plain.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle || !haystack.includes(needle)) return raw;
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < plain.length) {
    const idx = haystack.indexOf(needle, i);
    if (idx < 0) {
      out.push(plain.slice(i));
      break;
    }
    if (idx > i) out.push(plain.slice(i, idx));
    out.push(
      React.createElement(
        'mark',
        { key: `m-${key++}`, className: 'bg-primary/25 text-primary-foreground rounded-[3px] px-[1px]' },
        plain.slice(idx, idx + needle.length),
      ),
    );
    i = idx + needle.length;
  }
  return out;
}
