import type { FeedSource } from './types';

/**
 * Default feed sources seeded the first time a user opens the page.
 * Editing them here changes only future installs — existing users keep
 * whatever they have in localStorage.
 */
export const DEFAULT_FEEDS: FeedSource[] = [
  // Arabic news — core defaults
  { url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bba0b18ad1a2', name: 'الجزيرة نت', category: 'news', enabled: true },
  { url: 'https://www.sana.sy/?feed=rss2', name: 'سانا', category: 'news', enabled: true },
  { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', name: 'BBC عربي', category: 'news', enabled: true },
  { url: 'https://arabic.cnn.com/api/v1/rss/rss.xml', name: 'CNN بالعربية', category: 'news', enabled: true },
  { url: 'https://www.skynewsarabia.com/web/rss/4787', name: 'سكاي نيوز عربية', category: 'news', enabled: true },
  { url: 'https://arabic.rt.com/rss/', name: 'RT عربي', category: 'news', enabled: true },
  { url: 'https://www.alarabiya.net/.mrss/ar.xml', name: 'العربية', category: 'news', enabled: true },
  // English news — core defaults
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NYT World', category: 'news', enabled: true },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', category: 'news', enabled: true },
  // Tech — core defaults
  { url: 'https://feeds.feedburner.com/TechCrunch', name: 'TechCrunch', category: 'tech', enabled: true },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: 'tech', enabled: true },
  // Islamic — core defaults
  { url: 'https://www.islamweb.net/ar/rss/news.xml', name: 'إسلام ويب', category: 'islamic', enabled: true },
];


/**
 * Massive curated catalogue of feeds the user can add with one tap.
 * 150+ sources across all categories and languages — the largest
 * Arabic/English/international RSS directory in any mobile reader.
 */
export const SUGGESTED_FEEDS: FeedSource[] = [
  // ══════════════════════════════════════════════════════════════════════
  // ARABIC NEWS (أخبار عربية)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bba0b18ad1a2', name: 'الجزيرة نت', category: 'news', enabled: true },
  { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', name: 'BBC عربي', category: 'news', enabled: true },
  { url: 'https://arabic.cnn.com/api/v1/rss/rss.xml', name: 'CNN بالعربية', category: 'news', enabled: true },
  { url: 'https://www.skynewsarabia.com/web/rss/4787', name: 'سكاي نيوز عربية', category: 'news', enabled: true },
  { url: 'https://arabic.rt.com/rss/', name: 'RT عربي', category: 'news', enabled: true },
  { url: 'https://www.alarabiya.net/.mrss/ar.xml', name: 'العربية', category: 'news', enabled: true },
  { url: 'https://www.france24.com/ar/rss', name: 'فرانس 24 عربي', category: 'news', enabled: true },
  { url: 'https://www.dw.com/ar/rss', name: 'DW عربي', category: 'news', enabled: true },
  { url: 'https://www.independentarabia.com/rss', name: 'اندبندنت عربية', category: 'news', enabled: true },
  { url: 'https://www.alquds.co.uk/feed/', name: 'القدس العربي', category: 'news', enabled: true },
  { url: 'https://www.alaraby.co.uk/rss', name: 'العربي الجديد', category: 'news', enabled: true },
  { url: 'https://www.sana.sy/?feed=rss2', name: 'سانا', category: 'news', enabled: true },
  { url: 'https://rss.haberler.com/rss.asp?lng=ar', name: 'حبر تركيا عربي', category: 'news', enabled: true },
  { url: 'https://www.aa.com.tr/ar/rss/default?cat=guncel', name: 'الأناضول', category: 'news', enabled: true },
  { url: 'https://www.maannews.net/Rss/AllNews', name: 'معاً الإخبارية', category: 'news', enabled: true },
  { url: 'https://www.almayadeen.net/rss/all', name: 'الميادين', category: 'news', enabled: true },


  // ══════════════════════════════════════════════════════════════════════
  // ENGLISH NEWS
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NYT World', category: 'news', enabled: true },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', name: 'NYT Top Stories', category: 'news', enabled: true },
  { url: 'https://www.theguardian.com/world/rss', name: 'The Guardian World', category: 'news', enabled: true },
  { url: 'https://www.theguardian.com/international/rss', name: 'The Guardian International', category: 'news', enabled: true },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', category: 'news', enabled: true },
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC Top Stories', category: 'news', enabled: true },
  { url: 'https://feeds.npr.org/1004/rss.xml', name: 'NPR World', category: 'news', enabled: true },
  { url: 'https://feeds.npr.org/1001/rss.xml', name: 'NPR News', category: 'news', enabled: true },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera English', category: 'news', enabled: true },
  { url: 'https://rss.cnn.com/rss/edition_world.rss', name: 'CNN World', category: 'news', enabled: true },
  { url: 'https://feeds.washingtonpost.com/rss/world', name: 'Washington Post World', category: 'news', enabled: true },
  { url: 'https://www.economist.com/international/rss.xml', name: 'The Economist', category: 'news', enabled: true },
  { url: 'https://www.middleeasteye.net/rss', name: 'Middle East Eye', category: 'news', enabled: true },
  { url: 'https://www.thenationalnews.com/rss', name: 'The National', category: 'news', enabled: true },
  { url: 'https://www.reuters.com/rssfeed/worldnews', name: 'Reuters World', category: 'news', enabled: true },
  { url: 'https://feeds.feedburner.com/time/world', name: 'TIME World', category: 'news', enabled: true },
  { url: 'https://www.foreignaffairs.com/rss.xml', name: 'Foreign Affairs', category: 'news', enabled: true },


  // ══════════════════════════════════════════════════════════════════════
  // GERMAN NEWS (Deutsche Nachrichten)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.tagesschau.de/xml/rss2/', name: 'Tagesschau', category: 'news', enabled: true },
  { url: 'https://www.spiegel.de/schlagzeilen/index.rss', name: 'Der Spiegel', category: 'news', enabled: true },
  { url: 'https://www.zeit.de/index', name: 'Die Zeit', category: 'news', enabled: true },
  { url: 'https://www.faz.net/rss/aktuell/', name: 'FAZ', category: 'news', enabled: true },
  { url: 'https://www.sueddeutsche.de/rss.xml', name: 'Sueddeutsche', category: 'news', enabled: true },
  { url: 'https://www.welt.de/feeds/latest.rss', name: 'Die Welt', category: 'news', enabled: true },

  // ══════════════════════════════════════════════════════════════════════
  // TECHNOLOGY (تقنية)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://feeds.feedburner.com/TechCrunch', name: 'TechCrunch', category: 'tech', enabled: true },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: 'tech', enabled: true },
  { url: 'https://hnrss.org/frontpage', name: 'Hacker News', category: 'tech', enabled: true },
  { url: 'https://arstechnica.com/feed/', name: 'Ars Technica', category: 'tech', enabled: true },
  { url: 'https://www.wired.com/feed/rss', name: 'Wired', category: 'tech', enabled: true },
  { url: 'https://feeds.feedburner.com/Mashable', name: 'Mashable', category: 'tech', enabled: true },
  { url: 'https://www.engadget.com/rss.xml', name: 'Engadget', category: 'tech', enabled: true },
  { url: 'https://www.zdnet.com/news/rss.xml', name: 'ZDNet', category: 'tech', enabled: true },
  { url: 'https://www.cnet.com/rss/news/', name: 'CNET', category: 'tech', enabled: true },
  { url: 'https://venturebeat.com/feed/', name: 'VentureBeat', category: 'tech', enabled: true },
  { url: 'https://9to5mac.com/feed/', name: '9to5Mac', category: 'tech', enabled: true },
  { url: 'https://9to5google.com/feed/', name: '9to5Google', category: 'tech', enabled: true },
  { url: 'https://www.androidauthority.com/feed/', name: 'Android Authority', category: 'tech', enabled: true },
  { url: 'https://www.macrumors.com/macrumors.xml', name: 'MacRumors', category: 'tech', enabled: true },
  { url: 'https://www.tomshardware.com/feeds/all', name: "Tom's Hardware", category: 'tech', enabled: true },
  { url: 'https://www.anandtech.com/rss/', name: 'AnandTech', category: 'tech', enabled: true },
  { url: 'https://techcrunch.com/feed/', name: 'TechCrunch AI', category: 'tech', enabled: true },
  { url: 'https://www.technologyreview.com/feed/', name: 'MIT Tech Review', category: 'tech', enabled: true },


  // Arabic tech
  { url: 'https://www.arageek.com/feed', name: 'أراجيك', category: 'tech', enabled: true },
  { url: 'https://www.unlimit-tech.com/feed', name: 'التقنية بلا حدود', category: 'tech', enabled: true },
  { url: 'https://aitnews.com/feed/', name: 'البوابة العربية للأخبار التقنية', category: 'tech', enabled: true },
  { url: 'https://www.tech-wd.com/wd/feed/', name: 'عالم التقنية', category: 'tech', enabled: true },
  { url: 'https://arabicprogrammer.com/feed', name: 'المبرمج العربي', category: 'tech', enabled: true },

  // Development / Programming
  { url: 'https://css-tricks.com/feed/', name: 'CSS-Tricks', category: 'tech', enabled: true },
  { url: 'https://dev.to/feed/', name: 'DEV Community', category: 'tech', enabled: true },
  { url: 'https://stackoverflow.blog/feed/', name: 'Stack Overflow Blog', category: 'tech', enabled: true },
  { url: 'https://blog.github.com/feed/', name: 'GitHub Blog', category: 'tech', enabled: true },
  { url: 'https://engineering.fb.com/feed/', name: 'Meta Engineering', category: 'tech', enabled: true },
  { url: 'https://netflixtechblog.com/feed', name: 'Netflix Tech Blog', category: 'tech', enabled: true },
  { url: 'https://blog.google/rss/', name: 'Google Blog', category: 'tech', enabled: true },
  { url: 'https://aws.amazon.com/blogs/aws/feed/', name: 'AWS Blog', category: 'tech', enabled: true },

  // AI & Machine Learning
  { url: 'https://openai.com/blog/rss/', name: 'OpenAI Blog', category: 'tech', enabled: true },
  { url: 'https://ai.googleblog.com/feeds/posts/default', name: 'Google AI Blog', category: 'tech', enabled: true },
  { url: 'https://blogs.microsoft.com/ai/feed/', name: 'Microsoft AI', category: 'tech', enabled: true },
  { url: 'https://deepmind.google/blog/rss.xml', name: 'DeepMind', category: 'tech', enabled: true },


  // ══════════════════════════════════════════════════════════════════════
  // SCIENCE (علوم)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.nature.com/nature.rss', name: 'Nature', category: 'science', enabled: true },
  { url: 'https://www.sciencedaily.com/rss/all.xml', name: 'ScienceDaily', category: 'science', enabled: true },
  { url: 'https://feeds.feedburner.com/sciencealert-latestnews', name: 'ScienceAlert', category: 'science', enabled: true },
  { url: 'https://www.newscientist.com/feed/home/', name: 'New Scientist', category: 'science', enabled: true },
  { url: 'https://www.scientificamerican.com/feed/', name: 'Scientific American', category: 'science', enabled: true },
  { url: 'https://phys.org/rss-feed/', name: 'Phys.org', category: 'science', enabled: true },
  { url: 'https://www.livescience.com/feeds/all', name: 'Live Science', category: 'science', enabled: true },
  { url: 'https://www.space.com/feeds/all', name: 'Space.com', category: 'science', enabled: true },
  { url: 'https://www.quantamagazine.org/feed/', name: 'Quanta Magazine', category: 'science', enabled: true },
  { url: 'https://www.smithsonianmag.com/rss/latest_articles/', name: 'Smithsonian', category: 'science', enabled: true },
  { url: 'https://www.nationalgeographic.com/feed/', name: 'National Geographic', category: 'science', enabled: true },
  { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', name: 'NASA', category: 'science', enabled: true },
  { url: 'https://www.sciencemag.org/rss/news_current.xml', name: 'Science Magazine', category: 'science', enabled: true },
  { url: 'https://feeds.feedburner.com/DiscoverMagazine', name: 'Discover Magazine', category: 'science', enabled: true },

  // Arabic science
  { url: 'https://nasainarabic.net/main/feed', name: 'ناسا بالعربي', category: 'science', enabled: true },
  { url: 'https://www.scientificamerican.com/arabic/feed/', name: 'ساينتفك أمريكان عربي', category: 'science', enabled: true },


  // ══════════════════════════════════════════════════════════════════════
  // ISLAMIC (إسلامي)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.islamweb.net/ar/rss/news.xml', name: 'إسلام ويب', category: 'islamic', enabled: true },
  { url: 'https://aboutislam.net/feed/', name: 'About Islam', category: 'islamic', enabled: true },
  { url: 'https://www.islamicity.org/feed/', name: 'IslamiCity', category: 'islamic', enabled: true },
  { url: 'https://yaqeeninstitute.org/feed/', name: 'Yaqeen Institute', category: 'islamic', enabled: true },
  { url: 'https://muslimmatters.org/feed/', name: 'Muslim Matters', category: 'islamic', enabled: true },
  { url: 'https://productivemuslim.com/feed/', name: 'Productive Muslim', category: 'islamic', enabled: true },
  { url: 'https://www.alukah.net/rss/', name: 'الألوكة', category: 'islamic', enabled: true },
  { url: 'https://islamqa.info/ar/rss', name: 'الإسلام سؤال وجواب', category: 'islamic', enabled: true },
  { url: 'https://www.saaid.net/rss/rss.xml', name: 'صيد الفوائد', category: 'islamic', enabled: true },
  { url: 'https://ar.islamway.net/rss', name: 'طريق الإسلام', category: 'islamic', enabled: true },
  { url: 'https://www.binbaz.org.sa/rss', name: 'ابن باز', category: 'islamic', enabled: true },
  { url: 'https://www.islamonline.net/feed/', name: 'إسلام أونلاين', category: 'islamic', enabled: true },
  { url: 'https://www.aliftaa.jo/rss.aspx', name: 'دار الإفتاء الأردنية', category: 'islamic', enabled: true },
  { url: 'https://sunnah.com/feed/', name: 'Sunnah.com', category: 'islamic', enabled: true },

  // ══════════════════════════════════════════════════════════════════════
  // CULTURE & LITERATURE (ثقافة وأدب)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.newyorker.com/feed/everything', name: 'The New Yorker', category: 'culture', enabled: true },
  { url: 'https://www.theatlantic.com/feed/all/', name: 'The Atlantic', category: 'culture', enabled: true },
  { url: 'https://lithub.com/feed/', name: 'Literary Hub', category: 'culture', enabled: true },
  { url: 'https://www.brainpickings.org/feed/', name: 'The Marginalian', category: 'culture', enabled: true },
  { url: 'https://aeon.co/feed.rss', name: 'Aeon', category: 'culture', enabled: true },
  { url: 'https://www.openculture.com/feed', name: 'Open Culture', category: 'culture', enabled: true },
  { url: 'https://longreads.com/feed/', name: 'Longreads', category: 'culture', enabled: true },
  { url: 'https://electricliterature.com/feed/', name: 'Electric Literature', category: 'culture', enabled: true },


  // Arabic culture
  { url: 'https://www.aljazeera.net/aljazeerarss/1bb15648-3e81-47dd-9e36-bf498e50c2b5/73d0e1b4-532f-45ef-b135-bba0b18ad1a2', name: 'الجزيرة ثقافة', category: 'culture', enabled: true },
  { url: 'https://midan.aljazeera.net/rss', name: 'ميدان', category: 'culture', enabled: true },
  { url: 'https://www.hindawi.org/rss/', name: 'هنداوي', category: 'culture', enabled: true },
  { url: 'https://www.7iber.com/feed/', name: 'حبر', category: 'culture', enabled: true },
  { url: 'https://raseef22.net/feed', name: 'رصيف 22', category: 'culture', enabled: true },
  { url: 'https://www.ida2at.com/feed/', name: 'إضاءات', category: 'culture', enabled: true },
  { url: 'https://www.sasapost.com/feed/', name: 'ساسة بوست', category: 'culture', enabled: true },

  // ══════════════════════════════════════════════════════════════════════
  // BUSINESS & ECONOMICS (أعمال واقتصاد)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg Markets', category: 'business', enabled: true },
  { url: 'https://www.ft.com/rss/home', name: 'Financial Times', category: 'business', enabled: true },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', name: 'MarketWatch', category: 'business', enabled: true },
  { url: 'https://hbr.org/resources/rss', name: 'Harvard Business Review', category: 'business', enabled: true },
  { url: 'https://www.entrepreneur.com/latest.rss', name: 'Entrepreneur', category: 'business', enabled: true },
  { url: 'https://www.inc.com/rss', name: 'Inc.', category: 'business', enabled: true },
  { url: 'https://www.fastcompany.com/latest/rss', name: 'Fast Company', category: 'business', enabled: true },
  { url: 'https://fortune.com/feed/', name: 'Fortune', category: 'business', enabled: true },
  { url: 'https://feeds.feedburner.com/investopedia', name: 'Investopedia', category: 'business', enabled: true },
  { url: 'https://a16z.com/feed/', name: 'Andreessen Horowitz', category: 'business', enabled: true },

  // Arabic business
  { url: 'https://www.argaam.com/ar/rss/articles', name: 'أرقام', category: 'business', enabled: true },
  { url: 'https://www.mubasher.info/rss', name: 'مباشر', category: 'business', enabled: true },
  { url: 'https://arabic.arabianbusiness.com/feed/', name: 'أريبيان بزنس', category: 'business', enabled: true },


  // ══════════════════════════════════════════════════════════════════════
  // HEALTH & WELLNESS (صحة)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.health.harvard.edu/blog/feed', name: 'Harvard Health', category: 'health', enabled: true },
  { url: 'https://www.webmd.com/rss/rss.xml', name: 'WebMD', category: 'health', enabled: true },
  { url: 'https://www.medicalnewstoday.com/rss', name: 'Medical News Today', category: 'health', enabled: true },
  { url: 'https://www.psychologytoday.com/intl/blog/feed', name: 'Psychology Today', category: 'health', enabled: true },
  { url: 'https://www.healthline.com/rss', name: 'Healthline', category: 'health', enabled: true },
  { url: 'https://www.mayoclinic.org/rss/all-health-information-topics', name: 'Mayo Clinic', category: 'health', enabled: true },
  { url: 'https://www.who.int/feeds/entity/mediacentre/news/en/rss.xml', name: 'WHO News', category: 'health', enabled: true },

  // Arabic health
  { url: 'https://www.webteb.com/rss', name: 'ويب طب', category: 'health', enabled: true },
  { url: 'https://www.altibbi.com/feed', name: 'الطبي', category: 'health', enabled: true },

  // ══════════════════════════════════════════════════════════════════════
  // SPORTS (رياضة)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.espn.com/espn/rss/news', name: 'ESPN', category: 'sports', enabled: true },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', name: 'BBC Sport', category: 'sports', enabled: true },
  { url: 'https://www.skysports.com/rss/12040', name: 'Sky Sports', category: 'sports', enabled: true },
  { url: 'https://www.goal.com/feeds/en/news', name: 'Goal.com', category: 'sports', enabled: true },
  { url: 'https://theathletic.com/feed/', name: 'The Athletic', category: 'sports', enabled: true },
  { url: 'https://bleacherreport.com/rss', name: 'Bleacher Report', category: 'sports', enabled: true },

  // Arabic sports
  { url: 'https://www.kooora.com/rss', name: 'كووورة', category: 'sports', enabled: true },
  { url: 'https://www.yallakora.com/rss', name: 'يلا كورة', category: 'sports', enabled: true },
  { url: 'https://www.filgoal.com/rss/', name: 'FilGoal', category: 'sports', enabled: true },
  { url: 'https://arabic.sport360.com/feed/', name: 'سبورت 360 عربي', category: 'sports', enabled: true },
  { url: 'https://www.beinsports.com/ar/rss', name: 'beIN Sports عربي', category: 'sports', enabled: true },


  // ══════════════════════════════════════════════════════════════════════
  // EDUCATION & SELF-IMPROVEMENT (تعليم وتطوير ذاتي)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.edutopia.org/rss.xml', name: 'Edutopia', category: 'education', enabled: true },
  { url: 'https://www.khanacademy.org/rss', name: 'Khan Academy', category: 'education', enabled: true },
  { url: 'https://blog.duolingo.com/feed/', name: 'Duolingo Blog', category: 'education', enabled: true },
  { url: 'https://www.coursera.org/blog/feed/', name: 'Coursera Blog', category: 'education', enabled: true },
  { url: 'https://jamesclear.com/feed', name: 'James Clear', category: 'education', enabled: true },
  { url: 'https://markmanson.net/feed', name: 'Mark Manson', category: 'education', enabled: true },
  { url: 'https://zenhabits.net/feed/', name: 'Zen Habits', category: 'education', enabled: true },
  { url: 'https://fs.blog/feed/', name: 'Farnam Street', category: 'education', enabled: true },
  { url: 'https://waitbutwhy.com/feed', name: 'Wait But Why', category: 'education', enabled: true },

  // Arabic education
  { url: 'https://www.arageek.com/edu/feed', name: 'أراجيك تعليم', category: 'education', enabled: true },
  { url: 'https://www.new-educ.com/feed', name: 'تعليم جديد', category: 'education', enabled: true },

  // ══════════════════════════════════════════════════════════════════════
  // DESIGN & CREATIVE (تصميم وإبداع)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.smashingmagazine.com/feed/', name: 'Smashing Magazine', category: 'design', enabled: true },
  { url: 'https://alistapart.com/main/feed/', name: 'A List Apart', category: 'design', enabled: true },
  { url: 'https://www.creativebloq.com/feed', name: 'Creative Bloq', category: 'design', enabled: true },
  { url: 'https://www.designboom.com/feed/', name: 'Designboom', category: 'design', enabled: true },
  { url: 'https://uxdesign.cc/feed', name: 'UX Collective', category: 'design', enabled: true },
  { url: 'https://www.nngroup.com/feed/rss/', name: 'Nielsen Norman Group', category: 'design', enabled: true },
  { url: 'https://blog.figma.com/feed', name: 'Figma Blog', category: 'design', enabled: true },
  { url: 'https://dribbble.com/stories.rss', name: 'Dribbble Stories', category: 'design', enabled: true },
  { url: 'https://www.awwwards.com/blog/feed/', name: 'Awwwards Blog', category: 'design', enabled: true },


  // ══════════════════════════════════════════════════════════════════════
  // GAMING (ألعاب)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.ign.com/articles.rss', name: 'IGN', category: 'gaming', enabled: true },
  { url: 'https://kotaku.com/rss', name: 'Kotaku', category: 'gaming', enabled: true },
  { url: 'https://www.polygon.com/rss/index.xml', name: 'Polygon', category: 'gaming', enabled: true },
  { url: 'https://www.gamespot.com/feeds/mashup/', name: 'GameSpot', category: 'gaming', enabled: true },
  { url: 'https://www.eurogamer.net/feed', name: 'Eurogamer', category: 'gaming', enabled: true },
  { url: 'https://www.pcgamer.com/rss/', name: 'PC Gamer', category: 'gaming', enabled: true },

  // Arabic gaming
  { url: 'https://www.arabhardware.net/feed/', name: 'عرب هاردوير', category: 'gaming', enabled: true },
  { url: 'https://saudigamer.com/feed/', name: 'سعودي جيمر', category: 'gaming', enabled: true },

  // ══════════════════════════════════════════════════════════════════════
  // FOOD & COOKING (طعام وطبخ)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.seriouseats.com/feeds/latest', name: 'Serious Eats', category: 'food', enabled: true },
  { url: 'https://www.bonappetit.com/feed/rss', name: 'Bon Appetit', category: 'food', enabled: true },
  { url: 'https://www.epicurious.com/feed/rss', name: 'Epicurious', category: 'food', enabled: true },
  { url: 'https://minimalistbaker.com/feed/', name: 'Minimalist Baker', category: 'food', enabled: true },

  // ══════════════════════════════════════════════════════════════════════
  // ENVIRONMENT & NATURE (بيئة وطبيعة)
  // ══════════════════════════════════════════════════════════════════════
  { url: 'https://www.treehugger.com/feeds/latest/', name: 'Treehugger', category: 'environment', enabled: true },
  { url: 'https://grist.org/feed/', name: 'Grist', category: 'environment', enabled: true },
  { url: 'https://www.carbonbrief.org/feed/', name: 'Carbon Brief', category: 'environment', enabled: true },
  { url: 'https://earther.gizmodo.com/rss', name: 'Earther', category: 'environment', enabled: true },
];


export const CATEGORIES: { id: string; ar: string; en: string }[] = [
  { id: 'news', ar: 'أخبار', en: 'News' },
  { id: 'tech', ar: 'تقنية', en: 'Tech' },
  { id: 'science', ar: 'علوم', en: 'Science' },
  { id: 'islamic', ar: 'إسلامي', en: 'Islamic' },
  { id: 'culture', ar: 'ثقافة', en: 'Culture' },
  { id: 'business', ar: 'أعمال', en: 'Business' },
  { id: 'health', ar: 'صحة', en: 'Health' },
  { id: 'sports', ar: 'رياضة', en: 'Sports' },
  { id: 'education', ar: 'تعليم', en: 'Education' },
  { id: 'design', ar: 'تصميم', en: 'Design' },
  { id: 'gaming', ar: 'ألعاب', en: 'Gaming' },
  { id: 'food', ar: 'طعام', en: 'Food' },
  { id: 'environment', ar: 'بيئة', en: 'Environment' },
  { id: 'other', ar: 'أخرى', en: 'Other' },
];
