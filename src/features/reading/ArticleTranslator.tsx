import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ArrowLeftRight,Languages, Loader2 } from '@/lib/icons';

interface ArticleTranslatorProps {
  identity?: string;
  originalHtml: string;
  originalTitle: string;
  onTranslationComplete: (translatedHtml: string, translatedTitle: string) => void;
  onReset: () => void;
}

export function ArticleTranslator({
  identity,
  originalHtml,
  originalTitle,
  onTranslationComplete,
  onReset,
}: ArticleTranslatorProps) {
  const [translating, setTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [result, setResult] = useState<{ status: 'success' | 'partial' | 'failure'; succeeded: number; failed: number } | null>(null);
  // Feed items have no reliable language metadata; let the reader correct the hint.
  const [sourceLang, setSourceLang] = useState(() => /[\u0600-\u06ff]/.test(originalHtml + originalTitle) ? 'ar' : 'en');
  const [targetLang, setTargetLang] = useState<'ar' | 'en' | 'de'>('en');

  /**
   * Generation guard: each translate run is bound to (a) a monotonically
   * increasing generation so a new click supersedes an old one, and
   * (b) the article identity via the `identity` prop so a late response
   * for the previous article never lands (R19). In-flight requests are
   * also aborted when the identity changes or the component unmounts.
   */
  const generationRef = useRef(0);
  const identityRef = useRef(identity);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (identityRef.current !== identity) {
      identityRef.current = identity;
      generationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setTranslating(false);
      setIsTranslated(false);
    }
  }, [identity]);
  useEffect(() => () => {
    generationRef.current += 1;
    abortRef.current?.abort();
  }, []);

  // Simple Free/Public Client-Side Translation fallback using public API (MyMemory or LibreTranslate)
  const translateText = async (text: string, from: string, to: string, signal: AbortSignal): Promise<string> => {
    if (!text.trim()) return '';
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`,
      { signal }
    );
    if (!response.ok) throw new Error('API response failed');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('responseStatus' in data) || Number(data.responseStatus) !== 200 || !('responseData' in data)) {
      throw new Error('Translation provider rejected request');
    }
    const payload = data.responseData;
    if (!payload || typeof payload !== 'object' || !('translatedText' in payload) || typeof payload.translatedText !== 'string' || !payload.translatedText.trim()) {
      throw new Error('Translation provider returned no text');
    }
    return payload.translatedText;
  };

  const handleTranslate = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    const isCurrent = () => generationRef.current === generation && !controller.signal.aborted;
    setTranslating(true);
    try {
      const fromLang = sourceLang;
      const toLang = targetLang;

      const doc = new DOMParser().parseFromString(originalHtml, 'text/html');
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let node = walker.nextNode();
      while (node) {
        if (node.textContent?.trim() && !node.parentElement?.closest('script, style, pre, code')) textNodes.push(node as Text);
        node = walker.nextNode();
      }
      let translatedTitle = originalTitle;
      const jobs = [
        { text: originalTitle, apply: (text: string) => { translatedTitle = text; } },
        ...textNodes.map(node => ({
          text: node.textContent || '', apply: (text: string) => { node.textContent = text; },
        })),
      ].filter(job => job.text.trim());
      let cursor = 0;
      let succeeded = 0;
      let failed = 0;
      const worker = async () => {
        while (isCurrent() && cursor < jobs.length) {
          const job = jobs[cursor++];
          try {
            const text = await translateText(job.text, fromLang, toLang, controller.signal);
            if (!isCurrent()) return;
            job.apply(text);
            succeeded += 1;
          } catch {
            if (!isCurrent()) return;
            failed += 1;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, worker));
      if (!isCurrent()) return;
      if (succeeded === 0) {
        setResult({ status: 'failure', succeeded, failed });
        toast.error('فشلت عملية الترجمة');
        return;
      }
      const status = failed > 0 ? 'partial' : 'success';
      setResult({ status, succeeded, failed });
      onTranslationComplete(doc.body.innerHTML, translatedTitle);
      setIsTranslated(true);
      if (status === 'partial') toast.warning('ترجمة جزئية؛ بقيت الأجزاء المتعذّرة بلغتها الأصلية');
      else toast.success('تمت الترجمة بنجاح');
      
    } catch (error) {
      console.error('Translation error:', error);
      if (isCurrent()) toast.error('فشلت عملية الترجمة');
    } finally {
      if (isCurrent()) setTranslating(false);
    }
  };

  const handleReset = () => {
    onReset();
    setIsTranslated(false);
    setResult(null);
  };

  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-card border border-border/50 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 text-mini font-semibold text-muted-foreground">
        <Languages className="h-4 w-4 text-primary" />
        <span>{'ترجمة المقال'}</span>
        {result?.status === 'partial' && <span role="status">{`ترجمة جزئية: ${result.succeeded} ناجح، ${result.failed} متعذّر`}</span>}
      </div>

      <div className="flex items-center gap-1.5">
        {!isTranslated ? (
          <>
            <select aria-label="لغة النص الأصلي" value={sourceLang} disabled={translating}
              onChange={e => setSourceLang(e.target.value)}
              className="text-mini h-8 rounded-xl border border-border/50 bg-background px-2">
              <option value="ar">العربية</option><option value="en">English</option><option value="de">Deutsch</option>
            </select>
            <select
              aria-label="لغة الترجمة"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as 'ar' | 'en' | 'de')}
              className="text-mini h-8 rounded-xl border border-border/50 bg-background px-2 text-foreground focus:outline-none"
              disabled={translating}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
            <button
              type="button"
              onClick={handleTranslate}
              disabled={translating}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-mini font-bold hover:opacity-90 active:scale-95 transition-motion inline-flex items-center gap-1.5"
            >
              {translating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{'جاري الترجمة...'}</span>
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-3 w-3" />
                  <span>{'ترجم'}</span>
                </>
              )}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/80 text-foreground text-mini font-bold active:scale-95 transition-motion"
          >
            {'عرض النص الأصلي'}
          </button>
        )}
      </div>
    </div>
  );
}
