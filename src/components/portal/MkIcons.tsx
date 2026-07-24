/**
 * MkIcons — the modkeys icon language, ported to amv.life.
 *
 * Quoted from `thebuggeddev/modkeys`: 24×24 viewBox, `fill="none"`,
 * `stroke="currentColor"`, hairline 1.7–1.8 weight, round caps and joins,
 * strictly monochrome (colour never lives in the glyph, only in the
 * surface behind it). Several glyphs (logo mark, sun, moon, cart, user,
 * arrow, bookmark, chevrons, spin, plus, pencil) are the reference marks;
 * the domain glyphs (house, book, pulse, message, compass, crown, dice…)
 * are drawn in the same idiom so the set stays one family.
 */
import * as React from 'react';

type P = { className?: string; size?: number; strokeWidth?: number };

function Svg({
  className,
  size = 20,
  strokeWidth = 1.7,
  children,
}: P & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* ── brand mark: rounded square + inner filled square (modkeys logo) ── */
export const MkLogo = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
    <rect x="7" y="11" width="6" height="6" rx="1.5" fill="currentColor" stroke="none" />
  </Svg>
);

/* ── domain glyphs (the seven apps) ── */
export const MkHouse = (p: P) => (
  <Svg {...p}>
    <path d="M4 10.5L12 4l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 10v9.5h12V10" strokeLinejoin="round" />
    <path d="M10 19.5v-5h4v5" strokeLinejoin="round" />
  </Svg>
);

export const MkBook = (p: P) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 015.5 4H10a2 2 0 012 2v13a1.7 1.7 0 00-1.7-1.7H4z" strokeLinejoin="round" />
    <path d="M20 5.5A1.5 1.5 0 0018.5 4H14a2 2 0 00-2 2v13a1.7 1.7 0 011.7-1.7H20z" strokeLinejoin="round" />
  </Svg>
);

export const MkPulse = (p: P) => (
  <Svg {...p}>
    <path
      d="M20.4 7.6a4.3 4.3 0 00-7.3-2.2L12 6.5l-1.1-1.1A4.3 4.3 0 003.6 9c0 4.4 5.3 7.7 8.4 10.4 3.1-2.7 8.4-6 8.4-10.4"
      strokeLinejoin="round"
    />
    <path d="M6.5 11.6h2.6l1.3-2.2 1.9 4.3 1.4-2.1h2.9" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const MkMessage = (p: P) => (
  <Svg {...p}>
    <path
      d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7A2.5 2.5 0 0117.5 16H9l-5 4z"
      strokeLinejoin="round"
    />
    <path d="M8.5 8.7h7M8.5 11.7h4" strokeLinecap="round" />
  </Svg>
);

export const MkCompass = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.6 9.4l-1.5 4.1a1 1 0 01-.6.6l-4.1 1.5 1.5-4.1a1 1 0 01.6-.6z" strokeLinejoin="round" />
  </Svg>
);

export const MkCrown = (p: P) => (
  <Svg {...p}>
    <path
      d="M3.5 7.5l3.2 3.1L12 5l5.3 5.6 3.2-3.1-1.6 10H5.1z"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
);

export const MkDice = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M8.4 8.4h.01M15.6 8.4h.01M12 12h.01M8.4 15.6h.01M15.6 15.6h.01" strokeLinecap="round" strokeWidth={2.4} />
  </Svg>
);

/* ── chrome ── */
export const MkSun = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <circle cx="12" cy="12" r="4" />
    <path
      d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
      strokeLinecap="round"
    />
  </Svg>
);

export const MkMoon = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <path d="M20.5 14.5A8.5 8.5 0 119.5 3.5a7 7 0 1011 11z" strokeLinejoin="round" />
  </Svg>
);

export const MkUser = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <circle cx="12" cy="9" r="3.4" />
    <path d="M5.5 19.2a7.5 7.5 0 0113 0" strokeLinecap="round" />
  </Svg>
);

export const MkGear = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.1" />
    <path
      d="M12 3.2l1 2.3 2.5-.5 1 2.3 2.3 1-.5 2.5 1.7 1.9-1.7 1.9.5 2.5-2.3 1-1 2.3-2.5-.5-1 2.3-1-2.3-2.5.5-1-2.3-2.3-1 .5-2.5L3.5 12.7l1.7-1.9-.5-2.5 2.3-1 1-2.3 2.5.5z"
      strokeLinejoin="round"
    />
  </Svg>
);

export const MkArrow = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const MkChevronNext = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const MkChevronPrev = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const MkCheck = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 2.4}>
    <path d="M5.5 12.5l4 4 9-9" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const MkBookmark = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <path d="M17.5 21l-5.5-4-5.5 4V5a2 2 0 012-2h7a2 2 0 012 2z" strokeLinejoin="round" />
  </Svg>
);

export const MkSpin = (p: P) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 1.8}>
    <path d="M21 12a9 9 0 11-2.64-6.36L21 8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const MkGridView = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
  </Svg>
);

export const MkListView = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="6" rx="2" />
    <rect x="3.5" y="13.5" width="17" height="6" rx="2" />
  </Svg>
);

/* ── quick-link glyphs ── */
export const MkClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.4V12l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const MkCloudSun = (p: P) => (
  <Svg {...p}>
    <circle cx="8.5" cy="8" r="3" />
    <path d="M8.5 2.6v1.4M3.1 8h1.4M4.7 4.2l1 1M12.3 4.2l-1 1" strokeLinecap="round" />
    <path
      d="M9 19.5h8.4a2.6 2.6 0 000-5.2 4 4 0 00-7.6-1.1A3.15 3.15 0 009 19.5z"
      strokeLinejoin="round"
    />
  </Svg>
);

export const MkMic = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="10.5" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6" strokeLinecap="round" />
  </Svg>
);

export const MkPencil = (p: P) => (
  <Svg {...p}>
    <path
      d="M14.5 4.5l5 5M4 20l1.2-4.2 9.5-9.5a1.8 1.8 0 012.5 0l1 1a1.8 1.8 0 010 2.5L8.7 19.3 4 20z"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
);

export const MkStar = (p: P) => (
  <Svg {...p}>
    <path
      d="M12 4l2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.8 9.6 9z"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </Svg>
);

export const MkLayers = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5l8.5 4.3-8.5 4.3L3.5 7.8z" strokeLinejoin="round" />
    <path d="M3.5 12.2l8.5 4.3 8.5-4.3M3.5 16.4l8.5 4.1 8.5-4.1" strokeLinejoin="round" strokeLinecap="round" />
  </Svg>
);

export const MkPlus = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
  </Svg>
);
