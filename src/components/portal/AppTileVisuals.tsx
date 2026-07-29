import { memo } from 'react';

/**
 * Returns Tailwind classes for the tile's background gradient, border highlight,
 * icon container, and hover glow based on the app's key.
 */
export function getTileTheme(key: string) {
  switch (key) {
    case 'now':
      return {
        bg: 'bg-gradient-to-br from-emerald-900/40 to-slate-900/60',
        border: 'group-hover:border-emerald-500/50',
        icon: 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 group-hover:text-emerald-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      };
    case 'quran':
      return {
        bg: 'bg-gradient-to-br from-slate-900/80 to-blue-950/80',
        border: 'group-hover:border-[#D4AF37]/50',
        icon: 'bg-[#D4AF37]/15 text-[#D4AF37] group-hover:bg-[#D4AF37]/25',
        glow: 'group-hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]',
      };
    case 'dhikr':
      return {
        bg: 'bg-gradient-to-br from-teal-900/40 to-slate-900/60',
        border: 'group-hover:border-teal-500/50',
        icon: 'bg-teal-500/20 text-teal-400 group-hover:bg-teal-500/30 group-hover:text-teal-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]',
      };
    case 'sunnah':
      return {
        bg: 'bg-gradient-to-br from-amber-900/30 to-lime-900/30',
        border: 'group-hover:border-amber-500/50',
        icon: 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30 group-hover:text-amber-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      };
    case 'diwan':
      return {
        bg: 'bg-gradient-to-br from-rose-950/50 to-violet-950/50',
        border: 'group-hover:border-rose-500/50',
        icon: 'bg-rose-500/20 text-rose-400 group-hover:bg-rose-500/30 group-hover:text-rose-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]',
      };
    case 'wellness':
      return {
        bg: 'bg-gradient-to-br from-emerald-950/60 to-cyan-950/60',
        border: 'group-hover:border-cyan-400/50',
        icon: 'bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30 group-hover:text-cyan-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
      };
    case 'journal':
      return {
        bg: 'bg-gradient-to-br from-orange-950/50 to-violet-950/60',
        border: 'group-hover:border-orange-500/50',
        icon: 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500/30 group-hover:text-orange-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
      };
    case 'chat':
      return {
        bg: 'bg-gradient-to-br from-indigo-950/60 to-purple-950/60',
        border: 'group-hover:border-indigo-400/50',
        icon: 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30 group-hover:text-indigo-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(129,140,248,0.15)]',
      };
    default:
      return {
        bg: 'bg-card/40',
        border: 'group-hover:border-primary/50',
        icon: 'bg-secondary text-foreground group-hover:bg-secondary/80',
        glow: 'group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
      };
  }
}

function NowBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 200 200" preserveAspectRatio="none">
      <defs>
        <radialGradient id="now-rays" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="-20" r="150" fill="url(#now-rays)" className="text-emerald-300" />
      <path d="M100 -20 L20 200 M100 -20 L60 200 M100 -20 L100 200 M100 -20 L140 200 M100 -20 L180 200" stroke="currentColor" strokeWidth="0.5" className="text-emerald-200" />
    </svg>
  );
}

function QuranBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.07]" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <pattern id="quran-star" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M20 0 L25 15 L40 20 L25 25 L20 40 L15 25 L0 20 L15 15 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#D4AF37]" />
        <circle cx="20" cy="20" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[#D4AF37]" />
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#quran-star)" />
    </svg>
  );
}

function DhikrBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 200 100" preserveAspectRatio="none">
      <path d="M0,50 Q50,20 100,50 T200,50" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-400 opacity-50" />
      <path d="M0,60 Q50,30 100,60 T200,60" fill="none" stroke="currentColor" strokeWidth="1" className="text-teal-300 opacity-30" />
      <circle cx="25" cy="42" r="3" fill="currentColor" className="text-teal-200" />
      <circle cx="75" cy="42" r="3" fill="currentColor" className="text-teal-200" />
      <circle cx="125" cy="42" r="3" fill="currentColor" className="text-teal-200" />
      <circle cx="175" cy="42" r="3" fill="currentColor" className="text-teal-200" />
    </svg>
  );
}

function SunnahBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 200 200" preserveAspectRatio="none">
      <path d="M0 200 Q 100 100 200 200" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500" />
      <path d="M20 200 Q 100 120 180 200" fill="none" stroke="currentColor" strokeWidth="1" className="text-lime-500" />
      <path d="M40 200 Q 100 140 160 200" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-amber-400" />
      <circle cx="100" cy="180" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-amber-300" />
    </svg>
  );
}

function DiwanBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.12]" viewBox="0 0 200 100" preserveAspectRatio="none">
      <path d="M-20,120 Q60,-20 120,50 T220,10" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-400" />
      <path d="M0,100 Q80,0 140,40 T240,20" fill="none" stroke="currentColor" strokeWidth="1" className="text-violet-400" />
      <path d="M60,40 C 70,30 90,30 100,50 C 110,70 130,80 150,60" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose-300" strokeLinecap="round" />
    </svg>
  );
}

function WellnessBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-15" viewBox="0 0 200 100" preserveAspectRatio="none">
      <path d="M0,50 L40,50 L50,20 L70,80 L80,50 L200,50" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400" strokeLinejoin="round" />
      <path d="M0,60 L35,60 L45,30 L65,90 L75,60 L200,60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-400" strokeLinejoin="round" />
    </svg>
  );
}

function JournalBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 200 200" preserveAspectRatio="none">
      <pattern id="journal-lines" x="0" y="0" width="200" height="20" patternUnits="userSpaceOnUse">
        <line x1="0" y1="19" x2="200" y2="19" stroke="currentColor" strokeWidth="1" className="text-orange-300" />
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#journal-lines)" />
      <circle cx="30" cy="50" r="1" fill="currentColor" className="text-violet-300" />
      <circle cx="150" cy="30" r="1.5" fill="currentColor" className="text-violet-300" />
      <circle cx="100" cy="120" r="1" fill="currentColor" className="text-violet-300" />
      <circle cx="180" cy="150" r="2" fill="currentColor" className="text-violet-300" />
    </svg>
  );
}

function ChatBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 200 200" preserveAspectRatio="none">
      <path d="M40,140 C 40,90 120,90 120,140 C 120,190 40,190 40,140 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400" />
      <path d="M40,170 L 20,180 L 30,160" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400" strokeLinejoin="round" />

      <path d="M90,60 C 90,20 170,20 170,60 C 170,100 90,100 90,60 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-400" />
      <path d="M170,80 L 190,90 L 180,70" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-400" strokeLinejoin="round" />
    </svg>
  );
}

export const TileBackground = memo(function TileBackground({ appKey }: { appKey: string }) {
  switch (appKey) {
    case 'now': return <NowBackground />;
    case 'quran': return <QuranBackground />;
    case 'dhikr': return <DhikrBackground />;
    case 'sunnah': return <SunnahBackground />;
    case 'diwan': return <DiwanBackground />;
    case 'wellness': return <WellnessBackground />;
    case 'journal': return <JournalBackground />;
    case 'chat': return <ChatBackground />;
    default: return null;
  }
});
