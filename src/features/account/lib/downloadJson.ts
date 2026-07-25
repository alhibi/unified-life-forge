/**
 * Triggers a browser download for an in-memory JSON payload.
 *
 * Uses a revoked blob URL rather than a data: URI because export archives can
 * reach a few megabytes, which exceeds the data-URI length some browsers
 * accept. The object URL is released on the next task so the download has
 * already been handed to the browser.
 */
export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  // Firefox requires the anchor to be in the document for a click to count.
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `smarthub-export-<username>-2026-07-25.json` */
export function exportFilename(username: string | null): string {
  const day = new Date().toISOString().slice(0, 10);
  const who = (username ?? 'account').replace(/[^a-zA-Z0-9_-]/g, '') || 'account';
  return `smarthub-export-${who}-${day}.json`;
}
