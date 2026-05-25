import React, { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Library as LibraryIcon, Users, Search, ChevronLeft, ChevronRight,
  ScrollText, Feather, Sparkles, BookOpen, Heart, Network, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import FallbackBadge from '@/components/diwan/library/FallbackBadge';
import { useApp } from '@/contexts/AppContext';
import { useDiwanStats } from '@/lib/diwan/hooks';

// LiteraryGraph ضخم (~527 سطر + force-simulation + framer-motion)
// والمستخدم لا يفتحه إلا أحيانًا، لذلك نُحمّله بكسلًا فقط عند توسيع
// القسم.
const LiteraryGraph = lazy(() => import('@/components/diwan/LiteraryGraph'));

interface Props {
  /**
   * عند تركيبها كصفحة الـ tab الرئيسية لقسم الديوان أو محتوًى مدمج
   * داخل تبويب أكبر (مثل تبويب "الأدب" داخل /mihrab)، نخفي زرّ
   * الرجوع وكذلك الإطار الخارجي (`min-h-screen`، الحشو، SEO) لأنّ
   * الصفحة الأم هي مَن يُوفّرها. الافتراضي عبر الراوتر هو page-mode.
   */
  tab?: boolean;
}

/**
 * صفحة المكتبة الكبرى الرئيسية (Hub) — نقطة دخول قسم الديوان.
 * تعرض إحصاءات + رابط بحث متقدّم + رابط الشعراء.
 */
export default function DiwanLibraryPage({ tab = false }: Props) {
  const { dir } = useApp();
  const navigate = useNavigate();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const stats = useDiwanStats();
  const [showGraph, setShowGraph] = useState(false);

  const numFmt = (n: number | undefined) =>
    typeof n === 'number' ? n.toLocaleString('ar-EG') : '—';

  return (
    <div className={tab ? '' : 'min-h-screen bg-background pb-28 px-5 pt-14'}>
      {!tab && (
        <SEO
          title="المكتبة الكبرى — الديوان العربي الكلاسيكي"
          description="آلاف الشعراء وعشرات الآلاف من القصائد عبر العصور: الجاهلي، الأموي، العباسي، الأندلسي وما بعدها."
          path="/diwan/library"
        />
      )}
      <div className={tab ? '' : 'max-w-lg mx-auto'}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          {!tab && <BackButton fallback="/" />}
          <div className="flex-1">
            <h1 className="text-[22px] font-bold tracking-tight text-foreground flex items-center gap-2">
              <LibraryIcon className="w-5 h-5 text-primary" />
              المكتبة الكبرى
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-[12px] text-muted-foreground">
                الموسوعة الشعرية عبر العصور
              </p>
              <FallbackBadge />
            </div>
          </div>
        </div>

        {/* Stats Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-3.5 mb-4"
        >
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary/90">إجمالي المحتوى</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="شاعر"   value={numFmt(stats.data?.poets_count)}  icon={<Feather className="w-3 h-3" />} />
            <Stat label="قصيدة" value={numFmt(stats.data?.poems_count)}   icon={<ScrollText className="w-3 h-3" />} />
            <Stat label="بيت"    value={numFmt(stats.data?.verses_count)} icon={<BookOpen className="w-3 h-3" />} />
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2.5 mb-2">
          <ActionLink
            to="/diwan/library/search"
            label="البحث المتقدّم"
            sub="ابحث في 3 ملايين بيت"
            icon={<Search className="w-4 h-4 text-primary" />}
            chev={Chevron}
          />
          <ActionLink
            to="/diwan/library/poets"
            label="كل الشعراء"
            sub="مرتّبون بالعصر"
            icon={<Users className="w-4 h-4 text-primary" />}
            chev={Chevron}
          />
          <ActionLink
            to="/diwan/library/favorites"
            label="مفضّلتي"
            sub="القصائد المحفوظة"
            icon={<Heart className="w-4 h-4 text-rose-500" />}
            chev={Chevron}
          />
        </div>

        {/* ═════ الشجرة الأدبية ═════ */}
        <section className="mt-6">
          <button
            onClick={() => setShowGraph(s => !s)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition ${
              showGraph
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-card border-border/40 text-foreground hover:border-primary/30'
            }`}
            aria-expanded={showGraph}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${showGraph ? 'bg-primary/20' : 'bg-primary/10'}`}>
                <Network className="w-4 h-4 text-primary" />
              </div>
              <div className="text-start">
                <p className="font-bold text-[13px] leading-tight">الشجرة الأدبية</p>
                <p className="text-[10.5px] mt-0.5 text-muted-foreground">
                  علاقات الشعراء عبر العصور
                </p>
              </div>
            </div>
            {showGraph
              ? <ChevronUp   className="w-4 h-4 shrink-0 opacity-70" />
              : <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />}
          </button>

          <AnimatePresence initial={false}>
            {showGraph && (
              <motion.div
                key="graph-wrap"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  <Suspense
                    fallback={
                      <div className="w-full h-[72vh] min-h-[420px] rounded-3xl border border-border/30 bg-card/30 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-[11px]">يحمّل الشجرة الأدبية…</span>
                        </div>
                      </div>
                    }
                  >
                    <LiteraryGraph
                      onSelectPoet={(id) => navigate(`/diwan/library/poet/${id}`)}
                    />
                  </Suspense>
                  <p className="text-[10px] text-muted-foreground/80 text-center mt-2">
                    اضغط على شاعر لرؤية علاقاته، أو على زر "عرض قصائد" للانتقال إلى صفحته.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────
function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-primary/80 mb-0.5">{icon}</div>
      <div className="text-[15px] font-bold text-foreground tabular-nums leading-tight">{value}</div>
      <div className="text-[9.5px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function ActionLink({
  to, label, sub, icon, chev: Chev,
}: {
  to: string; label: string; sub: string;
  icon: React.ReactNode; chev: React.ElementType;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl bg-card border border-border/40 px-3 py-2.5 active:scale-[0.98] transition-transform flex items-center gap-2.5"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[12.5px] text-foreground leading-tight">{label}</p>
        <p className="text-[9.5px] text-muted-foreground mt-0.5 truncate">{sub}</p>
      </div>
      <Chev className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </Link>
  );
}
