import type { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import { Layout, X } from '@/lib/icons';

interface SplitWorkspaceProps {
  /** The app's normal content, rendered in the primary pane. */
  children: ReactNode;
  url: string;
  size: number;
  onSizeChange: (size: number) => void;
  layout: 'horizontal' | 'vertical';
  onClose: () => void;
}

/**
 * Dual-pane workspace: the app on one side, a second isolated copy of any
 * in-app route in an iframe on the other.
 *
 * Extracted from App.tsx and loaded lazily. It was previously inlined, which
 * meant `react-resizable-panels` (~80 kB) shipped in the entry chunk for
 * every visitor even though this is an opt-in power-user feature reached only
 * from the command palette.
 *
 * The chrome also used hard-coded `neutral-*` / `#C9A84C` colours (plus
 * `bg-neutral-750`, which is not a real Tailwind shade and therefore rendered
 * nothing) and so ignored all 32 of the app's colour themes. It now composes
 * from semantic tokens like the rest of the UI.
 */
export default function SplitWorkspace({
  children,
  url,
  size,
  onSizeChange,
  layout,
  onClose,
}: SplitWorkspaceProps) {
  const isVertical = layout === 'vertical';

  return (
    <PanelGroup
      direction={layout}
      onLayout={(sizes) => {
        if (sizes[1] !== undefined) onSizeChange(sizes[1]);
      }}
      className="h-full w-full"
    >
      <Panel defaultSize={100 - size} minSize={20}>
        {children}
      </Panel>

      <PanelResizeHandle
        className={`relative flex items-center justify-center bg-muted hover:bg-accent ${
          isVertical ? 'h-2 w-full cursor-row-resize border-y' : 'h-full w-2 cursor-col-resize border-x'
        } border-border`}
        aria-label="تغيير حجم اللوحتين"
      >
        <div className={`rounded-full bg-border ${isVertical ? 'h-1 w-8' : 'h-8 w-1'}`} />
      </PanelResizeHandle>

      <Panel defaultSize={size} minSize={20}>
        <div
          className="relative flex h-full w-full flex-col border-border bg-background"
          style={{
            borderInlineStartWidth: isVertical ? 0 : 1,
            borderTopWidth: isVertical ? 1 : 0,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Layout className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="text-mini font-semibold text-foreground">مساحة العمل الثانوية</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="max-w-[140px] truncate rounded-sm border border-border bg-muted px-2 py-0.5 text-micro text-muted-foreground">
                {url}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق مساحة العمل الثانوية"
                className="app-icon-btn h-8 w-8"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <iframe
            src={`${window.location.origin}${url}?is_split_pane=true`}
            className="flex-1 w-full border-none bg-background"
            title="مساحة العمل الثانوية"
            loading="lazy"
            // The pane loads same-origin app routes only, but the sandbox is
            // still declared explicitly so the embedded copy can never
            // navigate the top-level window or trigger downloads.
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </Panel>
    </PanelGroup>
  );
}
