import { motion } from 'framer-motion';
import { memo } from 'react';

/**
 * Returns Tailwind classes for the tile's 3-tone matte background, border highlight,
 * and hover glow based on its grid index.
 */
export function getTileTheme(_key: string, index: number) {
  const tone = index % 3;
  switch (tone) {
    case 0:
      return {
        bg: 'bg-amber-900/10 dark:bg-amber-900/20',
        border: 'group-hover:border-amber-500/50',
        icon: 'text-amber-700 dark:text-amber-400',
        glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      };
    case 1:
      return {
        bg: 'bg-stone-200/50 dark:bg-stone-800/50',
        border: 'group-hover:border-stone-400/50',
        icon: 'text-stone-700 dark:text-stone-300',
        glow: 'group-hover:shadow-[0_0_20px_rgba(168,162,158,0.15)]',
      };
    case 2:
      return {
        bg: 'bg-rose-900/10 dark:bg-rose-900/20',
        border: 'group-hover:border-rose-500/50',
        icon: 'text-rose-700 dark:text-rose-400',
        glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]',
      };
    default:
      return {
        bg: 'bg-card/40',
        border: 'group-hover:border-primary/50',
        icon: 'text-foreground',
        glow: 'group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
      };
  }
}

function NowBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.circle
        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        cx="100" cy="100" r="50"
        className="fill-emerald-500/20"
      />
    </svg>
  );
}

function QuranBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.path
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
        d="M100 20 L120 80 L180 100 L120 120 L100 180 L80 120 L20 100 L80 80 Z"
        className="fill-none stroke-amber-500 opacity-20"
        strokeWidth="2"
        style={{ originX: "50%", originY: "50%" }}
      />
    </svg>
  );
}

function DhikrBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.circle
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        cx="100" cy="100" r="20"
        className="fill-teal-400 opacity-30"
      />
    </svg>
  );
}

function SunnahBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.path
        animate={{ rotate: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        d="M50 150 Q100 50 150 150 Q100 200 50 150"
        className="fill-none stroke-amber-500 opacity-20"
        strokeWidth="3"
        style={{ originX: "50%", originY: "50%" }}
      />
    </svg>
  );
}

function DiwanBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.path
        animate={{ pathLength: [0, 1, 0] }}
        transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        d="M0 100 Q100 0 200 100"
        className="fill-none stroke-rose-400 opacity-30"
        strokeWidth="4"
      />
    </svg>
  );
}

function WellnessBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.circle
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        cx="100" cy="100" r="60"
        className="fill-cyan-400 opacity-20"
      />
    </svg>
  );
}

function JournalBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.line
        animate={{ x1: [0, 10, 0] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        x1="0" y1="100" x2="200" y2="100"
        className="stroke-violet-300 opacity-40"
        strokeWidth="2"
      />
    </svg>
  );
}

function ChatBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.path
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        d="M50 50 h100 v100 h-100 z"
        className="fill-none stroke-indigo-400 opacity-20"
        strokeWidth="3"
      />
    </svg>
  );
}

function PodcastsBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.line
        animate={{ y1: [40, 20, 40] }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        x1="100" y1="40" x2="100" y2="160"
        className="stroke-blue-400 opacity-30"
        strokeWidth="6"
      />
    </svg>
  );
}

function ReadingBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.rect
        animate={{ y: [45, 55, 45] }}
        transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        x="50" y="50" width="100" height="15"
        className="fill-slate-400 opacity-20"
      />
    </svg>
  );
}

function KnowledgeBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.circle
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
        cx="100" cy="100" r="80"
        strokeDasharray="10 10"
        className="fill-none stroke-amber-400 opacity-20"
        strokeWidth="3"
        style={{ originX: "50%", originY: "50%" }}
      />
    </svg>
  );
}

function ArchiveBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.rect
        animate={{ scaleY: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        x="60" y="60" width="80" height="80"
        className="fill-none stroke-slate-500 opacity-20"
        strokeWidth="3"
        style={{ originX: "50%", originY: "50%" }}
      />
    </svg>
  );
}

function PKMBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.circle
        animate={{ r: [5, 12, 5] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        cx="100" cy="100" r="5"
        className="fill-emerald-400 opacity-40"
      />
    </svg>
  );
}

function AtlasBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.circle
        animate={{ x: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        cx="100" cy="100" r="60"
        className="fill-none stroke-sky-400 opacity-20"
        strokeWidth="3"
      />
    </svg>
  );
}

function GamesBackground() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
      <motion.rect
        animate={{ rotate: 90 }}
        transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        x="80" y="80" width="40" height="40"
        className="fill-rose-400 opacity-30"
        style={{ originX: "50%", originY: "50%" }}
      />
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
    case 'podcasts': return <PodcastsBackground />;
    case 'reading': return <ReadingBackground />;
    case 'knowledge': return <KnowledgeBackground />;
    case 'archive': return <ArchiveBackground />;
    case 'pkm': return <PKMBackground />;
    case 'atlas': return <AtlasBackground />;
    case 'games': return <GamesBackground />;
    default: return null;
  }
});
