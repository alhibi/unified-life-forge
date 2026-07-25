import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RefreshCw, Layers, Wind, Droplets } from '@/lib/icons';

interface RadarMapProps {
  pastTimestamps: number[];
  futureTimestamps: number[];
  tileTemplate: string;
  windSpeedKph: number;
  windDirectionDeg: number;
  precipIntensity: number;
  weatherCode: number;
}

export default function RadarMap({
  pastTimestamps,
  futureTimestamps,
  tileTemplate,
  windSpeedKph,
  windDirectionDeg,
  precipIntensity,
  weatherCode,
}: RadarMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [frameIdx, setFrameIdx] = useState(0);
  const [activeLayer, setActiveLayer] = useState<'radar' | 'particles'>('particles');

  const allFrames = [...pastTimestamps, ...futureTimestamps];

  // Particle Simulation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // Handle resizing
    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
      }
    });
    resizeObserver.observe(canvas);

    // Initialize Particles based on weather conditions
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      type: 'rain' | 'snow' | 'dust' | 'lightning';
      life?: number;
    }

    const particles: Particle[] = [];
    const count = Math.min(350, Math.max(40, Math.round(precipIntensity * 40 + windSpeedKph * 1.5)));

    const getParticleType = (): 'rain' | 'snow' | 'dust' => {
      if (weatherCode >= 71 && weatherCode <= 86) return 'snow';
      if (precipIntensity > 0) return 'rain';
      return 'dust';
    };

    const type = getParticleType();

    // Determine physics vectors from wind and precip
    const angleRad = (windDirectionDeg * Math.PI) / 180;
    const baseVx = Math.sin(angleRad) * (windSpeedKph * 0.12);
    // downward speed
    let baseVy = 0.5;
    if (type === 'rain') baseVy = 6 + precipIntensity * 1.5;
    if (type === 'snow') baseVy = 1 + precipIntensity * 0.3;
    if (type === 'dust') baseVy = 0.2;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: baseVx + (Math.random() - 0.5) * 0.5,
        vy: baseVy + (Math.random() * 0.5),
        size: type === 'snow' ? Math.random() * 2.5 + 1 : type === 'rain' ? Math.random() * 1.5 + 0.8 : Math.random() * 1 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        type
      });
    }

    let lightningTimer = 0;
    let hasLightningNow = false;

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Handle Lightning strikes for thunderstorms (weatherCode >= 95)
      if (weatherCode >= 95) {
        lightningTimer++;
        if (lightningTimer > Math.random() * 280 + 100) {
          hasLightningNow = true;
          lightningTimer = 0;
        }

        if (hasLightningNow) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
          ctx.fillRect(0, 0, width, height);
          hasLightningNow = false; // flashes only one frame
        }
      }

      // Draw subtle background grid/radar arcs
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.05)';
      ctx.lineWidth = 1;
      const center = { x: width / 2, y: height / 2 };
      for (let r = 40; r < width; r += 50) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw sweeping radar arm
      if (activeLayer === 'radar') {
        const angle = (Date.now() / 1500) % (Math.PI * 2);
        ctx.fillStyle = 'rgba(120, 90, 60, 0.08)';
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.arc(center.x, center.y, width * 0.8, angle - 0.4, angle);
        ctx.lineTo(center.x, center.y);
        ctx.fill();
      }

      // Update and Draw Particles
      particles.forEach(p => {
        // Apply wind influence
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around screen
        if (p.y > height) {
          p.y = 0;
          p.x = Math.random() * width;
        }
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.beginPath();
        if (p.type === 'rain') {
          ctx.strokeStyle = `rgba(14, 165, 233, ${p.alpha})`;
          ctx.lineWidth = p.size;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 0.8, p.y + p.vy * 0.8);
          ctx.stroke();
        } else if (p.type === 'snow') {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(180, 140, 100, ${p.alpha * 0.6})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [windSpeedKph, windDirectionDeg, precipIntensity, weatherCode, activeLayer]);

  // Timed Playback Simulation for radar frame timestamps
  useEffect(() => {
    if (!isPlaying || allFrames.length === 0) return;
    const interval = setInterval(() => {
      setFrameIdx(prev => (prev + 1) % allFrames.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, allFrames.length]);

  return (
    <section className="relative rounded-2xl surface-depth overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40" />

      <header className="p-4 pb-1 flex items-center justify-between gap-3">
        <h2 className="font-montserrat font-semibold text-[20px] leading-none text-foreground flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          {activeLayer === 'particles' ? ('محاكي جزيئات الغلاف الحي') : ('الرادار الزمني')}
        </h2>

        <div className="flex bg-background/50 border border-border/40 p-0.5 rounded-lg">
          <button
            onClick={() => setActiveLayer('particles')}
            className={`px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase transition-all ${
              activeLayer === 'particles' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {'الجزيئات والرياح'}
          </button>
          <button
            onClick={() => setActiveLayer('radar')}
            className={`px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase transition-all ${
              activeLayer === 'radar' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {'المسح الراداري'}
          </button>
        </div>
      </header>

      {/* Main Interactive Screen */}
      <div className="relative h-64 w-full bg-background/20 overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {activeLayer === 'radar' && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {tileTemplate ? (
              <div className="text-center bg-card border border-border rounded-xl p-4 max-w-xs animate-fade-in">
                <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">{'تغطية رادار حي'}</div>
                <div className="text-sm font-bold font-montserrat text-foreground mb-3 tabular-nums">
                  {allFrames.length > 0
                    ? new Date(allFrames[frameIdx] * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : '—'}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 rounded-full border border-border bg-secondary flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-primary" /> : <Play className="w-4 h-4 fill-primary" />}
                  </button>
                  <button
                    onClick={() => setFrameIdx(0)}
                    className="w-10 h-10 rounded-full border border-border bg-secondary flex items-center justify-center text-primary active:scale-95 transition-transform"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">{'مسح الرادار غير متوفر حالياً لهذا الموقع'}</div>
            )}
          </div>
        )}

        {/* Ambient Overlay details */}
        <div className="absolute bottom-3 start-3 end-3 flex justify-between text-[10px] text-muted-foreground pointer-events-none">
          <div className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded-md">
            <Wind className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold tabular-nums text-foreground">{windSpeedKph} km/h</span>
            <span className="uppercase text-muted-foreground">{windDirectionDeg}°</span>
          </div>
          <div className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded-md">
            <Droplets className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold tabular-nums text-foreground">{precipIntensity} mm/h</span>
          </div>
        </div>
      </div>
    </section>
  );
}
