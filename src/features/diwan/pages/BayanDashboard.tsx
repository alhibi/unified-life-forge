import React, { useState } from "react";
import { ArrowLeft, BookOpen, Layers, Sparkles, Hash, History, Bookmark, BookmarkCheck, Search } from '@/lib/icons';
import { Link } from "react-router-dom";
import { useBayanStore } from "../stores/bayanStore";
import { SyntaxTreeVisualizer } from "../components/bayan/SyntaxTreeVisualizer";
import { MetreScansionVisualizer } from "../components/bayan/MetreScansionVisualizer";
import { PageShell } from "@/components/ui/app-shell";
import { toast } from "sonner";

export default function BayanDashboard() {
  const [inputText, setInputText] = useState("");
  const {
    analyzeText,
    loading,
    error,
    activeAnalysis,
    history,
    bookmarkedAnalyses,
    bookmarkAnalysis,
    removeBookmark,
    setActiveAnalysis
  } = useBayanStore();

  const [activeTab, setActiveTab] = useState<"syntax" | "morphology" | "rhetoric" | "prosody">("syntax");

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      toast.error("يرجى إدخال نص أولاً للبدء بالتحليل اللغوي");
      return;
    }
    const res = await analyzeText(inputText);
    if (res) {
      toast.success("اكتمل التحليل البلاغي والإعرابي بنجاح!");
      if (res.prosody) {
        setActiveTab("prosody");
      } else {
        setActiveTab("syntax");
      }
    }
  };

  const isBookmarked = activeAnalysis ? !!bookmarkedAnalyses[activeAnalysis.id] : false;

  const handleToggleBookmark = () => {
    if (!activeAnalysis) return;
    if (isBookmarked) {
      removeBookmark(activeAnalysis.id);
      toast.info("تم إزالة التحليل من المحفوظات");
    } else {
      const defaultTitle = activeAnalysis.inputText.slice(0, 30) + "...";
      bookmarkAnalysis(activeAnalysis.id, defaultTitle);
      toast.success("تم حفظ التحليل في المرجعية");
    }
  };

  const loadPastAnalysis = (past: typeof history[number]) => {
    setActiveAnalysis(past);
    setInputText(past.inputText);
    if (past.prosody) {
      setActiveTab("prosody");
    } else {
      setActiveTab("syntax");
    }
  };

  return (
    <PageShell centered={false} flush>
      <div className="min-h-screen bg-background text-foreground pb-12">
        {/* Luxury Banner */}
        <div className="relative border-b border-border/80 py-8 bg-surface/10 overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-80 h-40 bg-live/5 blur-3xl rounded-full" />

          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/diwan" className="p-2 rounded-lg hover:bg-surface/80 border border-border/40 transition-all">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <span className="text-[0.625rem] uppercase font-mono tracking-wider bg-live/15 text-live px-2.5 py-0.5 rounded-full font-bold">
                  محرك العلوم العميقة
                </span>
                <h1 className="text-2xl md:text-3xl font-bold font-amiri tracking-tight mt-1">
                  البيَانُ — التَّحْلِيلُ اللُّغَوِيُّ العَمِيقُ
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 font-amiri">
                  إعراب فوري، ميزان صرفي، فحص عروضي كامل، وكشف الجمال البلاغي
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeAnalysis && (
                <button
                  onClick={handleToggleBookmark}
                  className="px-3.5 py-2 rounded-lg border border-border bg-surface hover:border-live text-xs font-semibold flex items-center gap-2 transition-all active-tactile"
                >
                  {isBookmarked ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-live" />
                      <span>محفوظ</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>حفظ التحليل</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Core Layout Grid */}
        <div className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left panel / Input Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-5 rounded-2xl border border-border bg-surface shadow-sm">
              <h2 className="text-sm font-bold border-b border-border/50 pb-3 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-live" />
                <span>التحليل الفوري الفائق</span>
              </h2>

              <form onSubmit={handleAnalyze} className="space-y-4">
                <div>
                  <label htmlFor="bayan-text-input" className="block text-xs text-muted-foreground mb-2">
                    أدخل بيتاً شعرياً أو جملة عربية فصحى:
                  </label>
                  <textarea
                    id="bayan-text-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={4}
                    placeholder="مثال: قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ ... بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ"
                    className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground/60 font-amiri leading-relaxed focus:outline-none focus:border-live"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-lg bg-live text-white font-bold text-sm transition-all shadow-md active-tactile disabled:opacity-50 hover:bg-live/90 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>ابدأ التحليل اللغوي</span>
                </button>
              </form>
            </div>

            {/* Analysis History */}
            {history.length > 0 && (
              <div className="p-5 rounded-2xl border border-border bg-surface shadow-sm">
                <h3 className="text-xs font-mono font-bold text-muted-foreground tracking-wider uppercase border-b border-border/50 pb-3 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-live" />
                  <span>السجل الفوري الفني</span>
                </h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin">
                  {history.map((past) => (
                    <button
                      key={past.id}
                      onClick={() => loadPastAnalysis(past)}
                      className={`w-full p-2.5 rounded-lg border text-end transition-all flex flex-col gap-1 ${
                        activeAnalysis?.id === past.id
                          ? "bg-live/5 border-live"
                          : "bg-surface hover:bg-background border-border/50"
                      }`}
                    >
                      <span className="text-xs font-semibold text-foreground font-amiri truncate max-w-full">
                        {past.inputText}
                      </span>
                      <span className="text-[0.625rem] font-mono text-muted-foreground">
                        {new Date(past.analyzedAt).toLocaleTimeString("ar-EG")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel / Output Details */}
          <div className="lg:col-span-8 space-y-6">
            {!activeAnalysis ? (
              <div className="p-12 text-center border border-dashed border-border/85 rounded-2xl bg-surface/20">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/35 mb-4" />
                <h3 className="text-base font-bold font-amiri text-foreground">في انتظار إدخال البيانات</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto font-amiri">
                  أدخل جملة أو بيتاً فصيحاً لنقوم بتشريحها إعرابياً وبلاغياً وصرفياً بدقة فائقة.
                </p>
              </div>
            ) : (
              <div className="space-y-6">

                {/* Visual Tab Selectors */}
                <div className="flex border-b border-border/50 pb-px gap-1 overflow-x-auto scrollbar-none">
                  {activeAnalysis.prosody && (
                    <button
                      onClick={() => setActiveTab("prosody")}
                      className={`px-4 py-2 text-xs font-bold font-mono transition-all border-b-2 flex items-center gap-1.5 ${
                        activeTab === "prosody"
                          ? "border-live text-live"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Hash className="w-4 h-4" />
                      <span>البحور والعروض</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("syntax")}
                    className={`px-4 py-2 text-xs font-bold font-mono transition-all border-b-2 flex items-center gap-1.5 ${
                      activeTab === "syntax"
                        ? "border-live text-live"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>الإعراب والتركيب (AST)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("morphology")}
                    className={`px-4 py-2 text-xs font-bold font-mono transition-all border-b-2 flex items-center gap-1.5 ${
                      activeTab === "morphology"
                        ? "border-live text-live"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>الميزان الصرفي</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("rhetoric")}
                    className={`px-4 py-2 text-xs font-bold font-mono transition-all border-b-2 flex items-center gap-1.5 ${
                      activeTab === "rhetoric"
                        ? "border-live text-live"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>البيان والبلاغة</span>
                  </button>
                </div>

                {/* Tab content rendering */}
                <div className="p-1">

                  {/* Tab 1: Prosody / Meter Scansion */}
                  {activeTab === "prosody" && activeAnalysis.prosody && (
                    <MetreScansionVisualizer prosody={activeAnalysis.prosody} />
                  )}

                  {/* Tab 2: Syntax Trees */}
                  {activeTab === "syntax" && (
                    <div className="space-y-6">
                      <div className="p-4 rounded-xl border border-border/40 bg-surface/20">
                        <span className="text-[0.625rem] text-muted-foreground block font-mono">نوع الجملة الرئيسية</span>
                        <span className="text-base font-bold font-amiri text-foreground mt-1 block">
                          {activeAnalysis.syntax.sentenceType === "verbal" ? "جملة فعلية كبرى" : "جملة اسمية كبرى"}
                        </span>
                      </div>

                      <SyntaxTreeVisualizer
                        ast={activeAnalysis.syntax.ast}
                        tokens={activeAnalysis.syntax.tokens}
                      />

                      {/* Detailed Tokens Grid */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">تشريح الإعراب التفصيلي</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {activeAnalysis.syntax.tokens.map((token, idx) => (
                            <div key={idx} className="p-3.5 rounded-xl border border-border bg-surface flex flex-col justify-between">
                              <div className="flex justify-between items-start gap-2 border-b border-border/30 pb-2 mb-2">
                                <span className="text-base font-bold text-foreground font-amiri">«{token.word}»</span>
                                <span className="text-[0.625rem] font-mono bg-live/15 text-live px-2 py-0.5 rounded-full font-bold">
                                  {token.syntacticRole}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground font-amiri leading-relaxed">
                                {token.explanation}
                              </p>
                              <span className="text-[0.625rem] text-live mt-2 font-mono">
                                العلامة: {token.markerDetail}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Morphology */}
                  {activeTab === "morphology" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeAnalysis.morphology.tokens.map((t, idx) => (
                          <div key={idx} className="p-4 rounded-xl border border-border bg-surface space-y-2">
                            <div className="flex justify-between items-center border-b border-border/30 pb-2 mb-2">
                              <span className="text-base font-bold text-foreground font-amiri">{t.word}</span>
                              <span className="text-[0.625rem] bg-live/10 text-live px-2 py-0.5 rounded-md font-mono">
                                {t.pattern}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground block text-[0.625rem]">الجذر اللغوي</span>
                                <span className="font-bold text-foreground font-amiri text-sm">{t.root}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[0.625rem]">النوع الصرفي</span>
                                <span className="font-semibold text-foreground font-amiri">{t.derivationType || "جامد"}</span>
                              </div>
                            </div>

                            {t.features.length > 0 && (
                              <div className="pt-2 border-t border-border/30">
                                <span className="text-[0.625rem] text-muted-foreground block mb-1">العلل والزيادات الصرفية:</span>
                                <div className="flex flex-wrap gap-1">
                                  {t.features.map((f, fIdx) => (
                                    <span key={fIdx} className="text-[0.625rem] bg-muted/60 text-foreground px-1.5 py-0.5 rounded">
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Rhetoric & Style */}
                  {activeTab === "rhetoric" && (
                    <div className="space-y-6">
                      {/* Overall Eloquence Score Meter */}
                      <div className="p-5 rounded-xl border border-border bg-surface flex items-center justify-between gap-6">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground block">مؤشر البلاغة التراكمي</span>
                          <span className="text-3xl font-black text-foreground font-mono">
                            {activeAnalysis.rhetoric.eloquenceIndex}%
                          </span>
                          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                            {activeAnalysis.rhetoric.styleCohesionSummary}
                          </p>
                        </div>

                        <div className="w-16 h-16 rounded-full border-4 border-live/10 border-t-live flex items-center justify-center font-mono font-bold text-sm">
                          {activeAnalysis.rhetoric.sentenceStyle === "expressive" ? "إنشائي" : activeAnalysis.rhetoric.sentenceStyle === "informative" ? "خبري" : "مزيج"}
                        </div>
                      </div>

                      {/* Detected Figures of speech list */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">الجماليات والمحسنات البيانية واللفظية</h4>
                        {activeAnalysis.rhetoric.rhetoricalFigures.length === 0 ? (
                          <p className="text-xs text-muted-foreground font-amiri text-center py-6">
                            خلو نسبي من المحسنات اللفظية الكبرى المباشرة؛ يغلب عليه الأسلوب التقريري الواضح.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {activeAnalysis.rhetoric.rhetoricalFigures.map((fig) => (
                              <div key={fig.id} className="p-4 rounded-xl border border-border bg-surface flex justify-between gap-4">
                                <div className="space-y-1">
                                  <span className="text-xs bg-live/10 text-live px-2 py-0.5 rounded-full font-mono font-bold">
                                    {fig.category}
                                  </span>
                                  <h5 className="text-sm font-bold text-foreground font-amiri mt-1">
                                    المقتطف: «{fig.snippet}»
                                  </h5>
                                  <p className="text-xs text-muted-foreground font-amiri">
                                    {fig.description}
                                  </p>
                                </div>
                                <div className="text-end flex flex-col justify-center">
                                  <span className="text-[0.625rem] text-muted-foreground block">وزن البلاغة</span>
                                  <span className="text-lg font-mono font-black text-live">
                                    {fig.eloquenceWeight}/10
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    </PageShell>
  );
}
