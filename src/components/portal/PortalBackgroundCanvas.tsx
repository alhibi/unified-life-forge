import { useEffect, useRef } from 'react';

/**
 * PortalBackgroundCanvas — A GPU-accelerated lightweight HTML5 Canvas particle loop
 * simulating "cosmic dust/particles in light beams" floating gracefully in the background.
 * Optimized with requestAnimationFrame and high-density retina rendering support.
 */
export default function PortalBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;

    // Responsive High-DPI layout handling
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Particle definition
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      alpha: number;
      alphaSpeed: number;
      color: string;
    }

    const maxParticles = 40;
    const particles: Particle[] = [];

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: -Math.random() * 0.2 - 0.05, // Upward drifting motion
        alpha: Math.random() * 0.4 + 0.1,
        alphaSpeed: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
        color: Math.random() > 0.7 ? '#B8492E' : '#8d887f', // Copper accent vs organic muted ink tint
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Light ray / beam effect in background
      const gradient = ctx.createRadialGradient(
        width / 2, -100, 10,
        width / 2, 0, Math.max(width, height) * 0.8
      );
      // Beautiful ambient glow centered top
      gradient.addColorStop(0, 'rgba(184, 73, 46, 0.025)'); // Copper warmth
      gradient.addColorStop(0.5, 'rgba(138, 91, 61, 0.008)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw and animate particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Motion update
        p.x += p.x > width || p.x < 0 ? -p.x + (p.x < 0 ? width : 0) : p.speedX;
        p.y += p.speedY;

        // Loop vertical position if out of bounds
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        // Shimmer / Fade breathing update
        p.alpha += p.alphaSpeed;
        if (p.alpha > 0.6 || p.alpha < 0.05) {
          p.alphaSpeed = -p.alphaSpeed;
        }
        // Bound checks
        p.alpha = Math.max(0.05, Math.min(0.6, p.alpha));

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color === '#B8492E'
          ? `rgba(184, 73, 46, ${p.alpha})`
          : `rgba(141, 136, 127, ${p.alpha * 0.7})`;
        ctx.shadowBlur = p.color === '#B8492E' ? 4 : 0;
        ctx.shadowColor = 'rgba(184, 73, 46, 0.3)';
        ctx.fill();
      }

      ctx.shadowBlur = 0; // reset
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-80 dark:opacity-40"
      aria-hidden="true"
    />
  );
}
