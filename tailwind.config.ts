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
        // ── Canonical type scale — derived, not fixed ──────────────────
        // These used to be seven pixel literals, which meant the font-size
        // preference (which only sets `html { font-size }`) moved almost
        // nothing on screen. Each step is now a CSS variable computed by
        // src/lib/fonts.ts from the user's base size and scale ratio, and the
        // line height is derived from the leading preference:
        //   body-family steps  →  size × --type-leading      (1.6 default)
        //   heading steps      →  size × --type-leading-tight (1.2 default)
        // At the default 16px base and 1.2 ratio these resolve to exactly the
        // original 11 · 12 · 13 · 14 · 16 · 18 · 24 scale.
        micro: [
          'var(--fs-micro)',
          { lineHeight: 'calc(var(--fs-micro) * var(--type-leading))', letterSpacing: '0.005em' },
        ],
        mini: [
          'var(--fs-mini)',
          { lineHeight: 'calc(var(--fs-mini) * var(--type-leading))', letterSpacing: '0.003em' },
        ],
        meta: ['var(--fs-meta)', { lineHeight: 'calc(var(--fs-meta) * var(--type-leading))' }],
        body: ['var(--fs-body)', { lineHeight: 'calc(var(--fs-body) * var(--type-leading))' }],
        lead: ['var(--fs-lead)', { lineHeight: 'calc(var(--fs-lead) * var(--type-leading))' }],
        title: [
          'var(--fs-title)',
          {
            lineHeight: 'calc(var(--fs-title) * var(--type-leading-tight))',
            letterSpacing: '-0.005em',
          },
        ],
        display: [
          'var(--fs-display)',
          {
            lineHeight: 'calc(var(--fs-display) * var(--type-leading-tight))',
            letterSpacing: '-0.015em',
          },
        ],
      },
      maxWidth: {
        // `max-w-lg` is this app's content-column convention (40+ screens use
        // it to centre themselves), so it follows the content-width preference.
        // Every other max-width key keeps its Tailwind default.
        lg: 'var(--ui-content-max)',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ── The active theme's 7-step tonal scale ────────────────────
        // Every theme publishes exactly these seven tones (see
        // src/utils/themeEngine.ts). The semantic tokens above are all
        // sampled from this same curve, so `bg-theme-100` and `bg-secondary`
        // belong to one palette rather than two.
        //
        // Reach for a semantic token first — `bg-card`, `text-muted-foreground`
        // — because those carry meaning and follow light/dark automatically.
        // Use a numbered tone only when a feature genuinely needs a specific
        // position on the ramp (a 7-tier chart legend, a heat scale, a swatch).
        theme: {
          50: 'hsl(var(--theme-50))',
          100: 'hsl(var(--theme-100))',
          200: 'hsl(var(--theme-200))',
          300: 'hsl(var(--theme-300))',
          400: 'hsl(var(--theme-400))',
          500: 'hsl(var(--theme-500))',
          600: 'hsl(var(--theme-600))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          // Aliases of the scale above, for call sites that read more
          // naturally as a primary ramp (`text-primary-600`).
          50: 'hsl(var(--theme-50))',
          100: 'hsl(var(--theme-100))',
          200: 'hsl(var(--theme-200))',
          300: 'hsl(var(--theme-300))',
          400: 'hsl(var(--theme-400))',
          500: 'hsl(var(--theme-500))',
          600: 'hsl(var(--theme-600))',
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
        // Mathematical geometry scale: 6 / 10 / 16 / 24px at corner softness
        // 1.0. The four variables are written by src/lib/interfaceScale.ts, so
        // the corner-softness preference moves every radius in the app in
        // proportion — a chip, a button, a card and a sheet keep their
        // relationship at any setting.
        //
        // NOTE: `xl`, `2xl` and `3xl` all resolve to the same value on purpose
        // so the largest radius has ONE meaning — the codebase used all three
        // interchangeably believing they differed. Prefer `lg` for cards and
        // `xl` for sheets and sections.
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': 'var(--r-xl)',
        '3xl': 'var(--r-xl)',
        input: 'var(--r-md)',
        button: 'var(--r-md)',
        card: 'var(--r-lg)',
        section: 'var(--r-xl)',
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
        // Generic disclosure pair. `--collapse-target-height` is supplied by
        // the primitive from whichever Radix measurement variable applies, so
        // one keyframe pair serves accordion, collapsible and inline panels.
        'collapse-down': {
          from: { height: '0px', opacity: '0' },
          to: { height: 'var(--collapse-target-height, auto)', opacity: '1' },
        },
        'collapse-up': {
          from: { height: 'var(--collapse-target-height, auto)', opacity: '1' },
          to: { height: '0px', opacity: '0' },
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
        // Every duration is the base value times the live speed multiplier and
        // every curve comes from the active easing family, so a utility class
        // written in JSX obeys /settings/motion exactly like a framer variant
        // does. Never reintroduce a literal `0.28s` or a raw cubic-bezier here.
        'accordion-down':
          'accordion-down calc(280ms * var(--motion-duration-scale)) var(--motion-ease-enter)',
        'accordion-up':
          'accordion-up calc(220ms * var(--motion-duration-scale)) var(--motion-ease-exit)',
        'collapse-down':
          'collapse-down calc(260ms * var(--motion-duration-scale)) var(--motion-ease-enter) both',
        'collapse-up':
          'collapse-up calc(200ms * var(--motion-duration-scale)) var(--motion-ease-exit) both',
        'fade-in':
          'fade-in calc(500ms * var(--motion-duration-scale)) var(--motion-ease-enter) both',
        'scale-in':
          'scale-in calc(350ms * var(--motion-duration-scale)) var(--motion-ease-enter) both',
        'slide-up':
          'slide-up calc(500ms * var(--motion-duration-scale)) var(--motion-ease-enter) both',
      },
      transitionTimingFunction: {
        // The four names that follow the user's easing profile.
        nav: 'var(--motion-ease-nav)',
        enter: 'var(--motion-ease-enter)',
        exit: 'var(--motion-ease-exit)',
        press: 'var(--motion-ease-press)',
        // Legacy fixed curves, kept for call sites that have not migrated.
        'linear-app': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        // `duration-fast` in JSX now scales with the speed preference, because
        // it resolves to the same variable the stylesheet uses.
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },
      borderWidth: {
        // `border` and `border-hairline` both follow the interface platform's
        // edge-thickness preference, so a surface cannot opt out of it by
        // accident.
        DEFAULT: 'var(--ui-border-width)',
        hairline: 'var(--ui-border-width)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
