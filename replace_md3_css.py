import re

file_path = "src/index.css"
with open(file_path, "r") as f:
    content = f.read()

replacement = """/* ── 2. Material Design 3 (MD3) - Strictly Dynamic & Pill-shaped ────────────────────────────── */
html[data-design-mode="md3"] {
  --radius: 1.75rem; /* Strict M3 large shape */
  /* M3 Easing */
  --md3-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --md3-ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --md3-ease-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
  --md3-ease-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);
}

/* Surface Depth and Containers */
html[data-design-mode="md3"] .app-card,
html[data-design-mode="md3"] .premium-card,
html[data-design-mode="md3"] .card,
html[data-design-mode="md3"] .surface-depth {
  border-radius: var(--radius) !important;
  border: none !important; /* M3 cards generally drop borders for elevation/surface distinction */
  background-color: var(--md3-surface-container-low, hsl(var(--card))) !important;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15) !important; /* Elevation 1 */
  transition: transform 400ms var(--md3-ease-emphasized),
              background-color 200ms linear,
              box-shadow 400ms var(--md3-ease-emphasized) !important;
  position: relative;
  overflow: hidden;
}

html[data-design-mode="md3"] .premium-card-elevated,
html[data-design-mode="md3"] .premium-card-intense {
  border-radius: var(--radius) !important;
  border: none !important;
  background-color: var(--md3-surface-container, hsl(var(--popover))) !important;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15) !important; /* Elevation 2 */
  transition: transform 400ms var(--md3-ease-emphasized),
              background-color 200ms linear,
              box-shadow 400ms var(--md3-ease-emphasized) !important;
  position: relative;
  overflow: hidden;
}

/* State Layers on Cards */
html[data-design-mode="md3"] .app-card::after,
html[data-design-mode="md3"] .premium-card::after,
html[data-design-mode="md3"] .premium-card-elevated::after,
html[data-design-mode="md3"] .premium-card-intense::after,
html[data-design-mode="md3"] .card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-color: var(--md3-on-surface, hsl(var(--foreground)));
  opacity: 0;
  transition: opacity 200ms linear;
}

html[data-design-mode="md3"] .app-card:hover::after,
html[data-design-mode="md3"] .premium-card:hover::after,
html[data-design-mode="md3"] .premium-card-elevated:hover::after,
html[data-design-mode="md3"] .premium-card-intense:hover::after,
html[data-design-mode="md3"] .card:hover::after {
  opacity: 0.08; /* M3 Hover State */
}

html[data-design-mode="md3"] .app-card:active::after,
html[data-design-mode="md3"] .premium-card:active::after,
html[data-design-mode="md3"] .premium-card-elevated:active::after,
html[data-design-mode="md3"] .premium-card-intense:active::after,
html[data-design-mode="md3"] .card:active::after {
  opacity: 0.12; /* M3 Pressed State */
}

html[data-design-mode="md3"] .app-card:hover,
html[data-design-mode="md3"] .premium-card:hover,
html[data-design-mode="md3"] .card:hover {
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15) !important; /* Elevation 2 */
}

html[data-design-mode="md3"] .premium-card-elevated:hover,
html[data-design-mode="md3"] .premium-card-intense:hover {
  box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15) !important; /* Elevation 3 */
}

/* Typography & Buttons */
html[data-design-mode="md3"] button:not(.preserve-fx),
html[data-design-mode="md3"] [role="button"]:not(.preserve-fx),
html[data-design-mode="md3"] a:not(.preserve-fx) {
  border-radius: 9999px !important; /* Absolute M3 capsules (Full for buttons) */
  font-family: 'Readex Pro', 'Roboto', sans-serif !important;
  font-weight: 500 !important;
  letter-spacing: 0.1px !important;
  padding: 0.625rem 1.5rem !important;
  text-transform: none !important;
  box-shadow: none !important;
  transition: all 300ms var(--md3-ease-emphasized) !important;
  position: relative;
  overflow: hidden;
  border: none !important;
}

/* Primary Button (Filled) */
html[data-design-mode="md3"] button.btn-primary,
html[data-design-mode="md3"] .bg-primary {
  background-color: hsl(var(--primary)) !important;
  color: hsl(var(--primary-foreground)) !important;
  box-shadow: none !important; /* Elevation 0 initially */
}

html[data-design-mode="md3"] button.btn-primary:hover {
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15) !important; /* Elevation 1 */
}

html[data-design-mode="md3"] button.btn-primary::after {
  content: "";
  position: absolute;
  inset: 0;
  background-color: hsl(var(--primary-foreground));
  opacity: 0;
  transition: opacity 150ms linear;
}

html[data-design-mode="md3"] button.btn-primary:hover::after {
  opacity: 0.08;
}

html[data-design-mode="md3"] button.btn-primary:active::after {
  opacity: 0.12;
}

/* Secondary Button (Tonal / Secondary Container) */
html[data-design-mode="md3"] button.btn-secondary {
  background-color: var(--md3-secondary-container, hsl(var(--secondary))) !important;
  color: var(--md3-on-secondary-container, hsl(var(--secondary-foreground))) !important;
  box-shadow: none !important;
}

html[data-design-mode="md3"] button.btn-secondary::after {
  content: "";
  position: absolute;
  inset: 0;
  background-color: var(--md3-on-secondary-container, hsl(var(--secondary-foreground)));
  opacity: 0;
  transition: opacity 150ms linear;
}

html[data-design-mode="md3"] button.btn-secondary:hover::after {
  opacity: 0.08;
}

html[data-design-mode="md3"] button.btn-secondary:active::after {
  opacity: 0.12;
}

html[data-design-mode="md3"] button.btn-secondary:hover {
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15) !important; /* Elevation 1 */
}

/* Outline Button / Ghost */
html[data-design-mode="md3"] button.btn-outline,
html[data-design-mode="md3"] button.btn-ghost {
  background-color: transparent !important;
  color: hsl(var(--primary)) !important;
  border: 1px solid var(--md3-outline, hsl(var(--border))) !important;
}

html[data-design-mode="md3"] button.btn-ghost {
  border: none !important;
}

html[data-design-mode="md3"] button.btn-outline::after,
html[data-design-mode="md3"] button.btn-ghost::after {
  content: "";
  position: absolute;
  inset: 0;
  background-color: hsl(var(--primary));
  opacity: 0;
  transition: opacity 150ms linear;
}

html[data-design-mode="md3"] button.btn-outline:hover::after,
html[data-design-mode="md3"] button.btn-ghost:hover::after {
  opacity: 0.08;
}
html[data-design-mode="md3"] button.btn-outline:active::after,
html[data-design-mode="md3"] button.btn-ghost:active::after {
  opacity: 0.12;
}

/* Inputs */
html[data-design-mode="md3"] input,
html[data-design-mode="md3"] textarea,
html[data-design-mode="md3"] select {
  border-radius: 9999px !important; /* Pill shaped inputs are very MD3 */
  border: 1px solid var(--md3-outline, hsl(var(--border))) !important;
  background-color: var(--md3-surface-container-highest, hsl(var(--card))) !important;
  padding: 0.875rem 1.25rem !important;
  transition: all 300ms var(--md3-ease-emphasized) !important;
  color: hsl(var(--foreground)) !important;
}
html[data-design-mode="md3"] input:focus,
html[data-design-mode="md3"] textarea:focus,
html[data-design-mode="md3"] select:focus {
  border-color: hsl(var(--primary)) !important;
  border-width: 2px !important;
  padding: calc(0.875rem - 1px) calc(1.25rem - 1px) !important; /* Prevent layout shift */
  background-color: var(--md3-surface-container, hsl(var(--background))) !important;
  outline: none !important;
}

/* Scrollbars */
html[data-design-mode="md3"] ::-webkit-scrollbar-thumb {
  background: var(--md3-outline-variant, hsl(var(--primary) / 0.2)) !important;
  border-radius: 9999px !important;
}
html[data-design-mode="md3"] ::-webkit-scrollbar-thumb:hover {
  background: var(--md3-outline, hsl(var(--primary) / 0.4)) !important;
}"""

pattern = r"/\* ── 2\. Material Design 3 \(MD3\) - Strictly Dynamic & Pill-shaped ────────────────────────────── \*/\nhtml\[data-design-mode=\"md3\"\].*?(?=\n/\* ── 3\. iOS 2024 Style)"

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(file_path, "w") as f:
    f.write(new_content)

print("Updated CSS")
