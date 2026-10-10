import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { toast } from 'sonner';

import PageHeader from '@/components/PageHeader';
import { AppCard, AppList, AppRow, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  SignatureAnnouncement,
  SignatureBloom,
  useSignatureMoment,
} from '@/components/ui/signature-moment';
import { StateView } from '@/components/ui/state-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Hash,
  History,
  Layers,
  Search,
  Sparkles,
} from '@/lib/icons';
import { MOTION } from '@/lib/motion';

import { MetreScansionVisualizer } from '../components/bayan/MetreScansionVisualizer';
import { SyntaxTreeVisualizer } from '../components/bayan/SyntaxTreeVisualizer';
import { useBayanStore } from '../stores/bayanStore';

type BayanTab = 'syntax' | 'morphology' | 'rhetoric' | 'prosody';

/**
 * لوحة البيان — تحليل عروضي/صرفي/بلاغي.
 *
 * النظام الموحّد: ترويسة <PageHeader variant="display"> بدل البانر
 * المخصص (والهالة الضبابية blur-3xl أُزيلت)، وكل اللوحات <AppCard>،
 * والسجل <AppList>/<AppRow>، وتبويبات التحليل <Tabs>، وحالة الانتظار
 * <StateView>. أصناف "live" كانت غير معرّفة في الـ CSS إطلاقاً
 * (لا تولّد أي قاعدة) فصُحّحت إلى primary.
 */
export default function BayanDashboard() {
  const [inputText, setInputText] = useState('');
  const {
    analyzeText,
    loading,
    activeAnalysis,
    history,
    bookmarkedAnalyses,
    bookmarkAnalysis,
    removeBookmark,
    setActiveAnalysis,
  } = useBayanStore();

  const [activeTab, setActiveTab] = useState<BayanTab>('syntax');

  /**
   * A finished analysis is the app's second signature moment: the user waited
   * for it, and it is the payoff of the whole screen. Nothing else in Diwan
   * gets a flourish.
   */
  const revealed = useSignatureMoment({
    kind: 'reveal',
    announce: 'اكتمل التحليل — النتيجة جاهزة',
  });

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      toast.error('يرجى إدخال نص أولاً للبدء بالتحليل اللغوي');
      return;
    }
    const res = await analyzeText(inputText);
    if (res) {
      revealed.fire();
      toast.success('اكتمل التحليل البلاغي والإعرابي بنجاح!');
      if (res.prosody) {
        setActiveTab('prosody');
      } else {
        setActiveTab('syntax');
      }
    }
  };

  const isBookmarked = activeAnalysis ? !!bookmarkedAnalyses[activeAnalysis.id] : false;

  const handleToggleBookmark = () => {
    if (!activeAnalysis) return;
    if (isBookmarked) {
      removeBookmark(activeAnalysis.id);
      toast.info('تم إزالة التحليل من المحفوظات');
    } else {
      const defaultTitle = activeAnalysis.inputText.slice(0, 30) + '...';
      bookmarkAnalysis(activeAnalysis.id, defaultTitle);
      toast.success('تم حفظ التحليل في المرجعية');
    }
  };

  const loadPastAnalysis = (past: (typeof history)[number]) => {
    setActiveAnalysis(past);
    setInputText(past.inputText);
    if (past.prosody) {
      setActiveTab('prosody');
    } else {
      setActiveTab('syntax');
    }
  };

  return (
    <PageShell centered={false} flush>
      <PageHeader
        variant="display"
        eyebrow="محرك العلوم العميقة"
        title="البيَانُ — التَّحْلِيلُ اللُّغَوِيُّ العَمِيقُ"
        subtitle="إعراب فوري، ميزان صرفي، فحص عروضي كامل، وكشف الجمال البلاغي"
        backFallback="/diwan"
        right={
          activeAnalysis ? (
            <Button variant="secondary" size="sm" onClick={handleToggleBookmark}>
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="h-4 w-4 text-primary" aria-hidden />
                  <span>محفوظ</span>
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" aria-hidden />
                  <span>حفظ التحليل</span>
                </>
              )}
            </Button>
          ) : undefined
        }
      />

      {/* Core Layout Grid */}
      <div className="mx-auto mt-6 grid w-full max-w-6xl grid-cols-1 gap-6 px-4 lg:grid-cols-12">
        {/* Left panel / Input Form */}
        <div className="space-y-6 lg:col-span-4">
          <AppCard>
            <h2 className="mb-4 flex items-center gap-2 border-b border-border/50 pb-3 text-meta font-bold">
              <Search className="h-4 w-4 text-primary" aria-hidden />
              <span>التحليل الفوري الفائق</span>
            </h2>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label
                  htmlFor="bayan-text-input"
                  className="mb-2 block text-mini text-muted-foreground"
                >
                  أدخل بيتاً شعرياً أو جملة عربية فصحى:
                </label>
                <Textarea
                  id="bayan-text-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={4}
                  placeholder="مثال: قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ ... بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ"
                  className="font-amiri leading-relaxed"
                />
              </div>

              <span className="relative block">
                <SignatureBloom active={revealed.active} className="rounded-lg" />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                      aria-hidden
                    />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden />
                  )}
                  <span>ابدأ التحليل اللغوي</span>
                </Button>
              </span>
              <SignatureAnnouncement text={revealed.announcement} />
            </form>
          </AppCard>

          {/* Analysis History */}
          {history.length > 0 && (
            <AppCard>
              <h3 className="mb-3 flex items-center gap-2 border-b border-border/50 pb-3 text-mini font-mono font-bold uppercase tracking-wider text-muted-foreground">
                <History className="h-4 w-4 text-primary" aria-hidden />
                <span>السجل الفوري الفني</span>
              </h3>
              <div className="max-h-[250px] overflow-y-auto">
                <AppList>
                  {history.map((past) => (
                    <AppRow
                      key={past.id}
                      onClick={() => loadPastAnalysis(past)}
                      className={
                        activeAnalysis?.id === past.id ? 'bg-interactive-selected' : undefined
                      }
                      title={<span className="font-amiri">{past.inputText}</span>}
                      value={
                        <span className="font-mono">
                          {new Date(past.analyzedAt).toLocaleTimeString('ar-EG')}
                        </span>
                      }
                    />
                  ))}
                </AppList>
              </div>
            </AppCard>
          )}
        </div>

        {/* Right panel / Output Details */}
        <div className="space-y-6 lg:col-span-8">
          {!activeAnalysis ? (
            <StateView
              kind="empty"
              title="في انتظار إدخال البيانات"
              body="أدخل جملة أو بيتاً فصيحاً لنقوم بتشريحها إعرابياً وبلاغياً وصرفياً بدقة فائقة."
            />
          ) : (
            /* The result *arrives* — so it uses the SETTLE curve: a 6px rise
               and a fade, transform+opacity only, keyed on the analysis id so
               each new result lands rather than swapping in place. */
            <motion.div
              key={activeAnalysis.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={MOTION.settle}
            >
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BayanTab)}>
                {/* Visual Tab Selectors */}
                <TabsList className="scrollbar-none overflow-x-auto">
                  {activeAnalysis.prosody && (
                    <TabsTrigger value="prosody">
                      <span className="flex items-center gap-1.5">
                        <Hash className="h-4 w-4" aria-hidden />
                        <span>البحور والعروض</span>
                      </span>
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="syntax">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4" aria-hidden />
                      <span>الإعراب والتركيب (AST)</span>
                    </span>
                  </TabsTrigger>

                  <TabsTrigger value="morphology">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" aria-hidden />
                      <span>الميزان الصرفي</span>
                    </span>
                  </TabsTrigger>

                  <TabsTrigger value="rhetoric">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" aria-hidden />
                      <span>البيان والبلاغة</span>
                    </span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Prosody / Meter Scansion */}
                <TabsContent value="prosody">
                  {activeTab === 'prosody' && activeAnalysis.prosody && (
                    <MetreScansionVisualizer prosody={activeAnalysis.prosody} />
                  )}
                </TabsContent>

                {/* Tab 2: Syntax Trees */}
                <TabsContent value="syntax">
                  <div className="space-y-6">
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                      <span className="block font-mono text-micro text-muted-foreground">
                        نوع الجملة الرئيسية
                      </span>
                      <span className="mt-1 block font-amiri text-body font-bold text-foreground">
                        {activeAnalysis.syntax.sentenceType === 'verbal'
                          ? 'جملة فعلية كبرى'
                          : 'جملة اسمية كبرى'}
                      </span>
                    </div>

                    <SyntaxTreeVisualizer
                      ast={activeAnalysis.syntax.ast}
                      tokens={activeAnalysis.syntax.tokens}
                    />

                    {/* Detailed Tokens Grid */}
                    <div className="space-y-3">
                      <h4 className="text-mini font-bold uppercase tracking-wider text-muted-foreground">
                        تشريح الإعراب التفصيلي
                      </h4>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {activeAnalysis.syntax.tokens.map((token, idx) => (
                          <AppCard flat key={idx} className="flex flex-col justify-between p-3.5">
                            <div className="mb-2 flex items-start justify-between gap-2 border-b border-border/30 pb-2">
                              <span className="font-amiri text-body font-bold text-foreground">
                                «{token.word}»
                              </span>
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-micro font-bold text-primary">
                                {token.syntacticRole}
                              </span>
                            </div>
                            <p className="font-amiri text-mini leading-relaxed text-muted-foreground">
                              {token.explanation}
                            </p>
                            <span className="mt-2 font-mono text-micro text-primary">
                              العلامة: {token.markerDetail}
                            </span>
                          </AppCard>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Morphology */}
                <TabsContent value="morphology">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {activeAnalysis.morphology.tokens.map((t, idx) => (
                      <AppCard flat key={idx} className="space-y-2 p-4">
                        <div className="mb-2 flex items-center justify-between border-b border-border/30 pb-2">
                          <span className="font-amiri text-body font-bold text-foreground">
                            {t.word}
                          </span>
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-micro text-primary">
                            {t.pattern}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-mini">
                          <div>
                            <span className="block text-micro text-muted-foreground">الجذر اللغوي</span>
                            <span className="font-amiri text-meta font-bold text-foreground">
                              {t.root}
                            </span>
                          </div>
                          <div>
                            <span className="block text-micro text-muted-foreground">النوع الصرفي</span>
                            <span className="font-amiri font-semibold text-foreground">
                              {t.derivationType || 'جامد'}
                            </span>
                          </div>
                        </div>

                        {t.features.length > 0 && (
                          <div className="border-t border-border/30 pt-2">
                            <span className="mb-1 block text-micro text-muted-foreground">
                              العلل والزيادات الصرفية:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {t.features.map((f, fIdx) => (
                                <span
                                  key={fIdx}
                                  className="rounded bg-muted/60 px-1.5 py-0.5 text-micro text-foreground"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </AppCard>
                    ))}
                  </div>
                </TabsContent>

                {/* Tab 4: Rhetoric & Style */}
                <TabsContent value="rhetoric">
                  <div className="space-y-6">
                    {/* Overall Eloquence Score Meter */}
                    <div className="flex items-center justify-between gap-6 rounded-lg border border-border bg-muted/20 p-5">
                      <div className="space-y-1">
                        <span className="block text-mini text-muted-foreground">
                          مؤشر البلاغة التراكمي
                        </span>
                        <span className="font-mono text-hero font-black tabular-nums text-foreground">
                          {activeAnalysis.rhetoric.eloquenceIndex}%
                        </span>
                        <p className="max-w-sm text-mini leading-relaxed text-muted-foreground">
                          {activeAnalysis.rhetoric.styleCohesionSummary}
                        </p>
                      </div>

                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary/10 border-t-primary font-mono text-meta font-bold">
                        {activeAnalysis.rhetoric.sentenceStyle === 'expressive'
                          ? 'إنشائي'
                          : activeAnalysis.rhetoric.sentenceStyle === 'informative'
                            ? 'خبري'
                            : 'مزيج'}
                      </div>
                    </div>

                    {/* Detected Figures of speech list */}
                    <div className="space-y-3">
                      <h4 className="text-mini font-bold uppercase tracking-wider text-muted-foreground">
                        الجماليات والمحسنات البيانية واللفظية
                      </h4>
                      {activeAnalysis.rhetoric.rhetoricalFigures.length === 0 ? (
                        <p className="py-6 text-center font-amiri text-mini text-muted-foreground">
                          خلو نسبي من المحسنات اللفظية الكبرى المباشرة؛ يغلب عليه الأسلوب
                          التقريري الواضح.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {activeAnalysis.rhetoric.rhetoricalFigures.map((fig) => (
                            <AppCard flat key={fig.id} className="flex justify-between gap-4 p-4">
                              <div className="space-y-1">
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-mini font-bold text-primary">
                                  {fig.category}
                                </span>
                                <h5 className="mt-1 font-amiri text-meta font-bold text-foreground">
                                  المقتطف: «{fig.snippet}»
                                </h5>
                                <p className="font-amiri text-mini text-muted-foreground">
                                  {fig.description}
                                </p>
                              </div>
                              <div className="flex flex-col justify-center text-end">
                                <span className="block text-micro text-muted-foreground">
                                  وزن البلاغة
                                </span>
                                <span className="font-mono text-lead font-black tabular-nums text-primary">
                                  {fig.eloquenceWeight}/10
                                </span>
                              </div>
                            </AppCard>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
