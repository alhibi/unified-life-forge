import React, { useState } from 'react';
import { toast } from 'sonner';

import { ArrowLeftRight,Languages, Loader2 } from '@/lib/icons';

interface ArticleTranslatorProps {
  originalHtml: string;
  originalTitle: string;
  onTranslationComplete: (translatedHtml: string, translatedTitle: string) => void;
  onReset: () => void;
}

export function ArticleTranslator({
  originalHtml,
  originalTitle,
  onTranslationComplete,
  onReset,
}: ArticleTranslatorProps) {
  const [translating, setTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [targetLang, setTargetLang] = useState<'ar' | 'en' | 'de'>('en');

  // Simple Free/Public Client-Side Translation fallback using public API (MyMemory or LibreTranslate)
  const translateText = async (text: string, from: string, to: string): Promise<string> => {
    if (!text.trim()) return '';
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
      );
      if (!response.ok) throw new Error('API response failed');
      const data = await response.json();
      return data.responseData?.translatedText || text;
    } catch (e) {
      console.warn('Translation item failed, using original', e);
      return text;
    }
  };

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      const fromLang = 'ar'; // Simple heuristic
      const toLang = targetLang;

      // Translate Title
      const translatedTitle = await translateText(originalTitle, fromLang, toLang);

      // We need to translate HTML body paragraph by paragraph to preserve HTML structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(originalHtml, 'text/html');

      // Grab all text blocks (paragraphs, headers, list items, blockquotes)
      const textNodes = doc.querySelectorAll('p, h1, h2, h3, li, blockquote');

      const promises = Array.from(textNodes).map(async (node) => {
        const text = node.textContent || '';
        if (text.trim().length > 1) {
          const translated = await translateText(text, fromLang, toLang);
          node.textContent = translated;
        }
      });

      await Promise.all(promises);
      const translatedHtml = doc.body.innerHTML;

      onTranslationComplete(translatedHtml, translatedTitle);
      setIsTranslated(true);
      toast.success('تمت الترجمة بنجاح');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('فشلت عملية الترجمة');
    } finally {
      setTranslating(false);
    }
  };

  const handleReset = () => {
    onReset();
    setIsTranslated(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-card border border-border/50 rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 text-mini font-semibold text-muted-foreground">
        <Languages className="h-4 w-4 text-primary" />
        <span>{'ترجمة المقال'}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {!isTranslated ? (
          <>
            <select
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
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-mini font-bold hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-1.5"
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
            className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent/80 text-foreground text-mini font-bold active:scale-95 transition-all"
          >
            {'عرض النص الأصلي'}
          </button>
        )}
      </div>
    </div>
  );
}
