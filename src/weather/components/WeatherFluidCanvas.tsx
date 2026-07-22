import React, { useEffect, useRef } from 'react';

export type WeatherFluidType = 'rain' | 'snow' | 'wind' | 'clear' | 'storm';

interface WeatherFluidCanvasProps {
  type: WeatherFluidType;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life?: number;
  maxLife?: number;
}

export default function WeatherFluidCanvas({ type, className = '' }: WeatherFluidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; vx: number; vy: number; lastX: number; lastY: number }>({
    x: -1000,
    y: -1000,
    vx: 0,
    vy: 0,
    lastX: -1000,
    lastY: -1000,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || 300);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || 300;
    };

    window.addEventListener('resize', handleResize);

    // Initialize particles based on weather type
    const particles: Particle[] = [];
    const maxParticles = type === 'rain' ? 80 : type === 'storm' ? 120 : type === 'snow' ? 60 : type === 'wind' ? 40 : 15;

    const createParticle = (isInit = false): Particle => {
      const pX = Math.random() * width;
      const pY = isInit ? Math.random() * height : -10;

      switch (type) {
        case 'rain':
          return {
            x: pX,
            y: pY,
            vx: -0.5 - Math.random() * 1.5,
            vy: 6 + Math.random() * 4,
            size: 1 + Math.random() * 1.5,
            alpha: 0.2 + Math.random() * 0.4,
            color: '147, 197, 253', // Blue-300
          };
        case 'storm':
          return {
            x: pX,
            y: pY,
            vx: -2 - Math.random() * 3,
            vy: 10 + Math.random() * 6,
            size: 1 + Math.random() * 2,
            alpha: 0.3 + Math.random() * 0.5,
            color: '191, 219, 254', // Blue-200
          };
        case 'snow':
          return {
            x: pX,
            y: pY,
            vx: -0.5 + Math.random() * 1,
            vy: 0.8 + Math.random() * 1.2,
            size: 1.5 + Math.random() * 3,
            alpha: 0.3 + Math.random() * 0.5,
            color: '255, 255, 255',
          };
        case 'wind':
          return {
            x: pX,
            y: Math.random() * height,
            vx: 3 + Math.random() * 4,
            vy: -0.2 + Math.random() * 0.4,
            size: 15 + Math.random() * 25,
            alpha: 0.03 + Math.random() * 0.05,
            color: '226, 232, 240', // Slate-200
            life: 0,
            maxLife: 100 + Math.random() * 150,
          };
        case 'clear':
        default:
          return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: -0.2 + Math.random() * 0.4,
            vy: -0.2 + Math.random() * 0.4,
            size: 2 + Math.random() * 4,
            alpha: 0.1 + Math.random() * 0.15,
            color: '201, 168, 76', // Copper-Gold #C9A84C
            life: 0,
            maxLife: 150 + Math.random() * 200,
          };
      }
    };

    // Populate initially
    for (let i = 0; i < maxParticles; i++) {
      particles.push(createParticle(true));
    }

    // Animation Loop
    const tick = () => {
      // Clear canvas with transparent clear to let background show through
      ctx.clearRect(0, 0, width, height);

      // Track mouse momentum decay
      const mouse = mouseRef.current;
      mouse.vx *= 0.92;
      mouse.vy *= 0.92;

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply mouse interaction force
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          p.vx += mouse.vx * force * 0.12;
          p.vy += mouse.vy * force * 0.12;
        }

        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Life updates for wind or clear ambient particles
        if (p.life !== undefined && p.maxLife !== undefined) {
          p.life++;
          if (p.life >= p.maxLife) {
            particles[i] = createParticle(false);
            continue;
          }
        }

        // Draw particle
        ctx.beginPath();
        if (type === 'rain' || type === 'storm') {
          // Lines for falling rain
          ctx.strokeStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.lineWidth = p.size;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.5, p.y + p.vy * 1.5);
          ctx.stroke();
        } else if (type === 'wind') {
          // Long horizontal wind lines
          const currentAlpha = p.alpha * Math.sin((p.life! / p.maxLife!) * Math.PI);
          ctx.strokeStyle = `rgba(${p.color}, ${currentAlpha})`;
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.size, p.y);
          ctx.stroke();
        } else if (type === 'clear') {
          // Glowing warm ambient bubbles
          const currentAlpha = p.alpha * Math.sin((p.life! / p.maxLife!) * Math.PI);
          ctx.fillStyle = `rgba(${p.color}, ${currentAlpha})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Circular snow flakes
          ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bounds checks
        if (type === 'wind') {
          if (p.x > width + p.size) {
            p.x = -p.size;
            p.y = Math.random() * height;
          }
        } else {
          if (p.y > height + 10 || p.x < -10 || p.x > width + 10) {
            particles[i] = createParticle(false);
          }
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    // Begin Animation Loop
    tick();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [type]);

  // Touch and Mouse Move handlers to feed dynamic interactive currents
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const mouse = mouseRef.current;
    if (mouse.lastX !== -1000) {
      mouse.vx = x - mouse.lastX;
      mouse.vy = y - mouse.lastY;
    }
    mouse.x = x;
    mouse.y = y;
    mouse.lastX = x;
    mouse.lastY = y;
  };

  const handlePointerLeave = () => {
    const mouse = mouseRef.current;
    mouse.x = -1000;
    mouse.y = -1000;
    mouse.lastX = -1000;
    mouse.lastY = -1000;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`absolute inset-0 pointer-events-auto select-none opacity-85 mix-blend-screen z-0 ${className}`}
      style={{
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform',
        contain: 'strict',
      }}
    />
  );
}
