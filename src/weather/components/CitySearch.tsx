import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, History, X, Loader } from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';

export interface SearchedCity {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  country_code?: string;
}

interface CitySearchProps {
  onSelectCity: (lat: number, lng: number, name: string) => void;
  ar: boolean;
}

function getFlagEmoji(countryCode: string): string {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return countryCode;
  }
}

export default function CitySearch({ onSelectCity, ar }: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchedCity[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchedCity[]>(() => {
    try {
      const saved = localStorage.getItem('weather-search-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [favorites, setFavorites] = useState<SearchedCity[]>(() => {
    try {
      const saved = localStorage.getItem('weather-favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('weather-search-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('weather-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=${ar ? 'ar' : 'en'}`
        );
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Error fetching geocoding data:', error);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, ar]);

  const handleSelect = (city: SearchedCity) => {
    // Add to history (limit to 5)
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== city.id);
      return [city, ...filtered].slice(0, 5);
    });
    onSelectCity(city.latitude, city.longitude, city.name);
    setQuery('');
    setResults([]);
  };

  const toggleFavorite = (city: SearchedCity, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.some(item => item.id === city.id);
      if (isFav) {
        return prev.filter(item => item.id !== city.id);
      } else {
        return [...prev, city];
      }
    });
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory([]);
  };

  return (
    <div className="relative w-full z-30" dir={ar ? 'rtl' : 'ltr'}>
      <div className="relative flex items-center">
        <Search className="absolute ms-3.5 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ar ? 'البحث عن مدينة أو قرية...' : 'Stadt oder Dorf suchen...'}
          className="w-full ps-10 pe-10 py-3 rounded-2xl bg-card border border-border/60 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute me-3.5 right-0 ltr:right-0 rtl:left-0 rtl:right-auto w-5 h-5 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-background transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {(loading || results.length > 0 || (query.trim().length === 0 && (favorites.length > 0 || history.length > 0))) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute left-0 right-0 mt-2 p-3 bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-[360px] overflow-y-auto no-scrollbar"
          >
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader className="w-4 h-4 animate-spin text-primary" />
                <span>{ar ? 'جاري البحث في الأرجاء...' : 'Suche in der Welt...'}</span>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground px-2 pb-1.5 border-b border-border/30">
                  {ar ? 'نتائج البحث' : 'Suchergebnisse'}
                </div>
                {results.map((city) => {
                  const isFav = favorites.some(item => item.id === city.id);
                  return (
                    <div
                      key={city.id}
                      onClick={() => handleSelect(city)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                            <span>{city.name}</span>
                            {city.country_code && (
                              <span className="text-base" title={city.country}>
                                {getFlagEmoji(city.country_code)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-foreground/80 font-semibold truncate tabular-nums">
                            {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                            {city.elevation !== undefined && (
                              <span className="ms-1.5 text-primary text-[10px] font-bold">
                                ({Math.round(city.elevation)}m)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(city, e)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-secondary/60 ${isFav ? 'text-primary' : 'text-muted-foreground/45'}`}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-primary' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && query.trim().length === 0 && (
              <div className="space-y-4">
                {favorites.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground px-2 pb-1.5 border-b border-border/30 flex items-center justify-between">
                      <span>{ar ? 'المدن المفضلة' : 'Favoriten'}</span>
                      <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                    </div>
                    {favorites.map((city) => (
                      <div
                        key={city.id}
                        onClick={() => handleSelect(city)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MapPin className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                              <span>{city.name}</span>
                              {city.country_code && (
                                <span className="text-base" title={city.country}>
                                  {getFlagEmoji(city.country_code)}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-foreground/80 font-semibold truncate tabular-nums">
                              {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                              {city.elevation !== undefined && (
                                <span className="ms-1.5 text-primary text-[10px] font-bold">
                                  ({Math.round(city.elevation)}m)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => toggleFavorite(city, e)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-primary transition-colors hover:bg-secondary/60"
                        >
                          <Star className="w-4 h-4 fill-primary" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {history.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground px-2 pb-1.5 border-b border-border/30 flex items-center justify-between">
                      <span>{ar ? 'عمليات البحث الأخيرة' : 'Letzte Suchen'}</span>
                      <button
                        onClick={clearHistory}
                        className="text-[9px] lowercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {ar ? 'مسح السجل' : 'Verlauf löschen'}
                      </button>
                    </div>
                    {history.map((city) => {
                      const isFav = favorites.some(item => item.id === city.id);
                      return (
                        <div
                          key={city.id}
                          onClick={() => handleSelect(city)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary/40 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <History className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                                <span>{city.name}</span>
                                {city.country_code && (
                                  <span className="text-base" title={city.country}>
                                    {getFlagEmoji(city.country_code)}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-foreground/80 font-semibold truncate tabular-nums">
                                {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                                {city.elevation !== undefined && (
                                  <span className="ms-1.5 text-primary text-[10px] font-bold">
                                    ({Math.round(city.elevation)}m)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => toggleFavorite(city, e)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-secondary/60 ${isFav ? 'text-primary' : 'text-muted-foreground/45'}`}
                          >
                            <Star className={`w-4 h-4 ${isFav ? 'fill-primary' : ''}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
