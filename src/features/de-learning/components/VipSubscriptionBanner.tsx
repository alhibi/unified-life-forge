import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Crown, Sparkles, Check, ArrowLeft, ShieldCheck, Zap, Award, Layers, X } from '@/lib/icons';

interface VipSubscriptionBannerProps {
  isVipActive: boolean;
  onToggleVip: (active: boolean) => void;
}

export const VipSubscriptionBanner: React.FC<VipSubscriptionBannerProps> = ({
  isVipActive,
  onToggleVip,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleActivateSimulatedVip = () => {
    onToggleVip(true);
    setIsDrawerOpen(false);
    toast.success('تم تفعيل اشتراك النخبة الألماني (VIP Pass) بنجاح!', {
      icon: <Crown className="h-5 w-5 text-amber-400" />,
      duration: 3000,
    });
  };

  return (
    <>
      {/* Heavy-weight Luxury Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-950/20 to-orange-500/10 p-5 shadow-lg">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 h-28 w-28 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
              <Crown className="h-6 w-6" />
            </div>

            <div className="space-y-0.5 text-end">
              <div className="flex items-center gap-2 justify-end">
                {isVipActive ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-tajawal text-micro font-bold uppercase">
                    عضوية النخبة نشطة
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-tajawal text-micro font-bold uppercase">
                    اشتراك VIP الحصري
                  </span>
                )}
                <h4 className="font-amiri text-lead font-bold text-foreground">
                  مسار الألمانية المتقدم الفاخر
                </h4>
              </div>
              <p className="font-tajawal text-mini text-muted-foreground">
                تجربة تعليمية استثنائية مصممة خصيصاً بنخبة المعايير العالية (€1,000 / شهرياً)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-tajawal text-mini font-bold shadow-md hover:shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isVipActive ? 'تفاصيل باقة VIP' : 'استكشاف اشتراك النخبة'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/40 bg-card p-6 shadow-2xl space-y-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="absolute top-4 left-4 p-2 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Drawer Header */}
              <div className="text-center space-y-2 pt-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
                  <Crown className="h-8 w-8" />
                </div>
                <h3 className="font-amiri text-display font-bold text-foreground">
                  باقة النخبة الألمانية الفاخرة
                </h3>
                <p className="font-tajawal text-mini text-muted-foreground max-w-sm mx-auto">
                  منظومة تعليمية فاخرة غير تقليدية بمستوى طلاقة C1 ومحتوى حصري لجيل الشارع والشباب
                </p>
                <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-plex-mono text-meta font-bold">
                  €1,000 / Monat (شهرياً)
                </div>
              </div>

              {/* Feature Perks List */}
              <div className="space-y-3 pt-2 text-end" dir="rtl">
                {[
                  {
                    title: 'وصول شامل لجميع المستويات الستة (A0 حتى C1)',
                    desc: 'أكثر من 8,000 مفردة وعبارة مبوبة ومتسلسلة بدقة عالية.',
                  },
                  {
                    title: 'رفوف المواقف والظروف الحية (Gen Z Slang & Street)',
                    desc: 'لغة برلين المعاصرة، الشارع، المقاهي، المواعدة، والشركات الناشئة.',
                  },
                  {
                    title: 'محاكي السيناريوهات الحرة ومحلل الذكاء النحوي',
                    desc: 'إعراب وتحليل فوري للجمل الألمانية مع جسور مقارنة بالنحو العربي.',
                  },
                  {
                    title: 'نظام التكرار المتباعد الفائق (FSRS Engine)',
                    desc: 'خوارزمية ذكية تضمن عدم نسيان أي كلمة عبر فواصل زمنية مدروسة.',
                  },
                  {
                    title: 'تسجيلات ناطقة من متحدثين أصليين ومخارج صوتية دقيقة',
                    desc: 'صوتيات واضحة ومقاطع لفظية مع تمثيل IPA ومخارج الحروف.',
                  },
                ].map((perk, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-background border border-border/40 flex items-start gap-3"
                  >
                    <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="font-tajawal text-meta font-bold text-foreground">
                        {perk.title}
                      </h5>
                      <p className="font-tajawal text-mini text-muted-foreground">
                        {perk.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {!isVipActive ? (
                  <button
                    onClick={handleActivateSimulatedVip}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-tajawal text-meta font-bold shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Crown className="h-5 w-5" />
                    <span>تفعيل اشتراك VIP النخبة (تجريبي)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onToggleVip(false);
                      setIsDrawerOpen(false);
                      toast.info('تم إلغاء وضع VIP التجريبي');
                    }}
                    className="w-full py-3 rounded-xl border border-border/50 bg-secondary/50 text-muted-foreground font-tajawal text-mini font-bold hover:text-foreground transition-all"
                  >
                    تعطيل وضع VIP التجريبي
                  </button>
                )}

                <p className="text-center font-tajawal text-micro text-muted-foreground/80">
                  بنية الدفع الرسمية سيتم ربطها بواسطة بوابة الاشتراكات لاحقاً.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
