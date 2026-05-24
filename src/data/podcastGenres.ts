// Apple Podcasts genre catalog used by the Podcasts discovery page.
//
// IDs match Apple's iTunes Genre IDs (the same ones the open-source
// `podium` Android app uses) and drive the URL of the top-podcasts RSS
// feed (`/rss/toppodcasts/.../genre={id}/...`). They must stay numeric
// and stable.
//
// We expose the FULL Apple genre tree (root genres + their immediate
// subgenres) so the discovery page can navigate the catalog deeply
// instead of being limited to the top-level rail. Apple bumped from
// ~16 root genres to 19 with full subgenre coverage in 2019; the
// IDs below are the current canonical set Apple still serves at
// itunes.apple.com/{cc}/genre/podcasts-{slug}/id{id}.
//
// The first entry — `all` — has a `null` id and renders top-podcasts
// without any genre filter, which is what the screenshot's "All" tab
// does.

export interface PodcastGenre {
  /** Stable internal key (used in URLs / state, not visible to the user). */
  key: string;
  /** Apple Podcasts genre id, or `null` for the unfiltered top chart. */
  id: number | null;
  /** Translation key: `podcasts.genre.<key>` (see `i18n/{ar,de}.json`). */
  labelKey: string;
  /** Optional parent root-genre key. Lets the UI group subgenres under
   *  their root and surface a flat or hierarchical browsing mode. */
  parent?: string;
}

export const podcastGenres: PodcastGenre[] = [
  /* ----- All ----- */
  { key: 'all',                       id: null, labelKey: 'podcasts.genre.all' },

  /* ----- Root genres (most-browsed first, then alphabetical) ----- */
  { key: 'news',                      id: 1489, labelKey: 'podcasts.genre.news' },
  { key: 'society-and-culture',       id: 1324, labelKey: 'podcasts.genre.culture' },
  { key: 'education',                 id: 1304, labelKey: 'podcasts.genre.education' },
  { key: 'comedy',                    id: 1303, labelKey: 'podcasts.genre.comedy' },
  { key: 'religion-and-spirituality', id: 1314, labelKey: 'podcasts.genre.religion' },
  { key: 'technology',                id: 1318, labelKey: 'podcasts.genre.technology' },
  { key: 'science',                   id: 1533, labelKey: 'podcasts.genre.science' },
  { key: 'true-crime',                id: 1488, labelKey: 'podcasts.genre.trueCrime' },
  { key: 'health-and-fitness',        id: 1512, labelKey: 'podcasts.genre.health' },
  { key: 'business',                  id: 1321, labelKey: 'podcasts.genre.business' },
  { key: 'history',                   id: 1487, labelKey: 'podcasts.genre.history' },
  { key: 'arts',                      id: 1301, labelKey: 'podcasts.genre.arts' },
  { key: 'music',                     id: 1310, labelKey: 'podcasts.genre.music' },
  { key: 'sports',                    id: 1545, labelKey: 'podcasts.genre.sports' },
  { key: 'tv-and-film',               id: 1309, labelKey: 'podcasts.genre.tvAndFilm' },
  { key: 'fiction',                   id: 1483, labelKey: 'podcasts.genre.fiction' },
  { key: 'kids-and-family',           id: 1305, labelKey: 'podcasts.genre.kids' },
  { key: 'leisure',                   id: 1502, labelKey: 'podcasts.genre.leisure' },
  { key: 'government',                id: 1511, labelKey: 'podcasts.genre.government' },

  /* ----- Religion subgenres (relevant to the app's primary audience) ----- */
  { key: 'islam',                     id: 1440, labelKey: 'podcasts.genre.islam',        parent: 'religion-and-spirituality' },
  { key: 'christianity',              id: 1439, labelKey: 'podcasts.genre.christianity', parent: 'religion-and-spirituality' },
  { key: 'spirituality',              id: 1444, labelKey: 'podcasts.genre.spirituality', parent: 'religion-and-spirituality' },
  { key: 'buddhism',                  id: 1438, labelKey: 'podcasts.genre.buddhism',     parent: 'religion-and-spirituality' },
  { key: 'judaism',                   id: 1441, labelKey: 'podcasts.genre.judaism',      parent: 'religion-and-spirituality' },
  { key: 'hinduism',                  id: 1546, labelKey: 'podcasts.genre.hinduism',     parent: 'religion-and-spirituality' },

  /* ----- News subgenres ----- */
  { key: 'daily-news',                id: 1531, labelKey: 'podcasts.genre.dailyNews',       parent: 'news' },
  { key: 'politics',                  id: 1209, labelKey: 'podcasts.genre.politics',        parent: 'news' },
  { key: 'business-news',             id: 1530, labelKey: 'podcasts.genre.businessNews',    parent: 'news' },
  { key: 'tech-news',                 id: 1448, labelKey: 'podcasts.genre.techNews',        parent: 'news' },
  { key: 'sports-news',               id: 1524, labelKey: 'podcasts.genre.sportsNews',      parent: 'news' },
  { key: 'entertainment-news',        id: 1532, labelKey: 'podcasts.genre.entertainmentNews', parent: 'news' },
  { key: 'news-commentary',           id: 1530, labelKey: 'podcasts.genre.newsCommentary',  parent: 'news' },

  /* ----- Education subgenres ----- */
  { key: 'self-improvement',          id: 1500, labelKey: 'podcasts.genre.selfImprovement', parent: 'education' },
  { key: 'how-to',                    id: 1499, labelKey: 'podcasts.genre.howTo',           parent: 'education' },
  { key: 'language-learning',         id: 1498, labelKey: 'podcasts.genre.languageLearning',parent: 'education' },
  { key: 'courses',                   id: 1497, labelKey: 'podcasts.genre.courses',         parent: 'education' },

  /* ----- Society & Culture subgenres ----- */
  { key: 'documentary',               id: 1543, labelKey: 'podcasts.genre.documentary',     parent: 'society-and-culture' },
  { key: 'personal-journals',         id: 1302, labelKey: 'podcasts.genre.personalJournals',parent: 'society-and-culture' },
  { key: 'philosophy',                id: 1443, labelKey: 'podcasts.genre.philosophy',      parent: 'society-and-culture' },
  { key: 'places-and-travel',         id: 1320, labelKey: 'podcasts.genre.travel',          parent: 'society-and-culture' },
  { key: 'relationships',             id: 1544, labelKey: 'podcasts.genre.relationships',   parent: 'society-and-culture' },

  /* ----- Health & Fitness subgenres ----- */
  { key: 'mental-health',             id: 1517, labelKey: 'podcasts.genre.mentalHealth',    parent: 'health-and-fitness' },
  { key: 'fitness',                   id: 1515, labelKey: 'podcasts.genre.fitness',         parent: 'health-and-fitness' },
  { key: 'nutrition',                 id: 1516, labelKey: 'podcasts.genre.nutrition',       parent: 'health-and-fitness' },
  { key: 'medicine',                  id: 1513, labelKey: 'podcasts.genre.medicine',        parent: 'health-and-fitness' },
  { key: 'alternative-health',        id: 1514, labelKey: 'podcasts.genre.alternativeHealth', parent: 'health-and-fitness' },
  { key: 'sexuality',                 id: 1518, labelKey: 'podcasts.genre.sexuality',       parent: 'health-and-fitness' },

  /* ----- Business subgenres ----- */
  { key: 'careers',                   id: 1471, labelKey: 'podcasts.genre.careers',         parent: 'business' },
  { key: 'entrepreneurship',          id: 1472, labelKey: 'podcasts.genre.entrepreneurship',parent: 'business' },
  { key: 'investing',                 id: 1473, labelKey: 'podcasts.genre.investing',       parent: 'business' },
  { key: 'management',                id: 1474, labelKey: 'podcasts.genre.management',      parent: 'business' },
  { key: 'marketing',                 id: 1475, labelKey: 'podcasts.genre.marketing',       parent: 'business' },
  { key: 'non-profit',                id: 1476, labelKey: 'podcasts.genre.nonProfit',       parent: 'business' },

  /* ----- Comedy subgenres ----- */
  { key: 'stand-up',                  id: 1495, labelKey: 'podcasts.genre.standUp',         parent: 'comedy' },
  { key: 'comedy-interviews',         id: 1493, labelKey: 'podcasts.genre.comedyInterviews',parent: 'comedy' },
  { key: 'improv',                    id: 1494, labelKey: 'podcasts.genre.improv',          parent: 'comedy' },

  /* ----- Science subgenres ----- */
  { key: 'astronomy',                 id: 1477, labelKey: 'podcasts.genre.astronomy',       parent: 'science' },
  { key: 'chemistry',                 id: 1478, labelKey: 'podcasts.genre.chemistry',       parent: 'science' },
  { key: 'earth-sciences',            id: 1479, labelKey: 'podcasts.genre.earthSciences',   parent: 'science' },
  { key: 'life-sciences',             id: 1480, labelKey: 'podcasts.genre.lifeSciences',    parent: 'science' },
  { key: 'mathematics',               id: 1481, labelKey: 'podcasts.genre.mathematics',     parent: 'science' },
  { key: 'natural-sciences',          id: 1482, labelKey: 'podcasts.genre.naturalSciences', parent: 'science' },
  { key: 'nature',                    id: 1535, labelKey: 'podcasts.genre.nature',          parent: 'science' },
  { key: 'physics',                   id: 1539, labelKey: 'podcasts.genre.physics',         parent: 'science' },
  { key: 'social-sciences',           id: 1540, labelKey: 'podcasts.genre.socialSciences',  parent: 'science' },

  /* ----- Sports subgenres ----- */
  { key: 'football',                  id: 1546, labelKey: 'podcasts.genre.football',        parent: 'sports' },
  { key: 'basketball',                id: 1547, labelKey: 'podcasts.genre.basketball',      parent: 'sports' },
  { key: 'soccer',                    id: 1551, labelKey: 'podcasts.genre.soccer',          parent: 'sports' },
  { key: 'baseball',                  id: 1548, labelKey: 'podcasts.genre.baseball',        parent: 'sports' },
  { key: 'hockey',                    id: 1552, labelKey: 'podcasts.genre.hockey',          parent: 'sports' },
  { key: 'tennis',                    id: 1554, labelKey: 'podcasts.genre.tennis',          parent: 'sports' },
  { key: 'cricket',                   id: 1549, labelKey: 'podcasts.genre.cricket',         parent: 'sports' },
  { key: 'golf',                      id: 1550, labelKey: 'podcasts.genre.golf',            parent: 'sports' },
  { key: 'rugby',                     id: 1553, labelKey: 'podcasts.genre.rugby',           parent: 'sports' },
  { key: 'running',                   id: 1555, labelKey: 'podcasts.genre.running',         parent: 'sports' },
  { key: 'volleyball',                id: 1558, labelKey: 'podcasts.genre.volleyball',      parent: 'sports' },
  { key: 'wrestling',                 id: 1559, labelKey: 'podcasts.genre.wrestling',       parent: 'sports' },
  { key: 'fantasy-sports',            id: 1556, labelKey: 'podcasts.genre.fantasySports',   parent: 'sports' },

  /* ----- Arts subgenres ----- */
  { key: 'books',                     id: 1482, labelKey: 'podcasts.genre.books',           parent: 'arts' },
  { key: 'design',                    id: 1402, labelKey: 'podcasts.genre.design',          parent: 'arts' },
  { key: 'fashion-and-beauty',        id: 1459, labelKey: 'podcasts.genre.fashion',         parent: 'arts' },
  { key: 'food',                      id: 1306, labelKey: 'podcasts.genre.food',            parent: 'arts' },
  { key: 'performing-arts',           id: 1405, labelKey: 'podcasts.genre.performingArts',  parent: 'arts' },
  { key: 'visual-arts',               id: 1406, labelKey: 'podcasts.genre.visualArts',      parent: 'arts' },

  /* ----- Music subgenres ----- */
  { key: 'music-commentary',          id: 1525, labelKey: 'podcasts.genre.musicCommentary', parent: 'music' },
  { key: 'music-history',             id: 1526, labelKey: 'podcasts.genre.musicHistory',    parent: 'music' },
  { key: 'music-interviews',          id: 1527, labelKey: 'podcasts.genre.musicInterviews', parent: 'music' },

  /* ----- TV & Film subgenres ----- */
  { key: 'after-shows',               id: 1528, labelKey: 'podcasts.genre.afterShows',      parent: 'tv-and-film' },
  { key: 'film-history',              id: 1542, labelKey: 'podcasts.genre.filmHistory',     parent: 'tv-and-film' },
  { key: 'film-interviews',           id: 1541, labelKey: 'podcasts.genre.filmInterviews',  parent: 'tv-and-film' },
  { key: 'film-reviews',              id: 1536, labelKey: 'podcasts.genre.filmReviews',     parent: 'tv-and-film' },
  { key: 'tv-reviews',                id: 1537, labelKey: 'podcasts.genre.tvReviews',       parent: 'tv-and-film' },

  /* ----- Fiction subgenres ----- */
  { key: 'comedy-fiction',            id: 1484, labelKey: 'podcasts.genre.comedyFiction',   parent: 'fiction' },
  { key: 'drama',                     id: 1485, labelKey: 'podcasts.genre.drama',           parent: 'fiction' },
  { key: 'science-fiction',           id: 1486, labelKey: 'podcasts.genre.scienceFiction',  parent: 'fiction' },

  /* ----- Kids & Family subgenres ----- */
  { key: 'education-for-kids',        id: 1521, labelKey: 'podcasts.genre.educationKids',   parent: 'kids-and-family' },
  { key: 'parenting',                 id: 1520, labelKey: 'podcasts.genre.parenting',       parent: 'kids-and-family' },
  { key: 'pets-and-animals',          id: 1522, labelKey: 'podcasts.genre.petsAndAnimals',  parent: 'kids-and-family' },
  { key: 'stories-for-kids',          id: 1523, labelKey: 'podcasts.genre.storiesForKids',  parent: 'kids-and-family' },

  /* ----- Leisure subgenres ----- */
  { key: 'animation-and-manga',       id: 1408, labelKey: 'podcasts.genre.animation',       parent: 'leisure' },
  { key: 'automotive',                id: 1410, labelKey: 'podcasts.genre.automotive',      parent: 'leisure' },
  { key: 'aviation',                  id: 1411, labelKey: 'podcasts.genre.aviation',        parent: 'leisure' },
  { key: 'crafts',                    id: 1412, labelKey: 'podcasts.genre.crafts',          parent: 'leisure' },
  { key: 'games',                     id: 1413, labelKey: 'podcasts.genre.games',           parent: 'leisure' },
  { key: 'hobbies',                   id: 1414, labelKey: 'podcasts.genre.hobbies',         parent: 'leisure' },
  { key: 'home-and-garden',           id: 1415, labelKey: 'podcasts.genre.homeAndGarden',   parent: 'leisure' },
  { key: 'video-games',               id: 1416, labelKey: 'podcasts.genre.videoGames',      parent: 'leisure' },
];

/** Quick lookup by key — used by the Podcasts page to resolve the
 *  persisted genre selection without re-scanning the whole array. */
export function findGenre(key: string | null | undefined): PodcastGenre {
  return podcastGenres.find(g => g.key === key) ?? podcastGenres[0];
}
