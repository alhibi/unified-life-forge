import { memo } from 'react';

/**
 * Returns Tailwind classes for the ticket's 3-tone palette.
 * Colors: gold/tan, grey-white, crimson-red.
 */
export function getTileTheme(key: string, index: number = 0) {
  const tone = index % 3;

  if (tone === 0) {
    // Gold/Tan tone (01, 04, 07, 10, 13)
    return {
      bg: 'bg-[#C8B69A]',
      border: 'border-[#9F8A6B]/30 group-hover:border-[#9F8A6B]/50',
      icon: 'bg-[#8C7654] text-[#EBE3D5]',
      glow: 'group-hover:shadow-[0_0_20px_rgba(200,182,154,0.3)]',
      text: 'text-[#3E2F1B]',
      textMuted: 'text-[#5E4C33]',
      paintingBorder: 'border-[#5E4C33]',
    };
  } else if (tone === 1) {
    // Grey-White tone (02, 05, 08, 11, 14)
    return {
      bg: 'bg-[#D6D6D6]',
      border: 'border-[#A3A3A3]/30 group-hover:border-[#A3A3A3]/50',
      icon: 'bg-[#666666] text-[#E0E0E0]',
      glow: 'group-hover:shadow-[0_0_20px_rgba(214,214,214,0.2)]',
      text: 'text-[#2A2A2A]',
      textMuted: 'text-[#555555]',
      paintingBorder: 'border-[#555555]',
    };
  } else {
    // Crimson-Red tone (03, 06, 09, 12, 15)
    return {
      bg: 'bg-[#7A2125]',
      border: 'border-[#521215]/30 group-hover:border-[#521215]/50',
      icon: 'bg-[#4B1214] text-[#F5E6E6]',
      glow: 'group-hover:shadow-[0_0_20px_rgba(122,33,37,0.4)]',
      text: 'text-[#F5E6E6]',
      textMuted: 'text-[#D4B3B3]',
      paintingBorder: 'border-[#4B1214]',
    };
  }
}

const IMAGES: Record<string, string> = {
  now: 'https://images.unsplash.com/photo-1509653087866-91f6c2ab53f4?auto=format&fit=crop&q=80&w=600', // Classical astronomy/clock
  quran: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=600', // Scholar at book
  dhikr: 'https://images.unsplash.com/photo-1558500282-588494917a26?auto=format&fit=crop&q=80&w=600', // Figure in nature
  sunnah: 'https://images.unsplash.com/photo-1596704987748-0d121bf302f7?auto=format&fit=crop&q=80&w=600', // Botanical
  diwan: 'https://images.unsplash.com/photo-1579603058869-3178c7c9ecf8?auto=format&fit=crop&q=80&w=600', // Scholar writing
  wellness: 'https://images.unsplash.com/photo-1549429712-4299b82142e0?auto=format&fit=crop&q=80&w=600', // Garden classical
  journal: 'https://images.unsplash.com/photo-1580130095874-1a2c3a37ba7a?auto=format&fit=crop&q=80&w=600', // Old desk/quill
  chat: 'https://images.unsplash.com/photo-1606553890259-7ff025d535cd?auto=format&fit=crop&q=80&w=600', // Classical figures conversing
  podcasts: 'https://images.unsplash.com/photo-1548398453-380ff9f91a56?auto=format&fit=crop&q=80&w=600', // Vintage radio vibe
  reading: 'https://images.unsplash.com/photo-1548048026-5a1a941d93d3?auto=format&fit=crop&q=80&w=600', // Library
  knowledge: 'https://images.unsplash.com/photo-1505664159518-86d705c49bba?auto=format&fit=crop&q=80&w=600', // Alchemist/lecture
  archive: 'https://images.unsplash.com/photo-1455390582262-044cdead2708?auto=format&fit=crop&q=80&w=600', // Ancient scrolls
  pkm: 'https://images.unsplash.com/photo-1563804860268-d069eab7ed6f?auto=format&fit=crop&q=80&w=600', // Diagrams/sketches
  atlas: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=600', // Vintage map
  games: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?auto=format&fit=crop&q=80&w=600', // Chess classic
};

export const TileBackground = memo(function TileBackground({ appKey, theme }: { appKey: string, theme: any }) {
  const src = IMAGES[appKey] || IMAGES['now'];

  return (
    <div className={`relative w-full h-[140px] mb-4 border-[3px] p-1 rounded-sm shadow-inner ${theme.paintingBorder}`}>
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]" />
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover filter contrast-125 saturate-50 sepia-[20%] brightness-90 rounded-sm"
      />
    </div>
  );
});
