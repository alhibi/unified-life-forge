import type { FeedSource } from './types';

/**
 * Default feed sources seeded the first time a user opens the page.
 * Editing them here changes only future installs — existing users keep
 * whatever they have in localStorage.
 */
export const DEFAULT_FEEDS: FeedSource[] = [
  {
    url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bba0b18ad1a2',
    name: 'الجزيرة نت',
    category: 'news',
    enabled: true,
  },
  {
    url: 'https://www.sana.sy/?feed=rss2',
    name: 'سانا',
    category: 'news',
    enabled: true,
  },
];

export const SUGGESTED_FEEDS: FeedSource[] = [
  // Arabic news
  { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', name: 'BBC عربي', category: 'news', enabled: true },
  { url: 'https://arabic.cnn.com/api/v1/rss/rss.xml', name: 'CNN بالعربية', category: 'news', enabled: true },
  { url: 'https://www.skynewsarabia.com/web/rss/4787', name: 'سكاي نيوز عربية', category: 'news', enabled: true },
  { url: 'https://feeds.alhurra.com/news', name: 'الحرة', category: 'news', enabled: true },
  // English news
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NYT World', category: 'news', enabled: true },
  { url: 'https://feeds.reuters.com/Reuters/worldNews', name: 'Reuters World', category: 'news', enabled: true },
  { url: 'https://www.theguardian.com/world/rss', name: 'The Guardian', category: 'news', enabled: true },
  // Tech
  { url: 'https://feeds.feedburner.com/TechCrunch', name: 'TechCrunch', category: 'tech', enabled: true },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: 'tech', enabled: true },
  { url: 'https://hnrss.org/frontpage', name: 'Hacker News', category: 'tech', enabled: true },
  { url: 'https://css-tricks.com/feed/', name: 'CSS-Tricks', category: 'tech', enabled: true },
  // Science
  { url: 'https://www.nature.com/nature.rss', name: 'Nature', category: 'science', enabled: true },
  { url: 'https://www.sciencedaily.com/rss/all.xml', name: 'ScienceDaily', category: 'science', enabled: true },
  // Islamic
  { url: 'https://www.islamweb.net/ar/rss/news.xml', name: 'إسلام ويب', category: 'islamic', enabled: true },
];

export const CATEGORIES: { id: string; ar: string; en: string }[] = [
  { id: 'news', ar: 'أخبار', en: 'News' },
  { id: 'tech', ar: 'تقنية', en: 'Tech' },
  { id: 'science', ar: 'علوم', en: 'Science' },
  { id: 'islamic', ar: 'إسلامي', en: 'Islamic' },
  { id: 'culture', ar: 'ثقافة', en: 'Culture' },
  { id: 'sports', ar: 'رياضة', en: 'Sports' },
  { id: 'other', ar: 'أخرى', en: 'Other' },
];
