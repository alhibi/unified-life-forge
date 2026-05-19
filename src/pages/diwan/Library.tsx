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
import { useDiwanEras, useDiwanStats } from '@/lib/diwan/hooks';

/**
 * صفحة المكتبة الكبرى الرئيسية (Hub).
 * تعرض إحصاءات + روابط سريعة لكل عصر + بحث + قسم الشعراء.
 */
export default function DiwanLibraryPage() {
  const { dir } = useApp();
  const navigate = useNavigate();
  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const stats = useDiwanStats();
  const eras  = useDiwanEras();

  const numFmt = (n: number | undefined) =>
    typeof n === 'number' ? n.toLocaleString('ar-EG') : '—';

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <SEO
        title="المكتبة الكبرى — الديوان العربي الكلاسيكي"
        description="آلاف الشعراء وعشرات الآلاف من القصائد عبر العصور: الجاهلي، الأموي، العباسي، الأندلسي وما بعدها."
        path="/diwan/library"
      />
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <BackButton onClick={() => navigate('/diwan')} />
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
          className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 mb-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold text-primary">إجمالي المحتوى</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="شاعر"   value={numFmt(stats.data?.poets_count)}  icon={<Feather className="w-3.5 h-3.5" />} />
            <Stat label="قصيدة" value={numFmt(stats.data?.poems_count)}   icon={<ScrollText className="w-3.5 h-3.5" />} />
            <Stat label="بيت"    value={numFmt(stats.data?.verses_count)} icon={<BookOpen className="w-3.5 h-3.5" />} />
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <ActionLink
            to="/diwan/library/search"
            label="البحث المتقدّم"
            sub="ابحث في 3 ملايين بيت"
            icon={<Search className="w-5 h-5 text-primary" />}
            chev={Chevron}
          />
          <ActionLink
            to="/diwan/library/poets"
            label="كل الشعراء"
            sub="مرتّبون بالعصر"
            icon={<Users className="w-5 h-5 text-primary" />}
            chev={Chevron}
          />
        </div>

        {/* Eras grid */}
        <h2 className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          العصور الأدبية
        </h2>
        {eras.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {(eras.data ?? []).map((era, i) => (
              <motion.div
                key={era.id}
                initial={{ opacity: 0, x: dir === 'rtl' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}
              >
                <Link
                  to={`/diwan/library/poets?era=${era.id}`}
                  className="block rounded-2xl bg-card border border-border/40 p-3.5 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1 self-stretch rounded-full"
                      style={{ background: era.color ?? '#6366f1' }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-[14px] text-foreground">
                        {era.name_ar}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {era.period_label ?? ''}
                      </p>
                    </div>
                    <Chevron className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────
function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-primary mb-1">{icon}</div>
      <div className="text-[18px] font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
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
      className="rounded-2xl bg-card border border-border/40 p-4 active:scale-[0.98] transition-transform flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[13px] text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
      </div>
      <Chev className="w-4 h-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
