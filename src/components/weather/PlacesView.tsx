/**
 * PlacesView — saved-locations panel for the Weather hub. Stores up
 * to 4 favourite cities in `localStorage` (no backend round-trip
 * needed); the current device location always renders at the top as
 * an immovable "Current" card so the user can compare deltas at a
 * glance.
 */
import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Sun, CloudSun, Cloud, CloudFog, CloudRain,
  CloudDrizzle, CloudSnow, CloudLightning, CloudHail, MoonStar,
  type LucideIcon } from '@/lib/icons';
import type { WeatherData } from '@/lib/weather/types';

interface SavedPlace { id: string; name: string; }

const KEY = 'weather_saved_places';

function loadPlaces(): SavedPlace[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(p => p && typeof p.id === 'string') : [];
  } catch { return []; }
}
function savePlaces(list: SavedPlace[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 4))); } catch { /* noop */ }
}

const ICON_BY_CODE = (code: number, isDay = true): LucideIcon => {
  if (code === 0)                 return isDay ? Sun : MoonStar;
  if (code === 1 || code === 2)   return isDay ? CloudSun : MoonStar;
  if (code === 3)                 return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57)   return CloudDrizzle;
  if (code >= 61 && code <= 67)   return CloudRain;
  if (code >= 71 && code <= 77)   return CloudSnow;
  if (code >= 80 && code <= 82)   return CloudRain;
  if (code >= 85 && code <= 86)   return CloudSnow;
  if (code === 96 || code === 99) return CloudHail;
  if (code >= 95)                 return CloudLightning;
  return Sun;
};

export default function PlacesView({ data, isAr }: { data: WeatherData; isAr: boolean }) {
  const [places, setPlaces] = useState<SavedPlace[]>(() => loadPlaces());
  const [draft, setDraft] = useState('');

  useEffect(() => { savePlaces(places); }, [places]);

  const addPlace = () => {
    const name = draft.trim();
    if (!name) return;
    if (places.length >= 4) return;
    if (places.some(p => p.name.toLowerCase() === name.toLowerCase())) { setDraft(''); return; }
    setPlaces(prev => [...prev, { id: `${Date.now()}`, name }]);
    setDraft('');
  };

  const removePlace = (id: string) =>
    setPlaces(prev => prev.filter(p => p.id !== id));

  const c = data.current;
  const CurrentIcon = ICON_BY_CODE(c.weatherCode, c.isDay);

  return (
    <section className="pt-1 space-y-4">
      <header className="pt-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-400/15 border border-emerald-300/20 inline-flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[28px] font-semibold text-foreground leading-tight tracking-tight">
              {isAr ? 'الأماكن' : 'Places'}
            </h1>
            <p className="text-[14px] text-muted-foreground">
              {isAr ? 'مدنك المفضّلة في مكان واحد' : 'Your favourite cities at a glance'}
            </p>
          </div>
        </div>
      </header>

      {/* Current location card */}
      <div className="rounded-3xl border border-border/40 bg-card/80
                      shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04),inset_0_-1px_0_hsl(0_0%_0%/0.4)]
                      px-4 py-4">
        <p className="text-[10.5px] font-semibold tracking-wider uppercase text-primary mb-2">
          {isAr ? 'موقعي الحالي' : 'Current location'}
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <CurrentIcon className="w-9 h-9 text-foreground/80" strokeWidth={1.7} />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-foreground truncate">
                {data.city || (isAr ? 'موقعك' : 'Your location')}
              </p>
              <p className="text-[11.5px] text-muted-foreground tabular-nums">
                {isAr ? 'الإحساس' : 'Feels'} {Math.round(c.apparentTemperature)}°
              </p>
            </div>
          </div>
          <p className="text-[26px] font-bold text-foreground tabular-nums">{Math.round(c.temperature)}°</p>
        </div>
      </div>

      {/* Saved places list */}
      <div className="space-y-2">
        {places.length === 0 && (
          <p className="text-center text-[12px] text-muted-foreground py-4">
            {isAr ? 'لم تُضف مدن بعد.' : 'No saved cities yet.'}
          </p>
        )}
        {places.map(p => (
          <div key={p.id}
               className="flex items-center gap-3 rounded-2xl border border-border/30 bg-foreground/[0.03] px-3.5 py-3">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="flex-1 min-w-0 truncate text-[14px] font-medium text-foreground">{p.name}</p>
            <button
              type="button"
              onClick={() => removePlace(p.id)}
              aria-label={isAr ? 'حذف' : 'Remove'}
              className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add row */}
      {places.length < 4 && (
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPlace(); }}
            placeholder={isAr ? 'أضف مدينة…' : 'Add a city…'}
            className="flex-1 min-w-0 h-11 rounded-xl bg-foreground/[0.05] border border-border/40 px-3.5 text-[16px] text-foreground placeholder:text-muted-foreground/70"
          />
          <button
            type="button"
            onClick={addPlace}
            disabled={!draft.trim()}
            className="px-4 h-11 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            {isAr ? 'إضافة' : 'Add'}
          </button>
        </div>
      )}

      <p className="text-[10.5px] text-muted-foreground/70 text-center px-4 leading-relaxed pt-2">
        {isAr
          ? 'حتى ٤ مدن. ستظهر بطاقات الطقس الكاملة قريباً.'
          : 'Up to 4 cities. Full weather cards coming soon.'}
      </p>
    </section>
  );
}