import { AnimatePresence,motion } from 'framer-motion';
import React, { useEffect,useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import { requestDeviceLocation } from '@/hooks/useDeviceLocation';
import { ChevronDown, ChevronUp, Clock, ExternalLink,MapPin, Navigation, Plus, Trash2, X } from '@/lib/icons';
import { reverseGeocode as reverseGeocodeCached } from '@/lib/reverseGeocode';

interface SavedLocation {
  id: string;
  lat: number;
  lng: number;
  label: string;
  description: string;
  timestamp: number;
  address?: string;
  city?: string;
  street?: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; city: string; street: string }> {
  const r = await reverseGeocodeCached(lat, lng, 'en');
  if (r) return { address: r.address, city: r.city, street: r.street };
  return { city: '', street: '', address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
}

import { deleteLocationFromCloud,fetchLocations, saveLocation } from '../api';

export default function LocationSaver() {
  const { t } = useApp();
  const [locations, setLocations] = useState<SavedLocation[]>(() => {
    const saved = localStorage.getItem('saved-locations');
    return saved ? JSON.parse(saved) : [];
  });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingGeo, setPendingGeo] = useState<{ address: string; city: string; street: string } | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const syncLocations = async () => {
      try {
        const cloudLocs = await fetchLocations();
        if (cloudLocs && cloudLocs.length > 0) {
          localStorage.setItem('saved-locations', JSON.stringify(cloudLocs));
          setLocations(cloudLocs);
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncLocations();
  }, []);

  useEffect(() => {
    localStorage.setItem('saved-locations', JSON.stringify(locations));
  }, [locations]);

  const saveCurrentLocation = async () => {
    setSaving(true);
    // Route through the singleton hook so the same coordinates are
    // persisted to `lastLocation` (and broadcast to weather / prayer
    // widgets) without us having to manage a parallel
    // `getCurrentPosition` call. The hook handles permission denial,
    // OS errors, and the 8 s soft timeout for us.
    const granted = await requestDeviceLocation();
    // If the user denied / the request timed out, the hook returns the
    // last cached value (or Mecca). Either way we still want to seed
    // the form so the user can manually edit — preserve historic
    // behavior of falling back to Berlin in the totally-cold case.
    const coords = granted ?? { lat: 52.52, lng: 13.405 };
    setPendingCoords(coords);
    const geo = await reverseGeocode(coords.lat, coords.lng);
    setPendingGeo(geo);
    setLabel(geo.street || geo.city || '');
    setShowForm(true);
    setSaving(false);
  };

  const confirmSave = () => {
    if (!pendingCoords || !pendingGeo) return;
    const loc: SavedLocation = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      lat: pendingCoords.lat,
      lng: pendingCoords.lng,
      label: label || pendingGeo.city || `${t('location.title')} ${locations.length + 1}`,
      description,
      timestamp: Date.now(),
      address: pendingGeo.address,
      city: pendingGeo.city,
      street: pendingGeo.street,
    };
    setLocations(prev => [loc, ...prev]);
    saveLocation(loc).catch(console.error);
    setShowForm(false);
    setLabel('');
    setDescription('');
    setPendingCoords(null);
    setPendingGeo(null);
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    deleteLocationFromCloud(id).catch(console.error);
    if (expandedId === id) setExpandedId(null);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-primary stroke-[1.8]" />
        </div>
        <h3 className="font-semibold text-[0.9375rem] text-foreground flex-1">{t('location.title')}</h3>
      </div>

      {/* Save button */}
      {!showForm && (
        <button
          onClick={saveCurrentLocation}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 mb-4 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {saving ? (
            <span className="animate-pulse">{t('location.saving')}</span>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              {t('location.save')}
            </>
          )}
        </button>
      )}

      {/* Form */}
      {showForm && pendingCoords && pendingGeo && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2.5 mb-4 p-4 bg-secondary/60 rounded-2xl"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="truncate">{pendingGeo.city}{pendingGeo.street ? ` · ${pendingGeo.street}` : ''}</span>
          </div>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={t('location.label')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('location.description')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
          />
          <div className="flex gap-2">
            <button onClick={confirmSave} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-[0.98] transition-transform">
              <Plus className="w-4 h-4 inline-block me-1" />{t('location.save')}
            </button>
            <button
              onClick={() => { setShowForm(false); setPendingCoords(null); setPendingGeo(null); }}
              className="w-11 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Location Cards */}
      <div className="space-y-2.5 max-h-80 overflow-y-auto">
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t('location.empty')}</p>
        ) : (
          locations.map(loc => {
            const isExpanded = expandedId === loc.id;
            return (
              <motion.div
                key={loc.id}
                layout
                className="rounded-2xl bg-secondary/40 overflow-hidden border border-border/30 transition-colors"
              >
                {/* Card Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : loc.id)}
                  className="w-full flex items-center gap-3 p-3.5 text-start hover:bg-secondary/60 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">{loc.label}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {loc.city && (
                        <span className="text-[0.6875rem] text-muted-foreground">{loc.city}</span>
                      )}
                      {loc.street && loc.city && <span className="text-[0.6875rem] text-muted-foreground">·</span>}
                      {loc.street && (
                        <span className="text-[0.6875rem] text-muted-foreground truncate">{loc.street}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[0.625rem] text-muted-foreground/70">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(loc.timestamp)}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-3.5 space-y-2.5">
                        {loc.description && (
                          <p className="text-xs text-muted-foreground bg-background/50 px-3 py-2 rounded-lg">{loc.description}</p>
                        )}
                        {loc.address && (
                          <p className="text-[0.6875rem] text-muted-foreground/80 leading-relaxed">{loc.address}</p>
                        )}
                        {/* Mini Map */}
                        <div className="rounded-xl overflow-hidden border border-border/30 h-36">
                          <iframe
                            title="map"
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${loc.lng - 0.005},${loc.lat - 0.003},${loc.lng + 0.005},${loc.lat + 0.003}&layer=mapnik&marker=${loc.lat},${loc.lng}`}
                          />
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium"
                          >
                            <ExternalLink className="w-3 h-3" />{t('location.openMap')}
                          </a>
                          <button
                            onClick={() => deleteLocation(loc.id)}
                            className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
