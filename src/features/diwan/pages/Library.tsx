import { AnimatePresence,motion } from 'framer-motion';
import React, { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import FallbackBadge from '@/features/diwan/components/library/FallbackBadge';
import { useDiwanStats } from '@/features/diwan/lib/hooks';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Feather,
  Heart,
  Library as LibraryIcon,
  Loader2,
  Network,
  ScrollText,
  Search,
  Sparkles,
  Users,
} from '@/lib/icons';

// LiteraryGraph بكسلًا فقط عند توسيع القسم.
const LiteraryGraph = lazy(() => import('@/features/diwan/components/LiteraryGraph'));

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
 * صفحة المكتبة الكبرى الرئيسية (Hub) — مصممة بالكامل بنمط "المخطوطة" (Manuscript).
 * تتميز بخلفية حبر دافئة عتيقة ونظام ألوان شمع الختم وبناء بصري مسطح مذهل.
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
    <div
      className={
        tab
          ? 'rounded-[1.75rem] bg-[#16130F] px-4 py-5 font-tajawal text-[#F2E9D8] shadow-elevated selection:bg-[var(--wax-soft2)] selection:text-[#F2E9D8]'
          : 'min-h-screen bg-[#16130F] text-[#F2E9D8] pb-page px-5 pt-14 font-tajawal selection:bg-[var(--wax-soft2)] selection:text-[#F2E9D8]'
      }
    >
      {!tab && (
        <SEO
          title="المكتبة الكبرى — الديوان العربي الكلاسيكي"
          description="آلاف الشعراء وعشرات الآلاف من القصائد عبر العصور: الجاهلي، الأموي، العباسي، الأندلسي وما بعدها."
          path="/diwan/library"
        />
      )}
      <div className={tab ? '' : 'max-w-lg mx-auto'}>
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          {!tab && (
            <div className="mt-1 shrink-0">
              <BackButton
                fallback="/"
                className="w-10 h-10 rounded-full border border-[var(--hairline-strong)] bg-[#1D1811] flex items-center justify-center text-[#B8AA8E] hover:text-[#F2E9D8] hover:border-[#B8AA8E] active:scale-95 transition-all"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {/* عنوان علوي صغير بلون wax */}
            <p className="text-micro font-bold tracking-[0.1em] text-[var(--wax)] uppercase mb-1">
              محراب · الأدب
            </p>
            <h1 className="text-display font-bold tracking-tight text-[#F2E9D8] leading-tight font-amiri flex items-center gap-2">
              <LibraryIcon className="w-6 h-6 text-[var(--wax)] shrink-0" />
              المكتبة الكبرى
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <p className="text-mini text-[#B8AA8E]">الموسوعة الشعرية العربية الخالدة</p>
              <FallbackBadge />
            </div>
          </div>
        </div>

        {/* Stats Hero (Manuscript design) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[12px] border border-[var(--hairline-strong)] bg-[#1D1811] p-5 mb-5 relative overflow-hidden"
        >
          {/* علامة معينة صغيرة (◆) في الزاوية */}
          <div className="absolute top-[12px] start-[16px] text-micro text-[var(--wax)] opacity-60">
            ◆
          </div>

          <div className="flex items-center gap-1.5 mb-3.5 select-none">
            <Sparkles className="w-4 h-4 text-[var(--wax)]" />
            <span className="text-micro font-bold text-[#7E7259] uppercase tracking-wider">
              الرقوق المحفوظة
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 divide-x divide-reverse divide-[var(--hairline)]">
            <Stat
              label="شاعر فحل"
              value={numFmt(stats.data?.poets_count)}
              icon={<Feather className="w-4 h-4 text-[#7E7259]" />}
            />
            <Stat
              label="قصيدة عصماء"
              value={numFmt(stats.data?.poems_count)}
              icon={<ScrollText className="w-4 h-4 text-[#7E7259]" />}
            />
            <Stat
              label="بيت فريد"
              value={numFmt(stats.data?.verses_count)}
              icon={<BookOpen className="w-4 h-4 text-[#7E7259]" />}
            />
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <ActionLink
            to="/diwan/library/search"
            label="البحث المتقدّم"
            sub="ابحث في 3 ملايين بيت"
            icon={<Search className="w-4 h-4 text-[var(--wax)]" />}
            chev={Chevron}
          />
          <ActionLink
            to="/diwan/library/poets"
            label="شجرة الشعراء"
            sub="مرتّبون بالعصور"
            icon={<Users className="w-4 h-4 text-[var(--wax)]" />}
            chev={Chevron}
          />
          <ActionLink
            to="/diwan/library/favorites"
            label="مفضلتي الخاصة"
            sub="المحفوظ من القصائد"
            icon={<Heart className="w-4 h-4 text-[var(--wax)]" />}
            chev={Chevron}
          />
          <ActionLink
            to="/diwan/bayan"
            label="البيان الإعرابي والبلاغي"
            sub="محلل عروضي وصرفي عميق"
            icon={<Sparkles className="w-4 h-4 text-[var(--wax)]" />}
            chev={Chevron}
          />
        </div>

        {/* Шجرة أدبية */}
        <section className="mt-6">
          <button
            onClick={() => setShowGraph((s) => !s)}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[12px] border transition-all ${
              showGraph
                ? 'bg-[var(--wax-soft)] border-[var(--wax-soft2)] text-[var(--wax)]'
                : 'bg-[#1D1811] border-[var(--hairline-strong)] text-[#B8AA8E] hover:text-[#F2E9D8] hover:border-[#B8AA8E]'
            }`}
            aria-expanded={showGraph}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showGraph ? 'bg-[var(--wax-soft2)]' : 'bg-[rgba(242,233,216,0.04)]'}`}
              >
                <Network className="w-4 h-4 text-[var(--wax)]" />
              </div>
              <div className="text-start">
                <p className="font-bold text-mini leading-tight">الشجرة الأدبية للتواصل</p>
                <p className="text-micro mt-0.5 text-[#7E7259]">
                  صلات الشعراء وتأثيراتهم عبر القرون
                </p>
              </div>
            </div>
            {showGraph ? (
              <ChevronUp className="w-4 h-4 shrink-0 opacity-70" />
            ) : (
              <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
            )}
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
                      <div className="w-full h-[65vh] min-h-[380px] rounded-[12px] border border-[var(--hairline-strong)] bg-[#1D1811] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-[#7E7259]">
                          <Loader2 className="w-5 h-5 animate-spin text-[var(--wax)]" />
                          <span className="text-micro">جاري بسط الشجرة الأدبية…</span>
                        </div>
                      </div>
                    }
                  >
                    <LiteraryGraph onSelectPoet={(id) => navigate(`/diwan/library/poet/${id}`)} />
                  </Suspense>
                  <p className="text-micro text-[#7E7259] text-center mt-3 leading-relaxed max-w-sm mx-auto select-none">
                    اضغط على أي شاعر لرؤية علاقاته الأدبية، أو انقر على "قصائده" لزيارة ديوانه
                    الخاص.
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

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="text-center px-1">
      <div className="flex items-center justify-center gap-1.5 text-[#7E7259] mb-1 select-none">
        {icon}
      </div>
      <div className="text-body font-bold text-[#F2E9D8] tabular-nums leading-tight font-amiri select-all">
        {value}
      </div>
      <div className="text-micro text-[#7E7259] mt-1 select-none font-tajawal">{label}</div>
    </div>
  );
}

function ActionLink({
  to,
  label,
  sub,
  icon,
  chev: Chev,
}: {
  to: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  chev: React.ElementType;
}) {
  return (
    <Link
      to={to}
      className="rounded-[12px] bg-[#1D1811] border border-[var(--hairline-strong)] px-4 py-3.5 active:scale-[0.98] hover:border-[#B8AA8E] transition-all flex items-center gap-3.5"
    >
      <div className="w-9 h-9 rounded-full bg-[rgba(184,73,46,0.08)] flex items-center justify-center shrink-0 border border-[var(--wax-soft)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-mini text-[#F2E9D8] leading-tight font-tajawal">{label}</p>
        <p className="text-micro text-[#7E7259] mt-0.5 truncate font-tajawal">{sub}</p>
      </div>
      {/* @ts-ignore */}
{/* @ts-ignore */}
<Chev className="w-4 h-4 text-[#7E7259] shrink-0 opacity-60" />
    </Link>
  );
}
