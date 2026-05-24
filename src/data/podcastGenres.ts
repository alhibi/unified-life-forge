// Apple Podcasts genre catalog used by the Podcasts discovery page.
//
// IDs match Apple's iTunes Genre IDs and are the same ones the `podium`
// open-source app uses. They drive the URL of the top-podcasts RSS feed
// (`/rss/toppodcasts/.../genre={id}/...`) so they must stay numeric and
// stable.
//
// The first entry — `all` — has a `null` id and renders top-podcasts
// without any genre filter, which is what the screenshot's "All" tab does.

export interface PodcastGenre {
  /** Stable internal key (used in URLs / state, not visible to the user). */
  key: string;
  /** Apple Podcasts genre id, or `null` for the unfiltered top chart. */
  id: number | null;
  /** Translation key: `podcasts.genre.<key>` (see `i18n/{ar,de}.json`). */
  labelKey: string;
}

export const podcastGenres: PodcastGenre[] = [
  { key: 'all',                       id: null, labelKey: 'podcasts.genre.all' },
  { key: 'news',                      id: 1489, labelKey: 'podcasts.genre.news' },
  { key: 'culture',                   id: 1324, labelKey: 'podcasts.genre.culture' },
  { key: 'education',                 id: 1304, labelKey: 'podcasts.genre.education' },
  { key: 'comedy',                    id: 1303, labelKey: 'podcasts.genre.comedy' },
  { key: 'religion-and-spirituality', id: 1314, labelKey: 'podcasts.genre.religion' },
  { key: 'technology',                id: 1318, labelKey: 'podcasts.genre.technology' },
  { key: 'science',                   id: 1533, labelKey: 'podcasts.genre.science' },
  { key: 'true-crime',                id: 1488, labelKey: 'podcasts.genre.trueCrime' },
  { key: 'health-and-fitness',        id: 1512, labelKey: 'podcasts.genre.health' },
  { key: 'business',                  id: 1321, labelKey: 'podcasts.genre.business' },
  { key: 'documentary',               id: 1543, labelKey: 'podcasts.genre.documentary' },
  { key: 'history',                   id: 1487, labelKey: 'podcasts.genre.history' },
  { key: 'places-and-travel',         id: 1320, labelKey: 'podcasts.genre.travel' },
  { key: 'food',                      id: 1306, labelKey: 'podcasts.genre.food' },
  { key: 'arts',                      id: 1301, labelKey: 'podcasts.genre.arts' },
  { key: 'music',                     id: 1310, labelKey: 'podcasts.genre.music' },
  { key: 'books',                     id: 1482, labelKey: 'podcasts.genre.books' },
  { key: 'sports',                    id: 1545, labelKey: 'podcasts.genre.sports' },
  { key: 'tv-and-film',               id: 1309, labelKey: 'podcasts.genre.tvAndFilm' },
  { key: 'mental-health',             id: 1517, labelKey: 'podcasts.genre.mentalHealth' },
  { key: 'self-improvement',          id: 1500, labelKey: 'podcasts.genre.selfImprovement' },
  { key: 'relationships',             id: 1544, labelKey: 'podcasts.genre.relationships' },
  { key: 'kids-and-family',           id: 1305, labelKey: 'podcasts.genre.kids' },
];
