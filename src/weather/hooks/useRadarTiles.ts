// useRadarTiles — fetches RainViewer tile catalog (independent of main engine).

import { useEffect, useState } from 'react';
import { RainViewerAdapter } from '../sources/RainViewerAdapter';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';

const adapter = new RainViewerAdapter();

export function useRadarTiles(): WeatherSnapshot['radar'] | null {
  const [data, setData] = useState<WeatherSnapshot['radar'] | null>(null);
  useEffect(() => {
    let active = true;
    adapter.fetchPartial({ lat: 0, lng: 0, language: 'en' })
      .then(p => { if (active && p.radar) setData(p.radar as WeatherSnapshot['radar']); })
      .catch(() => { /* swallow */ });
    return () => { active = false; };
  }, []);
  return data;
}
