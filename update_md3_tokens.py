import re

file_path = "src/utils/themeEngine.ts"
with open(file_path, "r") as f:
    content = f.read()

replacement = """export function generateMD3TonalTokens(preset: ThemePreset, isDark: boolean, isBlack: boolean): Record<string, string> {
  const [pH, pS] = preset.primary;
  const [sH, sS] = preset.secondary;
  const [aH, aS] = preset.accent;
  const [nH, nS] = preset.neutral;

  if (!isDark) {
    // M3 Light Tones
    // Surface (Tone 98), Surface Container Low (Tone 96), Surface Container (Tone 94), Surface Container High (Tone 92)
    const surface = hsl(nH, nS * 0.1, 98);
    const surfaceContainerLow = hsl(nH, nS * 0.15, 96);
    const surfaceContainer = hsl(nH, nS * 0.2, 94);
    const surfaceContainerHigh = hsl(nH, nS * 0.25, 92);
    const surfaceContainerHighest = hsl(nH, nS * 0.3, 90);

    return {
      '--background': surface,
      '--foreground': hsl(nH, nS * 0.4, 10), // On Surface (Tone 10)
      '--card': surfaceContainerLow,
      '--card-foreground': hsl(nH, nS * 0.4, 10),
      '--popover': surfaceContainerHigh,
      '--popover-foreground': hsl(nH, nS * 0.4, 10),

      '--primary': hsl(pH, clamp(pS * 0.9, 45, 90), 40), // Primary (Tone 40)
      '--primary-foreground': '0 0% 100%', // On Primary (Tone 100)

      '--secondary': hsl(sH, clamp(sS * 0.6, 20, 50), 90), // Secondary Container (Tone 90)
      '--secondary-foreground': hsl(sH, clamp(sS * 0.7, 30, 60), 10), // On Secondary Container (Tone 10)

      '--muted': surfaceContainerHighest, // Surface Variant (Tone 90)
      '--muted-foreground': hsl(nH, nS * 0.25, 30), // On Surface Variant (Tone 30)

      '--accent': hsl(aH, clamp(aS * 0.7, 30, 60), 90), // Tertiary Container (Tone 90)
      '--accent-foreground': hsl(aH, clamp(aS * 0.8, 40, 70), 10), // On Tertiary Container (Tone 10)

      '--destructive': '3 71% 40%', // Error (Tone 40)
      '--destructive-foreground': '0 0% 100%', // On Error (Tone 100)

      '--success': '142 60% 36%',
      '--success-foreground': '0 0% 100%',
      '--warning': '38 85% 45%',
      '--warning-foreground': '38 90% 10%',
      '--error': '3 71% 40%',
      '--error-foreground': '0 0% 100%',

      '--border': hsl(nH, nS * 0.2, 80), // Outline Variant (Tone 80)
      '--input': hsl(nH, nS * 0.25, 45), // Outline (Tone 50)
      '--ring': hsl(pH, clamp(pS * 0.9, 45, 90), 40),

      '--radius': '1.75rem',
      '--md3-surface-container-low': surfaceContainerLow,
      '--md3-surface-container': surfaceContainer,
      '--md3-surface-container-high': surfaceContainerHigh,
      '--md3-surface-container-highest': surfaceContainerHighest,
      '--md3-primary-container': hsl(pH, clamp(pS * 0.9, 45, 90), 90), // Tone 90
      '--md3-on-primary-container': hsl(pH, clamp(pS * 0.9, 45, 90), 10), // Tone 10
      '--md3-secondary-container': hsl(sH, clamp(sS * 0.6, 20, 50), 90), // Tone 90
      '--md3-on-secondary-container': hsl(sH, clamp(sS * 0.7, 30, 60), 10), // Tone 10
      '--md3-tertiary-container': hsl(aH, clamp(aS * 0.7, 30, 60), 90), // Tone 90
      '--md3-on-tertiary-container': hsl(aH, clamp(aS * 0.8, 40, 70), 10), // Tone 10
      '--md3-outline': hsl(nH, nS * 0.25, 45), // Tone 50
      '--md3-outline-variant': hsl(nH, nS * 0.2, 80), // Tone 80
      '--md3-surface-tint': hsl(pH, clamp(pS * 0.9, 45, 90), 40), // Tone 40
    };
  } else {
    // M3 Dark Tones
    // Surface (Tone 6), Surface Container Low (Tone 10), Surface Container (Tone 12), Surface Container High (Tone 17)
    const baseL = isBlack ? 0 : 6;
    const surface = hsl(nH, nS * 0.1, baseL);
    const surfaceContainerLow = hsl(nH, nS * 0.15, baseL + 4);
    const surfaceContainer = hsl(nH, nS * 0.2, baseL + 6);
    const surfaceContainerHigh = hsl(nH, nS * 0.25, baseL + 11);
    const surfaceContainerHighest = hsl(nH, nS * 0.3, baseL + 16);

    return {
      '--background': surface,
      '--foreground': hsl(nH, nS * 0.15, 90), // On Surface (Tone 90)
      '--card': surfaceContainerLow,
      '--card-foreground': hsl(nH, nS * 0.15, 90),
      '--popover': surfaceContainerHigh,
      '--popover-foreground': hsl(nH, nS * 0.15, 90),

      '--primary': hsl(pH, clamp(pS * 1.1, 60, 100), 80), // Primary (Tone 80)
      '--primary-foreground': hsl(pH, pS, 20), // On Primary (Tone 20)

      '--secondary': hsl(sH, clamp(sS * 0.5, 15, 40), 30), // Secondary Container (Tone 30)
      '--secondary-foreground': hsl(sH, clamp(sS * 0.6, 25, 50), 90), // On Secondary Container (Tone 90)

      '--muted': surfaceContainerHighest, // Surface Variant (Tone 30/Highest)
      '--muted-foreground': hsl(nH, nS * 0.2, 80), // On Surface Variant (Tone 80)

      '--accent': hsl(aH, clamp(aS * 0.5, 20, 50), 30), // Tertiary Container (Tone 30)
      '--accent-foreground': hsl(aH, clamp(aS * 0.6, 30, 60), 90), // On Tertiary Container (Tone 90)

      '--destructive': '3 70% 80%', // Error (Tone 80)
      '--destructive-foreground': '3 100% 20%', // On Error (Tone 20)

      '--success': '142 50% 65%',
      '--success-foreground': '142 60% 12%',
      '--warning': '38 75% 70%',
      '--warning-foreground': '38 80% 8%',
      '--error': '3 70% 80%',
      '--error-foreground': '3 100% 20%',

      '--border': hsl(nH, nS * 0.2, 30), // Outline Variant (Tone 30)
      '--input': hsl(nH, nS * 0.25, 60), // Outline (Tone 60)
      '--ring': hsl(pH, clamp(pS * 1.1, 60, 100), 80),

      '--radius': '1.75rem',
      '--md3-surface-container-low': surfaceContainerLow,
      '--md3-surface-container': surfaceContainer,
      '--md3-surface-container-high': surfaceContainerHigh,
      '--md3-surface-container-highest': surfaceContainerHighest,
      '--md3-primary-container': hsl(pH, clamp(pS * 1.1, 60, 100), 30), // Tone 30
      '--md3-on-primary-container': hsl(pH, clamp(pS * 1.1, 60, 100), 90), // Tone 90
      '--md3-secondary-container': hsl(sH, clamp(sS * 0.5, 15, 40), 30), // Tone 30
      '--md3-on-secondary-container': hsl(sH, clamp(sS * 0.6, 25, 50), 90), // Tone 90
      '--md3-tertiary-container': hsl(aH, clamp(aS * 0.5, 20, 50), 30), // Tone 30
      '--md3-on-tertiary-container': hsl(aH, clamp(aS * 0.6, 30, 60), 90), // Tone 90
      '--md3-outline': hsl(nH, nS * 0.25, 60), // Tone 60
      '--md3-outline-variant': hsl(nH, nS * 0.2, 30), // Tone 30
      '--md3-surface-tint': hsl(pH, clamp(pS * 1.1, 60, 100), 80), // Tone 80
    };
  }
}"""

pattern = r"export function generateMD3TonalTokens\(preset: ThemePreset, isDark: boolean, isBlack: boolean\): Record<string, string> \{[\s\S]*?\}\n\}\n"
new_content = re.sub(pattern, replacement + "\n", content)

with open(file_path, "w") as f:
    f.write(new_content)

print("Updated tokens")
