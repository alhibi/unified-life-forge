// ─── Custom Folders Storage ───────────────────────────────────────────
// Device-local and cloud-backed (optional local fallback) storage for
// custom folders. Since folders are simple strings, we can persist them
// in a single localStorage list and in the user's cloud config.

export const FOLDERS_KEY = 'rss-reader-custom-folders-v1';

const DEFAULT_FOLDERS = ['news', 'tech', 'science', 'islamic', 'culture', 'business', 'health', 'sports', 'education', 'design', 'gaming', 'food', 'environment'];

export function getCustomFolders(): string[] {
  if (typeof localStorage === 'undefined') return DEFAULT_FOLDERS;
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(DEFAULT_FOLDERS));
      return DEFAULT_FOLDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FOLDERS;
  } catch {
    return DEFAULT_FOLDERS;
  }
}

export function storeCustomFolders(folders: string[]): void {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch { /* quota */ }
}
