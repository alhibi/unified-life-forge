import { motion } from 'framer-motion';
import React, { useEffect } from 'react';

import CurrentTimeSunnah from '@/components/CurrentTimeSunnah';
import PrayerTimes from '@/components/PrayerTimes';
import SEO from '@/components/SEO';
import SmartGreeting from '@/components/SmartGreeting';
import { PageShell } from '@/components/ui/app-shell';
import UmmahPulse from '@/components/UmmahPulse';
import { useApp } from '@/contexts/AppContext';
import WeatherWidget from '@/features/weather/components/WeatherWidget';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { pageItem as item,pageStagger as stagger } from '@/lib/motion';

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

  const { t, } = useApp();

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
        {'SmartHub — لوحتك اليومية لأوقات الصلاة، القرآن، الأذكار، الطقس والتقويم الهجري'}
      </h1>
      <motion.div variants={stagger} initial="hidden" animate="show" className="contents">
        <motion.div variants={item}>
          <SmartGreeting />
        </motion.div>

        <motion.section variants={item} aria-labelledby="home-prayer-h">
          <h2 id="home-prayer-h" className="sr-only">{'أوقات الصلاة'}</h2>
          <PrayerTimes />
        </motion.section>
        <motion.section variants={item} aria-labelledby="home-sunnah-h">
          <h2 id="home-sunnah-h" className="sr-only">{'سنة الوقت الحالي'}</h2>
          <CurrentTimeSunnah />
        </motion.section>
        <motion.section variants={item} aria-labelledby="home-weather-h">
          <h2 id="home-weather-h" className="sr-only">{'الطقس'}</h2>
          <WeatherWidget />
        </motion.section>
        <motion.section variants={item} aria-labelledby="home-ummah-h">
          <h2 id="home-ummah-h" className="sr-only">{'بوصلة القبلة ومواقيت الصلاة حول العالم'}</h2>
          <UmmahPulse />
        </motion.section>
        {/* Tafsir feature card and the IslamicSections grid that used
            to live here have been retired in the IA reorganisation.
            Their content now lives under /mihrab (Quran/Dhikr/Sunnah/
            Literature) which is one tap away in the bottom nav. The
            home page is back to answering only "what should I do
            right now?" — prayer times, weather, current sunnah,
            ummah pulse, and saved locations. */}

        {/* Made by Amer */}
        <motion.div variants={item} className="flex items-center justify-center gap-2 py-6 mt-4">
          <div className="h-px flex-1 bg-border/40" />
          <span className="text-[0.6875rem] text-muted-foreground font-medium tracking-wide">
            {t('footer.madeBy')} <span className="text-primary font-semibold">عامر</span> {t('footer.and')} <span className="text-primary font-semibold">امولة</span> ✦
          </span>
          <div className="h-px flex-1 bg-border/40" />
        </motion.div>
      </motion.div>
    </PageShell>
  );
}
