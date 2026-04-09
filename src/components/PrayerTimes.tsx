import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Bell } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { fetchPrayerTimings as fetchPrayerTimingsCached } from '@/hooks/usePrayerTimesCache';

interface PrayerTime {
  name: string;
  time: string;
}

const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_LABEL_KEYS: Record<string, string> = {
  Fajr: 'prayer.fajr',
  Dhuhr: 'prayer.dhuhr',
  Asr: 'prayer.asr',
  Maghrib: 'prayer.maghrib',
  Isha: 'prayer.isha',
};

function formatTime12(time24: string, t: (k: string) => string): string {
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? t('prayer.pm') : t('prayer.am');
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function getNextPrayer(prayers: PrayerTime[], t: (k: string) => string): { prayer: PrayerTime | null; remaining: string } {
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
      const remaining = hours > 0 ? `${hours} ${t('prayer.hour')} ${t('prayer.and')} ${mins} ${t('prayer.minute')}` : `${mins} ${t('prayer.minute')}`;
      return { prayer: p, remaining };
    }
  }
  if (prayers.length > 0) {
    const fajr = prayers[0];
    const cleanTime = fajr.time.replace(/\s*\(.*\)/, '');
    const [h, m] = cleanTime.split(':').map(Number);
    const fajrMinutes = h * 60 + m;
    const diff = (24 * 60 - currentMinutes) + fajrMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const remaining = hours > 0 ? `${hours} ${t('prayer.hour')} ${t('prayer.and')} ${mins} ${t('prayer.minute')}` : `${mins} ${t('prayer.minute')}`;
    return { prayer: fajr, remaining };
  }
  return { prayer: null, remaining: '' };
}

export default function PrayerTimes() {
  const { prayerMadhab, latitudeAdjMethod, dstEnabled, t, language } = useApp();
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('');
  const [nextPrayer, setNextPrayer] = useState<{ prayer: PrayerTime | null; remaining: string }>({ prayer: null, remaining: '' });
  const [activePrayer, setActivePrayer] = useState<string | null>(null);

  const schoolParam = prayerMadhab === 'hanafi' ? 1 : 0;
  const latAdjMap: Record<string, number> = { middle: 1, seventh: 2, angle: 3 };
  const latAdjParam = latAdjMap[latitudeAdjMethod] || 3;

  const fetchPrayers = useCallback(async (lat: number, lng: number) => {
    try {
      // Fetch location name (non-blocking)
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${language}`)
        .then(r => r.json())
        .then(geoData => {
          const addr = geoData.address;
          const city = addr?.city || addr?.town || addr?.village || addr?.suburb || addr?.county || '';
          if (city) setLocationName(city);
        })
        .catch(() => {});

      const timings = await fetchPrayerTimingsCached(lat, lng, schoolParam, latAdjParam);
      if (timings) {
        const result: PrayerTime[] = PRAYER_KEYS.map(key => ({
          name: key,
          time: timings[key],
        }));
        setPrayers(result);
      } else {
        setError(t('prayer.error'));
      }
    } catch {
      setError(t('prayer.connectionError'));
    } finally {
      setLoading(false);
    }
  }, [schoolParam, latAdjParam, dstEnabled, language]);

  useEffect(() => {
    const cached = localStorage.getItem('lastLocation');
    if (cached) {
      const { lat, lng } = JSON.parse(cached);
      fetchPrayers(lat, lng);
    } else {
      // Use default location (Makkah) without requesting geolocation on page load
      fetchPrayers(21.4225, 39.8262);
    }
  }, [fetchPrayers]);

  useEffect(() => {
    if (prayers.length === 0) return;
    const update = () => {
      const np = getNextPrayer(prayers, t);
      setNextPrayer(np);
      setActivePrayer(np.prayer?.name || null);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [prayers, t]);

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
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              {locationName && (
                <span className="flex items-center gap-1 text-[11px] opacity-60">
                  <MapPin className="w-3 h-3" />
                  {locationName}
                </span>
              )}
              <span className="text-xs opacity-75">{t('prayer.next')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {nextPrayer.prayer ? t(PRAYER_LABEL_KEYS[nextPrayer.prayer.name]) : ''}
              </span>
              <span className="text-sm opacity-80">
                {t('prayer.remaining')} {nextPrayer.remaining}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        <div className="h-px bg-border mb-4" />

        {/* Prayer times grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {prayers.map((p) => {
            const isActive = p.name === activePrayer;
            return (
              <div
                key={p.name}
                className={`rounded-xl px-1 py-2 text-center transition-all duration-300 ${
                  isActive
                    ? 'bg-primary text-primary-foreground scale-[1.03]'
                    : 'bg-muted/60 text-muted-foreground'
                }`}
              >
                <p className="text-[10px] font-semibold mb-0.5">
                  {t(PRAYER_LABEL_KEYS[p.name])}
                </p>
                <p className={`text-[10px] font-medium tabular-nums ${isActive ? '' : ''}`} dir="ltr">
                  {formatTime12(p.time.replace(/\s*\(.*\)/, ''), t)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
