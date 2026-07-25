import React, { useEffect } from 'react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import PrayerTimes from '@/components/PrayerTimes';
import { motion } from 'framer-motion';
import CurrentTimeSunnah from '@/components/CurrentTimeSunnah';
import WeatherWidget from '@/weather/components/WeatherWidget';
import UmmahPulse from '@/components/UmmahPulse';

import SmartGreeting from '@/components/SmartGreeting';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, FileText, MapPinned } from '@/lib/icons';
import { PageShell, AppCard } from '@/components/ui/app-shell';

import { pageStagger as stagger, pageItem as item } from '@/lib/motion';

export default function Now() {
  // Auto-request the device's location on first homepage visit *iff* there
  // is nothing cached yet. Routed through the singleton hook so the prayer-
  // times card and weather widget see the same coordinates on the same
  // tick. Anything beyond `idle` (cached / requesting / granted / denied)
  // means another widget already kicked things off — don't double-prompt.
  const { status: locationStatus, requestLocation } = useDeviceLocation();
  useEffect(() => {
    if (locationStatus === 'idle') void requestLocation();
  }, [locationStatus, requestLocation]);

  const { t, language } = useApp();
  const navigate = useNavigate();

  return (
    <PageShell>
      <SEO
        title="الرئيسي — أوقات الصلاة والأذكار والقرآن"
        description="الآن على SmartHub: أوقات الصلاة، التقويم الهجري، الطقس، الأذكار ونبض الأمة."
        path="/now"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "SmartHub",
          "url": "https://amv.life/",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://amv.life/pkm?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      {/* Descriptive H1 for SEO & a11y; visual greeting below acts as a styled subhead */}
      <h1 className="sr-only">
        {language === 'ar'
          ? 'SmartHub — لوحتك اليومية لأوقات الصلاة، القرآن، الأذكار، الطقس والتقويم الهجري'
          : 'SmartHub — Dein tägliches Dashboard für Gebetszeiten, Quran, Adhkar, Wetter und Hidschri-Kalender'}
      </h1>
      <motion.div variants={stagger} initial="hidden" animate="show" className="contents">
        <motion.div variants={item}>
          <SmartGreeting />
        </motion.div>

        <motion.section variants={item} aria-labelledby="home-prayer-h">
          <h2 id="home-prayer-h" className="sr-only">{language === 'ar' ? 'أوقات الصلاة' : 'Gebetszeiten'}</h2>
          <PrayerTimes />
        </motion.section>
        <motion.section variants={item} aria-labelledby="home-sunnah-h">
          <h2 id="home-sunnah-h" className="sr-only">{language === 'ar' ? 'سنة الوقت الحالي' : 'Sunnah dieser Zeit'}</h2>
          <CurrentTimeSunnah />
        </motion.section>
        <motion.section variants={item} aria-labelledby="home-weather-h">
          <h2 id="home-weather-h" className="sr-only">{language === 'ar' ? 'الطقس' : 'Wetter'}</h2>
          <WeatherWidget />
        </motion.section>
        <motion.section variants={item} aria-labelledby="home-ummah-h">
          <h2 id="home-ummah-h" className="sr-only">{language === 'ar' ? 'بوصلة القبلة ومواقيت الصلاة حول العالم' : 'Qibla-Kompass und Gebetszeiten weltweit'}</h2>
          <UmmahPulse />
        </motion.section>
        {/* Tafsir feature card and the IslamicSections grid that used
            to live here have been retired in the IA reorganisation.
            Their content now lives under /mihrab (Quran/Dhikr/Sunnah/
            Literature) which is one tap away in the bottom nav. The
            home page is back to answering only "what should I do
            right now?" — prayer times, weather, current sunnah,
            ummah pulse, and saved locations. */}
        {/* Universal Knowledge Archive — entry card */}
        <motion.section variants={item} aria-labelledby="home-archive-h">
          <h2 id="home-archive-h" className="sr-only">الأرشيف المعرفي</h2>
          <button
            onClick={() => navigate('/archive')}
            className="w-full text-start rounded-2xl p-4 border border-primary/25 bg-primary/5 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">الأرشيف المعرفي</h3>
                  <span className="font-mono text-[9px] text-primary/60 tracking-wider">№ 000001</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                  اقترح موضوعاً، اختر عمقاً، واحصل على مونوغراف كامل مفهرس.
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        </motion.section>

        {/* PKM — personal knowledge base entry card */}
        <motion.section variants={item} aria-labelledby="home-pkm-h">
          <h2 id="home-pkm-h" className="sr-only">{language === 'ar' ? 'مذكّرتي' : 'Mein Wissen'}</h2>
          <AppCard
            as="button"
            pressable
            onClick={() => navigate('/pkm')}
            className="w-full text-start"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground">
                  {language === 'ar' ? 'مذكّرتي' : 'Mein Wissen'}
                </h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                  {language === 'ar'
                    ? 'ملاحظات محلية بوسم متداخل وبحث فوري.'
                    : 'Lokale Notizen mit verschachtelten Tags und Sofortsuche.'}
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </AppCard>
        </motion.section>

        {/* Travel Atlas — tourism guide entry card */}
        <motion.section variants={item} aria-labelledby="home-travel-h">
          <h2 id="home-travel-h" className="sr-only">{language === 'ar' ? 'أطلس الرحلات' : 'Reiseatlas'}</h2>
          <AppCard
            as="button"
            pressable
            onClick={() => navigate('/travel-atlas')}
            className="w-full text-start"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[hsl(var(--live)/0.15)] flex items-center justify-center shrink-0">
                <MapPinned className="w-5 h-5 text-[hsl(var(--live))]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground">
                  {language === 'ar' ? 'أطلس الرحلات' : 'Reiseatlas'}
                </h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
                  {language === 'ar'
                    ? 'دليلك الشخصي للأماكن التي تستحق الرحلة.'
                    : 'Dein persönlicher Atlas für Orte, die eine Reise wert sind.'}
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </AppCard>
        </motion.section>

        {/* Made by Amer */}
        <motion.div variants={item} className="flex items-center justify-center gap-2 py-6 mt-4">
          <div className="h-px flex-1 bg-border/40" />
          <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
            {t('footer.madeBy')} <span className="text-primary font-semibold">عامر</span> {t('footer.and')} <span className="text-primary font-semibold">امولة</span> ✦
          </span>
          <div className="h-px flex-1 bg-border/40" />
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
