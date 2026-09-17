import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { FeedItem, ReaderPrefs } from './types';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), info: vi.fn(), success: vi.fn(), error: vi.fn(), callback: null as null | ((payload: { new: Record<string, string> }) => void) }));
vi.mock('@/integrations/supabase/client', () => ({ isSupabaseConfigured: false, supabase: {
  functions: { invoke: mocks.invoke }, auth: { onAuthStateChange: vi.fn(), getUser: async () => ({ data: { user: { id: 'user' } } }) },
  from: () => { const q = { select: () => q, eq: () => q, order: () => q, limit: () => q, then: (resolve: (value: {data: never[]}) => void) => resolve({ data: [] }) }; return q; },
  channel: () => { const q = { on: (_a: string, _b: unknown, cb: NonNullable<typeof mocks.callback>) => { mocks.callback = cb; return q; }, subscribe: () => q }; return q; }, removeChannel: vi.fn(),
} }));
vi.mock('@/lib/icons', () => Object.fromEntries('Bookmark BookmarkCheck ChevronLeft Clock Copy ExternalLink FileText Loader2 Share2 ChevronRight Pause Play RotateCcw Volume2 ArrowLeftRight Languages Clipboard History Trash2 Type X Bell BellOff BellRing ChevronDown LogIn Moon Pencil Plus'.split(' ').map(k => [k, () => null])));
vi.mock('sonner', () => ({ toast: { info: mocks.info, success: mocks.success, error: mocks.error, warning: mocks.info } }));
vi.mock('./ReaderPrefsPopover', () => ({ ReaderPrefsPopover: () => null }));
import { ArticleReader } from './ArticleReader';
import { ArticleSpeechPlayer } from './ArticleSpeechPlayer';
import { ArticleTranslator } from './ArticleTranslator';
import { KeywordAlertsView } from './KeywordAlertsView';
import { ReaderView } from './ReaderView';
import { storeNotificationPrefs } from './storage';

const prefs: ReaderPrefs = { fontSize: 'md', lineHeight: 'normal', theme: 'system', fontFamily: 'sans', ttsSpeed: 1, translationLang: 'en' };
const item = (id: string, body = ''): FeedItem => ({ link: `https://example.com/${id}`, title: id, description: 'Short summary', pubDate: '', image: null, source: 'source', fullContent: body });
const reader = (article: FeedItem, upgrade?: (link: string) => Promise<{ fullContent: string; image: null }>) => <ArticleReader article={article} isBookmarked={false} prefs={prefs} language="ar" onBack={() => {}} onToggleBookmark={() => {}} onChangePrefs={() => {}} onUpgradeContent={upgrade} />;
const response = (text = 'TRANSLATED') => ({ ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: text } }) });
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); mocks.invoke.mockReset(); vi.stubGlobal('fetch', vi.fn(async () => response())); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('R23 reports total failure without publishing the original as a translation', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline mock'); }));
  const complete = vi.fn();
  render(<ArticleTranslator originalHtml="<p>Original text</p>" originalTitle="Title" onTranslationComplete={complete} onReset={() => {}} />);
  fireEvent.click(screen.getByText('ترجم'));
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(complete).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByText('ترجم')).toBeTruthy();
});

it('R23 bounds requests and labels partial results while retaining failed text', async () => {
  const releases: Array<() => void> = [];
  let active = 0;
  let maximum = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    active += 1; maximum = Math.max(maximum, active);
    await new Promise<void>(resolve => releases.push(resolve));
    active -= 1;
    if (new URL(input).searchParams.get('q') === 'Failed paragraph') throw new Error('failed item');
    return response('Translated segment');
  }));
  const complete = vi.fn();
  render(<ArticleTranslator originalHtml={'<p>Failed paragraph</p>' + '<p>Good paragraph</p>'.repeat(8)} originalTitle="Title" onTranslationComplete={complete} onReset={() => {}} />);
  fireEvent.click(screen.getByText('ترجم'));
  for (let i = 0; i < 12; i += 1) {
    await act(async () => { releases.splice(0).forEach(resolve => resolve()); });
  }
  expect(maximum).toBeLessThanOrEqual(3);
  expect(complete).toHaveBeenCalled();
  expect(complete.mock.calls[0][0]).toContain('Failed paragraph');
  expect(complete.mock.calls[0][0]).toContain('Translated segment');
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toMatch(/جزئية/);
});

it('R23 translates bare text using the selected source language, not UI Arabic', async () => {
  const complete = vi.fn();
  render(<ArticleTranslator originalHtml="Das ist ein Artikel" originalTitle="Titel" onTranslationComplete={complete} onReset={() => {}} />);
  fireEvent.change(screen.getByLabelText('لغة النص الأصلي'), { target: { value: 'de' } });
  fireEvent.click(screen.getByText('ترجم'));
  await waitFor(() => expect(complete).toHaveBeenCalled());
  const urls = vi.mocked(fetch).mock.calls.map(c => new URL(String(c[0])));
  expect(urls.some(url => url.searchParams.get('q') === 'Das ist ein Artikel')).toBe(true);
  expect(urls.every(url => url.searchParams.get('langpair') === 'de|en')).toBe(true);
});

it('R23 treats provider quota/error payloads as failures even with HTTP 200', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ responseStatus: 429, responseData: { translatedText: 'QUOTA EXCEEDED' } }) })));
  const complete = vi.fn();
  render(<ArticleTranslator originalHtml="<p>Original</p>" originalTitle="Title" onTranslationComplete={complete} onReset={() => {}} />);
  fireEvent.click(screen.getByText('ترجم'));
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(complete).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
});

it('R20 keeps the UI-visible player when synthesis is unavailable', () => {
  const view = render(<ArticleSpeechPlayer textToSpeak="Article A" language="ar" ttsSpeed={1} onTtsSpeedChange={() => {}} />);
  expect(screen.getByText('الاستماع للمقال')).toBeTruthy();
  expect(screen.getByTitle('تشغيل')).toBeTruthy();
  view.unmount();
});
it('R21 uses digest selected after subscription even for queued inserts', async () => {
  const notifications: unknown[][] = [];
  vi.stubGlobal('Notification', class { static permission = 'granted'; constructor(...args: unknown[]) { notifications.push(args); } });
  storeNotificationPrefs({ enabled: true, quietStart: '', quietEnd: '', frequency: 'instant', mutedUntil: null, sound: false });
  render(<KeywordAlertsView language="ar" enabledFeeds={[]} onBack={() => {}} onOpenLink={() => {}} />);
  fireEvent.click(await screen.findByText('الإشعارات مفعّلة'));
  vi.useFakeTimers();
  act(() => { mocks.callback?.({ new: { id: 'hit', article_title: 'New hit', article_link: 'https://example.com/a', matched_at: new Date().toISOString() } }); });
  fireEvent.click(screen.getByText('موجز'));
  act(() => vi.advanceTimersByTime(2001));
  expect(notifications).toHaveLength(0);
  expect(mocks.info).not.toHaveBeenCalled();
});

it('R22 keeps last-good article and reports failed re-extraction', async () => {
  mocks.invoke.mockResolvedValueOnce({ data: { url: 'https://example.com/a', title: 'Loaded A', html: '<p>Body A</p>', image: null }, error: null });
  render(<ReaderView initialUrl="https://example.com/a" language="ar" prefs={prefs} onChangePrefs={() => {}} onBack={() => {}} isBookmarked={false} />);
  await screen.findByText('Loaded A');
  await waitFor(() => expect((screen.getByPlaceholderText('https://...') as HTMLInputElement).disabled).toBe(false));
  mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('REEXTRACT FAILED') });
  fireEvent.click(screen.getByText('اقرأ'));
  await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(2));
  expect(screen.getByText('Body A')).toBeTruthy();
  expect(await screen.findByText(/REEXTRACT FAILED/)).toBeTruthy();
});

it('R20 cancels speech and clears playing state on article switch', () => {
  const synth = { getVoices: () => [], cancel: vi.fn(), speak: vi.fn(), pause: vi.fn(), resume: vi.fn(), onvoiceschanged: null };
  vi.stubGlobal('speechSynthesis', synth); vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(t: string) { this.text = t; } });
  const view = render(<ArticleSpeechPlayer textToSpeak="Article A" language="ar" ttsSpeed={1} onTtsSpeedChange={() => {}} />);
  fireEvent.click(screen.getByTitle('تشغيل'));
  expect(synth.speak.mock.calls[0][0].text).toBe('Article A');
  view.rerender(<ArticleSpeechPlayer textToSpeak="Article B" language="ar" ttsSpeed={1} onTtsSpeedChange={() => {}} />);
  expect(synth.cancel).toHaveBeenCalled();
  expect(screen.queryByTitle('إيقاف مؤقت')).toBeNull();
  expect(screen.getByTitle('تشغيل')).toBeTruthy();
});
it('R19 aborts translation on navigation and ignores late results', async () => {
  let release = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  vi.stubGlobal('fetch', vi.fn(async () => { await pending; return response('OLD TRANSLATION'); }));
  const view = render(reader(item('A', '<p>Old body</p>')));
  fireEvent.click(screen.getByText('ترجم'));
  const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
  view.rerender(reader(item('B', '<p>New body</p>')));
  await act(async () => release());
  expect(screen.getByText('New body')).toBeTruthy();
  expect(screen.queryByText('OLD TRANSLATION')).toBeNull();
  expect(signal?.aborted).toBe(true);
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByText('ترجم')).toBeTruthy();
});

it('R18 translates the upgraded canonical body and restores it', async () => {
  const full = '<p>' + 'FULL ARTICLE '.repeat(60) + '</p>';
  render(reader(item('A'), vi.fn(async () => ({ fullContent: full, image: null }))));
  await screen.findByText(/FULL ARTICLE/);
  fireEvent.click(screen.getByText('ترجم'));
  await waitFor(() => expect(mocks.success).toHaveBeenCalled());
  const urls = vi.mocked(fetch).mock.calls.map(c => decodeURIComponent(String(c[0])));
  expect(urls.some(u => u.includes('FULL ARTICLE'))).toBe(true);
  fireEvent.click(screen.getByText('عرض النص الأصلي'));
  expect(screen.getByText(/FULL ARTICLE/)).toBeTruthy();
});
