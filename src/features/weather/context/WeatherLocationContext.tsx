import { createContext, ReactNode, useCallback,useContext, useEffect, useState } from 'react';

interface SelectedLocation {
  lat: number;
  lng: number;
  name?: string;
}

interface WeatherLocationContextValue {
  selectedCoords: SelectedLocation | null;
  setSelectedCoords: (coords: SelectedLocation | null) => void;
  clearSelectedCoords: () => void;
}

const WeatherLocationContext = createContext<WeatherLocationContextValue | null>(null);

export function WeatherLocationProvider({ children }: { children: ReactNode }) {
  const [selectedCoords, setSelectedCoordsState] = useState<SelectedLocation | null>(null);

  const setSelectedCoords = useCallback((coords: SelectedLocation | null) => {
    setSelectedCoordsState(coords);
    // Also store in localStorage for persistence across sessions
    if (coords) {
      localStorage.setItem('weather:selectedCoords', JSON.stringify(coords));
    } else {
      localStorage.removeItem('weather:selectedCoords');
    }
  }, []);

  const clearSelectedCoords = useCallback(() => {
    setSelectedCoordsState(null);
    localStorage.removeItem('weather:selectedCoords');
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('weather:selectedCoords');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.lat && parsed.lng) {
          setSelectedCoordsState(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  return (
    <WeatherLocationContext.Provider value={{ selectedCoords, setSelectedCoords, clearSelectedCoords }}>
      {children}
    </WeatherLocationContext.Provider>
  );
}

export function useWeatherLocation() {
  const context = useContext(WeatherLocationContext);
  if (!context) {
    throw new Error('useWeatherLocation must be used within a WeatherLocationProvider');
  }
  return context;
}