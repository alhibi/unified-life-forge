import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Leaf } from 'lucide-react';
import { sunnahDetailData } from '@/data/sunnahDetailData';
import type { SunnahDetailItem } from '@/data/sunnahDetailData';

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

function toMinutes(time: string): number {
  const clean = time.replace(/\s*\(.*\)/, '');
  const [h, m] = clean.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentPrayerKey(timings: PrayerTimings | null): { key: string; label: string } {
  if (!timings) {
    // Fallback approximate
    const h = new Date().getHours();
    const m = h * 60 + new Date().getMinutes();
    if (m < 270) return { key: 'before-fajr', label: 'قبل الفجر' };
    if (m < 360) return { key: 'fajr', label: 'الفجر' };
    if (m < 720) return { key: 'duha', label: 'الضحى' };
    if (m < 900) return { key: 'dhuhr', label: 'الظهر' };
    if (m < 1050) return { key: 'asr', label: 'العصر' };
    if (m < 1140) return { key: 'maghrib', label: 'المغرب' };
    return { key: 'isha', label: 'العشاء' };
  }

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const fajr = toMinutes(timings.Fajr);
  const sunrise = toMinutes(timings.Sunrise);
  const dhuhr = toMinutes(timings.Dhuhr);
  const asr = toMinutes(timings.Asr);
  const maghrib = toMinutes(timings.Maghrib);
  const isha = toMinutes(timings.Isha);

  if (nowMin < fajr) return { key: 'before-fajr', label: 'قبل الفجر' };
  if (nowMin < sunrise) return { key: 'fajr', label: 'الفجر' };
  if (nowMin < dhuhr) return { key: 'duha', label: 'الضحى' };
  if (nowMin < asr) return { key: 'dhuhr', label: 'الظهر' };
  if (nowMin < maghrib) return { key: 'asr', label: 'العصر' };
  if (nowMin < isha) return { key: 'maghrib', label: 'المغرب' };
  return { key: 'isha', label: 'العشاء' };
}

export default function CurrentTimeSunnah() {
  const navigate = useNavigate();
  const { dir, prayerMadhab, latitudeAdjMethod } = useApp();
  const [open, setOpen] = useState(false);
  const [timings, setTimings] = useState<PrayerTimings | null>(null);
  const [current, setCurrent] = useState(() => getCurrentPrayerKey(null));

  useEffect(() => {
    const fetchTimings = async (lat: number, lng: number) => {
      try {
        const schoolParam = prayerMadhab === 'hanafi' ? 1 : 0;
        const latAdjMap: Record<string, number> = { middle: 1, seventh: 2, angle: 3 };
        const latAdjParam = latAdjMap[latitudeAdjMethod] || 3;
        const today = new Date();
        const dd = today.getDate();
        const mm = today.getMonth() + 1;
        const yyyy = today.getFullYear();
        const res = await fetch(
          `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=4&school=${schoolParam}&latitudeAdjustmentMethod=${latAdjParam}`
        );
        const data = await res.json();
        if (data.code === 200) {
          const t = data.data.timings;
          setTimings({ Fajr: t.Fajr, Sunrise: t.Sunrise, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha });
        }
      } catch {}
    };

    const cached = localStorage.getItem('lastLocation');
    if (cached) {
      const { lat, lng } = JSON.parse(cached);
      fetchTimings(lat, lng);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchTimings(pos.coords.latitude, pos.coords.longitude),
        () => fetchTimings(21.4225, 39.8262),
        { timeout: 5000, maximumAge: 300000 }
      );
    } else {
      fetchTimings(21.4225, 39.8262);
    }
  }, [prayerMadhab, latitudeAdjMethod]);

  useEffect(() => {
    const isFriday = new Date().getDay() === 5;
    if (isFriday) {
      setCurrent({ key: 'friday', label: 'الجمعة' });
    } else {
      setCurrent(getCurrentPrayerKey(timings));
    }
    const interval = setInterval(() => {
      const isFri = new Date().getDay() === 5;
      if (isFri) {
        setCurrent({ key: 'friday', label: 'الجمعة' });
      } else {
        setCurrent(getCurrentPrayerKey(timings));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [timings]);

  const category = sunnahDetailData[current.key];
  if (!category) return null;

  const items = category.items as SunnahDetailItem[];
  const isFriday = current.key === 'friday';

  return (
    <div className="rounded-2xl bg-card/80 border border-border/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <div className="text-start">
            <h3 className="text-[14px] font-bold text-foreground leading-tight">
              {isFriday ? 'سنن يوم الجمعة' : 'سنن الوقت الحالي'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isFriday ? 'جمعة مباركة' : `وقت ${current.label}`}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground/60" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-0">
              {(isFriday ? items : items.slice(0, 3)).map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/section/timed-sunnah/${current.key}?index=${i}`)}
                  className="w-full flex items-start gap-3 py-2.5 hover:bg-accent/30 rounded-lg px-1 transition-colors"
                >
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${i % 2 === 0 ? 'bg-primary' : 'bg-primary/50'}`} />
                  <p className="text-[13px] text-foreground leading-relaxed font-medium text-start">{item.title}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
