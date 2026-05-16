import React, { useState } from 'react';
import SEO from '@/components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Utensils, Sparkles, Brain, Trash2, Download, ShieldCheck, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import BackButton from '@/components/BackButton';
import { useWellnessData } from '@/features/wellness/useWellnessData';
import SupplementsTab from '@/features/wellness/SupplementsTab';
import DietTab from '@/features/wellness/DietTab';
import SkinHairTab from '@/features/wellness/SkinHairTab';
import InsightsTab from '@/features/wellness/InsightsTab';
import AtlasTab from '@/features/wellness/AtlasTab';
import { exportAll } from '@/features/wellness/wellnessDb';

type TabKey = 'supplements' | 'diet' | 'skin' | 'insights' | 'atlas';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function WellnessPage() {
  const { language } = useApp();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const [tab, setTab] = useState<TabKey>('supplements');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const {
    supplements,
    intakeLogs,
    dietLogs,
    skinHair,
    loading,
    addOrUpdateSupplement,
    removeSupplement,
    addIntake,
    addDiet,
    removeDiet,
    saveSkinHair,
    wipe,
  } = useWellnessData();

  const tabs: Array<{ key: TabKey; labelAr: string; labelDe: string; icon: any }> = [
    { key: 'supplements', labelAr: 'المكملات', labelDe: 'Supplemente', icon: Pill },
    { key: 'diet', labelAr: 'التغذية', labelDe: 'Ernährung', icon: Utensils },
    { key: 'skin', labelAr: 'البشرة والشعر', labelDe: 'Haut & Haar', icon: Sparkles },
    { key: 'insights', labelAr: 'التركيبات', labelDe: 'Stack', icon: Brain },
    { key: 'atlas', labelAr: 'الأطلس', labelDe: 'Atlas', icon: BookOpen },
  ];

  const handleExport = async () => {
    try {
      const data = await exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wellness-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(isAr ? 'تم التصدير' : 'Export erfolgreich');
    } catch (e) {
      toast.error(isAr ? 'فشل التصدير' : 'Export fehlgeschlagen');
    }
  };

  const handleWipe = async () => {
    await wipe();
    setShowPrivacy(false);
    toast.success(isAr ? 'تم حذف جميع بيانات العافية' : 'Alle Wellness-Daten gelöscht');
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-10">
      <SEO title="الصحة والعافية — SmartHub" description="متابعة المكملات، الحمية، العناية بالبشرة والشعر، والرؤى الصحية الشخصية في SmartHub." path="/wellness" />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-4 max-w-lg mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between gap-3">
          <BackButton />
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-[20px] font-bold tracking-tight text-foreground truncate">
              {isAr ? 'العافية' : 'Wellness'}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {isAr ? 'محلي بالكامل' : '100% lokal'}
            </p>
          </div>
          <button
            onClick={() => setShowPrivacy(true)}
            className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center shrink-0"
            aria-label={isAr ? 'الخصوصية' : 'Privatsphäre'}
          >
            <ShieldCheck className="w-5 h-5 text-foreground" />
          </button>
        </motion.div>

        {/* Tab bar */}
        <motion.div variants={item}>
          <div className="bg-card border border-border/40 rounded-2xl p-1 flex gap-0.5">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 min-w-0 py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition-colors ${
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  <span className="text-[10px] font-semibold truncate max-w-full">
                    {isAr ? t.labelAr : t.labelDe}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab content */}
        {loading ? (
          <motion.div variants={item} className="space-y-3">
            <div className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
          </motion.div>
        ) : (
          <motion.div variants={item}>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {tab === 'supplements' && (
                  <SupplementsTab
                    supplements={supplements}
                    intakeLogs={intakeLogs}
                    onSave={addOrUpdateSupplement}
                    onDelete={removeSupplement}
                    onLogIntake={addIntake}
                  />
                )}
                {tab === 'diet' && (
                  <DietTab
                    dietLogs={dietLogs}
                    onAdd={addDiet}
                    onRemove={removeDiet}
                  />
                )}
                {tab === 'skin' && (
                  <SkinHairTab skinHair={skinHair} onSave={saveSkinHair} />
                )}
                {tab === 'insights' && (
                  <InsightsTab
                    supplements={supplements}
                    intakeLogs={intakeLogs}
                    dietLogs={dietLogs}
                    skinHair={skinHair}
                  />
                )}
                {tab === 'atlas' && <AtlasTab />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* Privacy dialog */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {isAr ? 'الخصوصية والتحكم' : 'Datenschutz & Kontrolle'}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAr
                  ? 'بيانات العافية تُخزّن محلياً على متصفحك فقط باستخدام IndexedDB. لا يتم رفعها إلى أي خادم.'
                  : 'Wellness-Daten werden nur lokal im Browser (IndexedDB) gespeichert — nichts wird übertragen.'}
              </p>
              <button
                onClick={handleExport}
                className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Download className="w-4 h-4" />
                {isAr ? 'تصدير بياناتي' : 'Daten exportieren'}
              </button>
              <button
                onClick={handleWipe}
                className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Trash2 className="w-4 h-4" />
                {isAr ? 'حذف جميع البيانات' : 'Alle Daten löschen'}
              </button>
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-full py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
              >
                {isAr ? 'إغلاق' : 'Schließen'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
