import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Bell } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
interface PrayerTime {
  name: string;
  nameAr: string;
  time: string;
}

const PRAYER_NAMES = [
  { key: 'Fajr', ar: 'الفجر' },
  { key: 'Dhuhr', ar: 'الظهر' },
  { key: 'Asr', ar: 'العصر' },
  { key: 'Maghrib', ar: 'المغرب' },
  { key: 'Isha', ar: 'العشاء' },
];

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function getNextPrayer(prayers: PrayerTime[]): { prayer: PrayerTime | null; remaining: string } {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const p of prayers) {
    const cleanTime = p.time.replace(/\s*\(.*\)/, '');
    const [h, m] = cleanTime.split(':').map(Number);
    const prayerMinutes = h * 60 + m;
    if (prayerMinutes > currentMinutes) {
      const diff = prayerMinutes - currentMinutes;
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      const remaining = hours > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${mins} دقيقة`;
      return { prayer: p, remaining };
    }
  }
  // All prayers passed, next is Fajr tomorrow
  if (prayers.length > 0) {
    const fajr = prayers[0];
    const cleanTime = fajr.time.replace(/\s*\(.*\)/, '');
    const [h, m] = cleanTime.split(':').map(Number);
    const fajrMinutes = h * 60 + m;
    const diff = (24 * 60 - currentMinutes) + fajrMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const remaining = hours > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${mins} دقيقة`;
    return { prayer: fajr, remaining };
  }
  return { prayer: null, remaining: '' };
}

export default function PrayerTimes() {
  const { prayerMadhab, latitudeAdjMethod, dstEnabled } = useApp();
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('');
  const [nextPrayer, setNextPrayer] = useState<{ prayer: PrayerTime | null; remaining: string }>({ prayer: null, remaining: '' });
  const [activePrayer, setActivePrayer] = useState<string | null>(null);

  // Map madhab to Aladhan school param: 0=Shafii/Hanbali/Maliki, 1=Hanafi
  const schoolParam = prayerMadhab === 'hanafi' ? 1 : 0;
  // Latitude adjustment: 1=middle of night, 2=one seventh, 3=angle based
  const latAdjMap: Record<string, number> = { middle: 1, seventh: 2, angle: 3 };
  const latAdjParam = latAdjMap[latitudeAdjMethod] || 3;

  const fetchPrayers = useCallback(async (lat: number, lng: number) => {
    try {
      const today = new Date();
      const dd = today.getDate();
      const mm = today.getMonth() + 1;
      const yyyy = today.getFullYear();
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=4&school=${schoolParam}&latitudeAdjustmentMethod=${latAdjParam}`
      );
      const data = await res.json();
      if (data.code === 200) {
        const timings = data.data.timings;
        const result: PrayerTime[] = PRAYER_NAMES.map(p => ({
          name: p.key,
          nameAr: p.ar,
          time: timings[p.key],
        }));
        setPrayers(result);
        const meta = data.data.meta;
        if (meta?.timezone) {
          const tz = meta.timezone;
          const city = tz.includes('/') ? tz.split('/').pop()?.replace(/_/g, ' ') : tz;
          setLocationName(city || '');
        }
      } else {
        setError('تعذر جلب مواقيت الصلاة');
      }
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [schoolParam, latAdjParam, dstEnabled]);

  useEffect(() => {
    // Try cached location first for instant load
    const cached = localStorage.getItem('lastLocation');
    if (cached) {
      const { lat, lng } = JSON.parse(cached);
      fetchPrayers(lat, lng);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          localStorage.setItem('lastLocation', JSON.stringify({ lat, lng }));
          fetchPrayers(lat, lng);
        },
        () => {
          if (!cached) fetchPrayers(21.4225, 39.8262);
        },
        { timeout: 5000, maximumAge: 300000 }
      );
    } else if (!cached) {
      fetchPrayers(21.4225, 39.8262);
    }
  }, [fetchPrayers]);

  useEffect(() => {
    if (prayers.length === 0) return;
    const update = () => {
      const np = getNextPrayer(prayers);
      setNextPrayer(np);
      setActivePrayer(np.prayer?.name || null);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [prayers]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-card border border-border p-5 text-card-foreground animate-pulse min-h-[140px]" />
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-destructive/10 border border-destructive/20 p-4 text-destructive text-center text-sm">
        {error}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl bg-card border border-border p-5 text-card-foreground relative overflow-hidden"
    >

      <div className="relative z-10">
        {/* Header: next prayer info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-1.5 mb-0.5">
              {locationName && (
                <span className="flex items-center gap-1 text-[11px] opacity-60">
                  <MapPin className="w-3 h-3" />
                  {locationName}
                </span>
              )}
              <span className="text-xs opacity-75">الصلاة القادمة</span>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm opacity-80">
                متبقي {nextPrayer.remaining}
              </span>
              <span className="text-xl font-bold">
                {nextPrayer.prayer?.nameAr || ''}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center mr-3">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        <div className="h-px bg-border mb-4" />

        {/* Prayer times grid */}
        <div className="grid grid-cols-5 gap-2">
          {prayers.map((p) => {
            const isActive = p.name === activePrayer;
            return (
              <div
                key={p.name}
                className={`rounded-2xl p-2.5 text-center transition-all duration-300 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg scale-[1.03]'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <p className={`text-[11px] font-semibold mb-1`}>
                  {p.nameAr}
                </p>
                <p className={`text-[11px] font-medium tabular-nums ${isActive ? '' : 'opacity-70'}`} dir="ltr">
                  {formatTime12(p.time.replace(/\s*\(.*\)/, ''))}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
