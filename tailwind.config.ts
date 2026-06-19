import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        cormorant: ['"Cormorant Garamond"', 'serif'],
        montserrat: ['"Montserrat"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Canonical type scale — use these instead of arbitrary text-[Npx].
        // micro/mini = chrome & meta. body = default. lead = inputs (≥16px min).
        // title/display = headings. Line-heights tuned for Arabic + Latin parity.
        micro:   ["11px", { lineHeight: "14px", letterSpacing: "0.005em" }],
        mini:    ["12px", { lineHeight: "16px", letterSpacing: "0.003em" }],
        meta:    ["13px", { lineHeight: "18px" }],
        body:    ["14px", { lineHeight: "20px" }],
        lead:    ["16px", { lineHeight: "24px" }],
        title:   ["18px", { lineHeight: "24px", letterSpacing: "-0.005em" }],
        display: ["24px", { lineHeight: "30px", letterSpacing: "-0.015em" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0px" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0px" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        // ENTER → ease-out-expo, EXIT → ease-in, INTERACT → spring snappy
        "accordion-down": "accordion-down 0.28s cubic-bezier(0.19, 1, 0.22, 1)",
        "accordion-up":   "accordion-up 0.22s cubic-bezier(0.4, 0, 1, 1)",
        "fade-in":  "fade-in 0.5s cubic-bezier(0.19, 1, 0.22, 1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.19, 1, 0.22, 1) both",
        "slide-up": "slide-up 0.5s cubic-bezier(0.19, 1, 0.22, 1) both",
      },
      transitionTimingFunction: {
        "linear-app": "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "out-expo":   "cubic-bezier(0.16, 1, 0.3, 1)",
        "in":         "cubic-bezier(0.4, 0, 1, 1)",
        "spring":     "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        instant: "80ms",
        fast:    "150ms",
        normal:  "250ms",
        slow:    "350ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
