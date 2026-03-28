import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MapPin, Plus, Trash2, Navigation, Clock } from 'lucide-react';

interface SavedLocation {
  id: string;
  lat: number;
  lng: number;
  label: string;
  description: string;
  timestamp: number;
}

export default function LocationSaver() {
  const { t } = useApp();
  const [locations, setLocations] = useState<SavedLocation[]>(() => {
    const saved = localStorage.getItem('saved-locations');
    return saved ? JSON.parse(saved) : [];
  });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    localStorage.setItem('saved-locations', JSON.stringify(locations));
  }, [locations]);

  const saveCurrentLocation = () => {
    setSaving(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPendingCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowForm(true);
        setSaving(false);
      },
      () => {
        // Fallback for demo
        setPendingCoords({ lat: 52.52, lng: 13.405 });
        setShowForm(true);
        setSaving(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const confirmSave = () => {
    if (!pendingCoords) return;
    const loc: SavedLocation = {
      id: Date.now().toString(),
      lat: pendingCoords.lat,
      lng: pendingCoords.lng,
      label: label || `${t('location.title')} ${locations.length + 1}`,
      description,
      timestamp: Date.now(),
    };
    setLocations(prev => [loc, ...prev]);
    setShowForm(false);
    setLabel('');
    setDescription('');
    setPendingCoords(null);
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-accent-foreground" />
        </div>
        <h3 className="font-display font-semibold text-foreground flex-1">{t('location.title')}</h3>
      </div>

      {/* Save button */}
      {!showForm && (
        <button
          onClick={saveCurrentLocation}
          disabled={saving}
          className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-medium flex items-center justify-center gap-2 mb-4 hover:opacity-90 transition-opacity disabled:opacity-50"
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
      {showForm && pendingCoords && (
        <div className="space-y-2 mb-4 p-3 bg-secondary rounded-xl animate-scale-in">
          <div className="text-xs text-muted-foreground">
            {t('location.lat')}: {pendingCoords.lat.toFixed(6)} | {t('location.lng')}: {pendingCoords.lng.toFixed(6)}
          </div>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={t('location.label')}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('location.description')}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none"
          />
          <div className="flex gap-2">
            <button onClick={confirmSave} className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">
              <Plus className="w-4 h-4 inline-block me-1" />{t('location.save')}
            </button>
            <button onClick={() => { setShowForm(false); setPendingCoords(null); }} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Saved locations list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('location.empty')}</p>
        ) : (
          locations.map(loc => (
            <div key={loc.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground">{loc.label}</div>
                {loc.description && <div className="text-xs text-muted-foreground">{loc.description}</div>}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDate(loc.timestamp)}
                </div>
                <div className="text-[10px] text-primary/70 mt-0.5">
                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </div>
              </div>
              <button
                onClick={() => deleteLocation(loc.id)}
                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
