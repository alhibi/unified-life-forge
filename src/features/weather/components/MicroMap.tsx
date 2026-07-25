import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { Compass,Map, MapPin, Navigation } from '@/lib/icons';

interface MicroMapProps {
  lat: number;
  lng: number;
  elevationM?: number;
}

export default function MicroMap({ lat, lng, elevationM = 0, }: MicroMapProps) {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    // OSM embed requires a proper bbox: minLng,minLat,maxLng,maxLat
    const d = 0.06; // ~6-8 km window depending on latitude
    const bbox = [lng - d, lat - d * 0.7, lng + d, lat + d * 0.7].join('%2C');
    const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
    setMapUrl(embedUrl);
  }, [lat, lng]);

  return (
    <section className="relative rounded-2xl surface-depth overflow-hidden p-4">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40" />

      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-[1.125rem] leading-none text-foreground flex items-center gap-2">
          <Map className="w-5 h-5 text-primary" />
          {'الخريطة الجوية الحية الداكنة'}
        </h2>
        <span className="text-[0.6875rem] tracking-[0.12em] uppercase text-primary/90 font-bold tabular-nums">
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
                ease: "easeInOut"
              }}
              className="absolute -inset-4 rounded-full border border-primary/30"
            />
            <div className="relative w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-background" />
            </div>
          </div>
        </div>

        {/* Float Control badge */}
        <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between gap-3 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1.5 rounded-xl pointer-events-auto">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-bold text-[0.6875rem] text-foreground tabular-nums">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1.5 rounded-xl">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span className="font-bold text-[0.6875rem] text-foreground tabular-nums">
              {elevationM} m
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-[0.6875rem] text-muted-foreground/90 font-medium leading-relaxed flex items-start gap-1.5">
        <Navigation className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          {'تتحرك الخريطة الحية تلقائياً لتطابق إحداثيات مدينتك النشطة، مع استخدام مرشح بصري داكن فاخر لحماية العينين والاستقرار.'}
        </span>
      </div>
    </section>
  );
}
