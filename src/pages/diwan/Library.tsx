import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Library as LibraryIcon, Users, Search, ChevronLeft, ChevronRight,
  ScrollText, Feather, Sparkles, BookOpen,
} from 'lucide-react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { useDiwanStats } from '@/lib/diwan/hooks';

interface Props {
  /**
   * عند تركيبها كصفحة الـ tab الرئيسية لقسم الديوان، نخفي زر الرجوع
   * لأنّ التبويب نفسه هو الجذر. الافتراضي عبر الراوتر هو page-mode.
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

  const numFmt = (n: number | undefined) =>
    typeof n === 'number' ? n.toLocaleString('ar-EG') : '—';

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO
        title="المكتبة الكبرى — الديوان العربي الكلاسيكي"
        description="آلاف الشعراء وعشرات الآلاف من القصائد عبر العصور: الجاهلي، الأموي، العباسي، الأندلسي وما بعدها."
        path={tab ? '/diwan' : '/diwan/library'}
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          {!tab && <BackButton onClick={() => navigate('/')} />}
          <div className="flex-1">
            <h1 className="text-[22px] font-bold tracking-tight text-foreground flex items-center gap-2">
              <LibraryIcon className="w-5 h-5 text-primary" />
              المكتبة الكبرى
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              الموسوعة الشعرية عبر العصور
            </p>
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
        </div>
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
