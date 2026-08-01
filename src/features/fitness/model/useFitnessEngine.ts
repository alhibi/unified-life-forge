import { useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { useFitnessStore } from '@/stores/fitnessStore';
import { useAuthStore } from '@/stores/authStore';
import { GeoCoordinate } from '@/utils/validation/schemas';
import { estimateCalories } from '../useActivityTracking';
export function useFitnessEngine() {
  const store = useFitnessStore();
  const user = useAuthStore(state => state.user);
  useEffect(() => {
    let watchId: string | null = null;
    const setupGeolocation = async () => {
      if (store.isTracking) {
        try {
          const permissions = await Geolocation.checkPermissions();
          if (permissions.location !== 'granted') await Geolocation.requestPermissions();
          watchId = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, (position, err) => {
            if (err) return;
            if (position) {
              const coord: GeoCoordinate = { lat: position.coords.latitude, lng: position.coords.longitude, alt: position.coords.altitude, timestamp: new Date(position.timestamp).toISOString() };
              store.addCoordinate(coord);
            }
          });
        } catch (err) { }
      }
    };
    setupGeolocation();
    return () => { if (watchId) Geolocation.clearWatch({ id: watchId }).catch(()=>{}); };
  }, [store.isTracking, store.addCoordinate]);
  return { ...store, startTracking: (type: 'walking' | 'running' | 'cycling') => { if (!user) return; store.startActivity(type, user.id); }, stopTracking: () => { store.stopActivity(); }, currentCalories: store.currentActivity ? estimateCalories(store.currentActivity.type as 'walking' | 'running', Math.floor((new Date().getTime() - new Date(store.currentActivity.start_time).getTime()) / 1000), 70) : 0 };
}
