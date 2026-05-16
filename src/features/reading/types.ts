/** Shared types for the Reading (إطلاع) feature. */

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  fullContent?: string;
  pubDate: string;
  image: string | null;
  images?: string[];
  author?: string;
  source: string;
}

export interface FeedSource {
  url: string;
  name: string;
  category: string;
  enabled: boolean;
}

export interface FeedStatus {
  url: string;
  status: 'ok' | 'not_modified' | 'error';
  httpStatus?: number;
  itemCount: number;
  error?: string;
}

export type View =
  | 'list'
  | 'article'
  | 'manage'
  | 'suggested'
  | 'search'
  | 'alerts'
  | 'reader'
  | 'archive';
export type FilterTab = 'all' | 'bookmarks' | 'unread';

/** Reader-mode preferences, persisted in localStorage. */
export interface ReaderPrefs {
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  theme: 'system' | 'sepia' | 'dim';
  fontFamily: 'sans' | 'serif';
}
