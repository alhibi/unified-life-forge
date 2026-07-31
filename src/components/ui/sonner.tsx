import { toast, Toaster as Sonner } from 'sonner';

import { useApp } from '@/contexts/AppContext';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * The app's single toast surface.
 *
 * This used to read its theme from `next-themes`:
 *
 *     const { theme = "system" } = useTheme();
 *
 * There is no `ThemeProvider` anywhere in the app — theming is hand-rolled in
 * AppContext and `utils/themeEngine.ts` — so `useTheme()` always returned
 * `undefined` and the default `"system"` always won. Toasts therefore followed the
 * operating system rather than the app: a user reading in dark mode on a
 * light-configured phone got white toasts over a dark UI, and the in-app
 * light/dark switch moved everything except them.
 *
 * Reading `theme` from `useApp()` is both correct and one dependency lighter —
 * `next-themes` was in package.json solely for that broken call.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useApp();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { toast, Toaster };
