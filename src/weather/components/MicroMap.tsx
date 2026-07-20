import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { Compass, Map, MapPin, Navigation } from '@/lib/icons';

interface MicroMapProps {
  lat: number;
  lng: number;
  elevationM?: number;
  ar: boolean;
}

export default function MicroMap({ lat, lng, elevationM = 0, ar }: MicroMapProps) {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    // Generate static/dynamic map URL using public dark styled CartoDB Voyager/Dark Matter with OpenStreetMap
    // We can use cartodb dark_all tiles as a background or we can construct an iframe to display OpenStreetMap embedded with dark filters
    // Using an embedded leaflet/OSM map inside an iframe with dark-mode CSS filters is exceptionally stable, light-weight and completely free
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.055}&type=mapnik&marker=${lat},${lng}`;
    setMapUrl(embedUrl);
  }, [lat, lng]);

  return (
    <section className="relative rounded-[22px] surface-depth overflow-hidden p-4">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-montserrat font-semibold text-[18px] leading-none text-foreground flex items-center gap-2">
          <Map className="w-5 h-5 text-primary" />
          {ar ? 'الخريطة الجوية الحية الداكنة' : 'Dunkle Live-Wetterkarte'}
        </h2>
        <span className="text-[11px] tracking-[0.12em] uppercase text-primary/90 font-bold tabular-nums">
          OSM ENGINE
        </span>
      </header>

      <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-border/40 bg-background/40">
        {/* Dark Styled Map Iframe */}
        <iframe
          title="Micro Live Map"
          width="100%"
          height="100%"
          src={mapUrl}
          style={{
            filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(110%) saturate(80%)',
            border: 0,
            pointerEvents: 'auto',
          }}
          loading="lazy"
        />

        {/* Dynamic Glowing Hotspot overlay on the physical center */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative">
            <motion.div
              animate={{
                scale: [1, 2.5, 1],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -inset-4 rounded-full bg-primary/30 blur-sm"
            />
            <div className="relative w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-background" />
            </div>
          </div>
        </div>

        {/* Float Control badge */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur border border-border/30 px-2.5 py-1.5 rounded-xl shadow-md pointer-events-auto">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-montserrat font-bold text-[11px] text-foreground tabular-nums">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur border border-border/30 px-2.5 py-1.5 rounded-xl shadow-md">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span className="font-montserrat font-bold text-[11px] text-foreground tabular-nums">
              {elevationM} m
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground/90 font-medium leading-relaxed flex items-start gap-1.5">
        <Navigation className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          {ar
            ? 'تتحرك الخريطة الحية تلقائياً لتطابق إحداثيات مدينتك النشطة، مع استخدام مرشح بصري داكن فاخر لحماية العينين والاستقرار.'
            : 'Die Live-Karte bewegt sich automatisch passend zu Ihrer Stadt, mit edlen dunklen Filtern zum Schutz der Augen.'}
        </span>
      </div>
    </section>
  );
}
