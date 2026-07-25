import React, { useMemo, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { BookOpen, Check, Clipboard, Quote, Search, Sparkles } from '@/lib/icons';

import type { ArchiveDocument } from '../types';

interface ArchiveCompanionProps {
  document: ArchiveDocument;
}

export default function ArchiveCompanion({ document }: ArchiveCompanionProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'qa'>('summary');
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  // Q&A search query and results
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ sentence: string; sectionTitle: string }[]>(
    [],
  );

  // Split document into lines & extract high quality quotes/definitions
  const extractedInsights = useMemo(() => {
    const list: { id: string; text: string; category: string }[] = [];
    const lines = document.content.split('\n');

    let currentCategory = 'مفاهيم';
    lines.forEach((line, idx) => {
      const clean = line.trim();
      if (clean.startsWith('##')) {
        currentCategory = clean.replace(/^#+\s*/, '');
      } else if (
        clean.length > 30 &&
        clean.length < 160 &&
        !clean.startsWith('#') &&
        !clean.startsWith('-')
      ) {
        // Find sentences with definitions or powerful insights
        if (
          clean.includes('هو') ||
          clean.includes('هي') ||
          clean.includes('يعتبر') ||
          clean.includes('تعتبر') ||
          clean.includes('فلسفة') ||
          clean.includes('العمق')
        ) {
          list.push({
            id: `insight-${idx}`,
            text: clean,
            category: currentCategory,
          });
        }
      }
    });

    return list.slice(0, 10);
  }, [document.content]);

  // Handle local searching of document text
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const sentences: { sentence: string; sectionTitle: string }[] = [];
    const lines = document.content.split('\n');
    let currentSec = 'المقدمة المعرفية';

    lines.forEach((line) => {
      const clean = line.trim();
      if (clean.startsWith('##')) {
        currentSec = clean.replace(/^#+\s*/, '');
      } else if (clean.length > 10) {
        // Split paragraph by Arabic punctuation
        const parts = clean.split(/[.،؛؟!]/);
        parts.forEach((part) => {
          const trimmed = part.trim();
          if (trimmed.toLowerCase().includes(q.toLowerCase()) && trimmed.length > 15) {
            sentences.push({
              sentence: trimmed,
              sectionTitle: currentSec,
            });
          }
        });
      }
    });

    setSearchResults(sentences.slice(0, 6));
  };

  const handleCopyQuote = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuoteId(id);
    setTimeout(() => setCopiedQuoteId(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Companion Tabs Segmented Control */}
      <div className="flex rounded-xl bg-muted/60 p-1">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'summary' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}
        >
          ملخص وتوجيه
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'insights' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}
        >
          شواهد ومقتبسات
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'qa' ? 'bg-background shadow text-primary' : 'text-muted-foreground'}`}
        >
          سؤال وبحث دلالي
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'qa' && (
        <div className="space-y-3">
          <AppCard compact className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="اطرح سؤالاً أو اكتب كلمة للبحث الفوري دلالياً…"
              className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground/60"
            />
          </AppCard>

          {searchQuery ? (
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                نتائج مطابقة من سياق المونوغراف
              </h5>
              {searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  لا توجد جمل مطابقة للبحث داخل هذا الأرشيف. حاول استخدام كلمات أعمّ.
                </p>
              ) : (
                searchResults.map((res, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-primary/[0.01] border border-primary/10"
                  >
                    <span className="text-[10px] font-bold text-primary block mb-1">
                      الموضع: {res.sectionTitle}
                    </span>
                    <p className="text-[12px] text-foreground leading-relaxed">
                      ... {res.sentence} ...
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                اكتب سؤالاً مثل "مفهوم" أو "نشأة" ليستخرج المحرك الذكي الفقرات المعنية مباشرة من
                الأطروحة المعرفية.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="space-y-3">
          <AppCard compact className="border-primary/20 bg-primary/[0.01] p-4">
            <div className="flex items-center gap-1.5 mb-1.5 text-primary">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                توجيه الأطروحة الكلية
              </span>
            </div>
            <p className="text-[13px] text-foreground leading-relaxed">
              هذا المونوغراف يتناول أطروحة مركزية غنية حول موضوع:{' '}
              <strong className="text-primary">« {document.title} »</strong>. ينصح بالتركيز على
              التقاطعات الدلالية والروابط التفصيلية المتعددة التي يبنيها المحرك الهرمي.
            </p>
          </AppCard>

          <div className="space-y-2">
            <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              المحاور والهيكل المعرفي
            </h5>
            <div className="space-y-2">
              {document.outline.sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className="flex gap-3 items-start p-3 rounded-xl bg-muted/20 border border-border/10"
                >
                  <span className="w-5 h-5 rounded-lg bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h6 className="text-[13px] font-bold text-foreground">{sec.title}</h6>
                    {sec.dimension && (
                      <span className="text-[10px] font-semibold text-primary block mt-0.5">
                        البعد: {sec.dimension}
                      </span>
                    )}
                    <ul className="mt-1.5 space-y-1">
                      {sec.subsections.map((sub) => (
                        <li
                          key={sub.id}
                          className="text-[11px] text-muted-foreground flex items-start gap-1"
                        >
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                          <span>{sub.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-3">
          <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
            مستخلصات وبراهين معرفية تلقائية
          </h5>
          {extractedInsights.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6">
              لم نستخلص شواهد لغوية كافية من النص الحالي.
            </div>
          ) : (
            <div className="space-y-2.5">
              {extractedInsights.map((ins) => (
                <AppCard key={ins.id} compact className="p-3 bg-muted/20 relative group">
                  <div className="flex items-center gap-1.5 mb-1.5 text-primary/70">
                    <Quote className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold truncate">القسم: {ins.category}</span>
                  </div>
                  <p className="text-[12px] text-foreground leading-relaxed pr-2 italic">
                    « {ins.text} »
                  </p>
                  <button
                    onClick={() => handleCopyQuote(ins.id, ins.text)}
                    className="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg bg-background/80 flex items-center justify-center border border-border/20 active:scale-95 opacity-0 group-hover:opacity-100 transition-all"
                    title="نسخ الشاهد"
                  >
                    {copiedQuoteId === ins.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Clipboard className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </AppCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
