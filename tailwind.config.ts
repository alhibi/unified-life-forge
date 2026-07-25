import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    backdropBlur: {
      // Blur is disabled for application chrome. Opaque surfaces and
      // hairline borders provide cleaner, more predictable separation.
      none: '0',
    },
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        montserrat: ['"Montserrat"', 'system-ui', 'sans-serif'],
        amiri: ['"Amiri"', 'serif'],
        tajawal: ['"Tajawal"', 'sans-serif'],
      },
      fontSize: {
        // Canonical type scale — strictly locked typographic scale.
        // Body-related text uses a strict 1.6x multiplier line-height.
        // Header/display text uses a strict 1.2x multiplier line-height.
        micro: ['11px', { lineHeight: '18px', letterSpacing: '0.005em' }],
        mini: ['12px', { lineHeight: '19px', letterSpacing: '0.003em' }],
        meta: ['13px', { lineHeight: '21px' }],
        body: ['14px', { lineHeight: '22px' }],
        lead: ['16px', { lineHeight: '26px' }],
        title: ['18px', { lineHeight: '22px', letterSpacing: '-0.005em' }],
        display: ['24px', { lineHeight: '29px', letterSpacing: '-0.015em' }],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--error-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      zIndex: {
        // ── Canonical stacking ladder ─────────────────────────────────
        // Never write a raw z-index again: `z-[81]` tells the next reader
        // nothing about what it is meant to sit above. The app previously
        // carried 20 distinct magic values (9999, 9990, 200, 100, 91, 81,
        // 80, 71, 70, 61, 60, …) with no contract between them.
        //
        // The numbers here are exactly the ones already in use, so naming
        // them changed no rendered order. Levels come in pairs where a
        // surface renders its own scrim: `-above` is that surface's content
        // sitting over its own backdrop.
        //
        // The app genuinely stacks four sheets deep (a chat sheet opens a
        // picker, which opens a member list), which is why the ladder is
        // longer than the usual three levels.
        base: '0',
        scrim: '5', // in-page dismiss layer, below `raised` content
        raised: '10', // in-flow layering inside a card / section
        sticky: '20', // sticky sub-headers, list group headers
        header: '30', // page headers
        float: '40', // floating dock, podcast mini-player
        drawer: '50', // first-level dialog / sheet (Radix default)
        'drawer-above': '51',
        sheet: '60', // a sheet opened from a sheet
        'sheet-above': '61',
        picker: '70', // a picker opened from that sheet
        'picker-above': '71',
        nested: '80', // fourth level
        'nested-above': '81',
        deep: '90', // fifth level (member list inside a group sheet)
        'deep-above': '91',
        fullscreen: '100', // full-screen takeover (dhikr focus, browser)
        'fullscreen-above': '110',
        player: '120', // podcast player sheet
        queue: '130', // queue, on top of the player
        overlay: '200', // command palette / global overlay
        lightbox: '200', // image viewer — above every app surface
        toast: '300', // notifications always win
      },
      borderRadius: {
        // Mathematical geometry scale: 6 / 10 / 16 / 24px.
        // NOTE: `xl`, `2xl` and `3xl` all resolve to 24px on purpose so the
        // largest radius has ONE meaning — the codebase used all three
        // interchangeably believing they differed. Prefer `lg` (16px) for
        // cards and `xl` (24px) for sheets and sections.
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
        '2xl': '24px',
        '3xl': '24px',
        input: '10px',
        button: '10px',
        card: '16px',
        section: '24px',
      },
      boxShadow: {
        // The product is intentionally flat. Depth is communicated with
        // surface colour and hairline borders, never decorative shadows.
        // Mapping legacy names to none also neutralises old call sites while
        // they migrate to the shared surface primitives.
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        none: 'none',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0px' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0px' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        // ENTER → ease-out-expo, EXIT → ease-in, INTERACT → spring snappy
        'accordion-down': 'accordion-down 0.28s cubic-bezier(0.19, 1, 0.22, 1)',
        'accordion-up': 'accordion-up 0.22s cubic-bezier(0.4, 0, 1, 1)',
        'fade-in': 'fade-in 0.5s cubic-bezier(0.19, 1, 0.22, 1) both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.19, 1, 0.22, 1) both',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.19, 1, 0.22, 1) both',
      },
      transitionTimingFunction: {
        'linear-app': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        instant: '80ms',
        fast: '150ms',
        normal: '250ms',
        slow: '350ms',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
