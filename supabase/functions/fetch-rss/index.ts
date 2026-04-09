import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  // TODO: تقييد بدومين التطبيق عند الإنتاج
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedItem {
  title: string;
  link: string;
  description: string;
  fullContent: string;
  pubDate: string;
  image: string | null;
  images: string[];
  source: string;
}

// ── Simple, robust XML parser ──
function parseRSS(xml: string, maxItems: number): { title: string; items: FeedItem[] } {
  const isAtom = xml.includes('<feed');
  const items: FeedItem[] = [];

  const cdata = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();
  const getTag = (block: string, tag: string): string => {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = block.match(re);
    return m ? cdata(m[1]) : '';
  };
  const getAttr = (block: string, tag: string, attr: string): string => {
    const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["']`, 'i');
    const m = block.match(re);
    return m ? m[1] : '';
  };
  const extractImages = (html: string): string[] => {
    const imgs: string[] = [];
    const re = /<img[^>]*src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (m[1].startsWith('http') && !m[1].includes('pixel') && !m[1].includes('1x1') && !m[1].includes('tracking')) {
        if (!imgs.includes(m[1])) imgs.push(m[1]);
      }
    }
    return imgs;
  };

  // Feed title
  let feedTitle = 'Feed';
  if (isAtom) {
    feedTitle = stripTags(getTag(xml.substring(0, 2000), 'title')) || 'Feed';
  } else {
    const ch = xml.match(/<channel>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/);
    if (ch) feedTitle = cdata(stripTags(ch[1]));
  }

  if (isAtom) {
    // Atom
    const entryRe = /<entry[\s\S]*?<\/entry>/g;
    let m;
    while ((m = entryRe.exec(xml)) !== null && items.length < maxItems) {
      const e = m[0];
      const title = stripTags(getTag(e, 'title'));
      const link = getAttr(e, 'link', 'href');
      const content = getTag(e, 'content') || getTag(e, 'summary');
      const pubDate = getTag(e, 'published') || getTag(e, 'updated');
      const mediaImg = getAttr(e, 'media:thumbnail', 'url') || getAttr(e, 'media:content', 'url');
      const contentImgs = extractImages(content);
      const images = mediaImg ? [mediaImg, ...contentImgs.filter(i => i !== mediaImg)] : contentImgs;

      items.push({
        title,
        link,
        description: stripTags(content).slice(0, 500),
        fullContent: content,
        pubDate,
        image: images[0] || null,
        images,
        source: feedTitle,
      });
    }
  } else {
    // RSS 2.0
    const itemRe = /<item[\s\S]*?<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null && items.length < maxItems) {
      const it = m[0];
      const title = stripTags(getTag(it, 'title'));
      // Link can be inside CDATA or plain text
      let link = cdata(getTag(it, 'link'));
      if (!link) {
        const linkMatch = it.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        if (linkMatch) link = cdata(linkMatch[1]).trim();
      }
      
      // Prefer content:encoded over description
      const contentEncoded = getTag(it, 'content:encoded');
      const desc = getTag(it, 'description');
      const fullContent = contentEncoded || desc;
      const description = stripTags(fullContent).slice(0, 500);
      const pubDate = getTag(it, 'pubDate') || getTag(it, 'dc:date');

      // Images: enclosure, media:content, media:thumbnail, then inline
      const images: string[] = [];
      const enclosure = getAttr(it, 'enclosure', 'url');
      if (enclosure && (it.includes('type="image') || enclosure.match(/\.(jpg|jpeg|png|webp|gif)/i))) {
        images.push(enclosure);
      }
      const mediaContent = getAttr(it, 'media:content', 'url');
      if (mediaContent && !images.includes(mediaContent)) images.push(mediaContent);
      const mediaThumbnail = getAttr(it, 'media:thumbnail', 'url');
      if (mediaThumbnail && !images.includes(mediaThumbnail)) images.push(mediaThumbnail);
      // Inline images
      for (const img of extractImages(fullContent)) {
        if (!images.includes(img)) images.push(img);
      }

      items.push({
        title,
        link,
        description,
        fullContent,
        pubDate,
        image: images[0] || null,
        images,
        source: feedTitle,
      });
    }
  }

  return { title: feedTitle, items };
}

// ── Fetch full article from web page ──
async function scrapeArticle(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSSReader/1.0)",
        "Accept": "text/html",
        "Accept-Language": "ar,en;q=0.5",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();

    // Remove noise
    let clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Strategy 1: <article> tag
    const articleMatch = clean.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch && stripText(articleMatch[1]).length > 200) {
      return cleanHtml(articleMatch[1]);
    }

    // Strategy 2: Common content container classes
    const contentClasses = [
      'entry-content', 'article-body', 'article-content', 'post-content',
      'story-body', 'news-content', 'wysiwyg', 'content-body',
      'single-content', 's-ct-inner', 'rbct',
    ];
    for (const cls of contentClasses) {
      const idx = clean.indexOf(cls);
      if (idx !== -1) {
        // Find the container div
        const before = clean.lastIndexOf('<div', idx);
        if (before !== -1) {
          const content = extractContainer(clean, before);
          if (content && stripText(content).length > 200) {
            return cleanHtml(content);
          }
        }
      }
    }

    // Strategy 3: Largest cluster of <p> tags
    const pRegex = /<p[^>]*>[\s\S]*?<\/p>/gi;
    const paragraphs: string[] = [];
    let pm;
    while ((pm = pRegex.exec(clean)) !== null) {
      const text = stripText(pm[0]);
      if (text.length > 30) paragraphs.push(pm[0]);
    }
    if (paragraphs.length >= 3) {
      return cleanHtml(paragraphs.join('\n'));
    }

    return null;
  } catch {
    return null;
  }
}

function extractContainer(html: string, startIdx: number): string | null {
  const tagEnd = html.indexOf('>', startIdx);
  if (tagEnd === -1) return null;
  let depth = 1;
  let i = tagEnd + 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) return html.substring(tagEnd + 1, nextClose);
      i = nextClose + 6;
    }
  }
  return null;
}

function stripText(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<div[^>]*class="[^"]*(?:share|social|comment|related|sidebar|widget|ad-|newsletter|subscribe|tag-bar)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/class="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/id="[^"]*"/gi, '')
    .replace(/data-[a-z-]+="[^"]*"/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function storeInDB(items: FeedItem[], sourceUrl: string, sourceName: string) {
  const sb = getSupabase();
  const links = items.map(i => i.link).filter(Boolean);
  if (links.length === 0) return;

  // Get existing articles to compare content length
  const { data: existing } = await sb
    .from('rss_articles')
    .select('link, full_content')
    .in('link', links);

  const existingMap = new Map<string, number>();
  (existing || []).forEach((r: any) => existingMap.set(r.link, (r.full_content || '').length));

  const toUpsert: any[] = [];
  for (const item of items) {
    if (!item.link) continue;
    const existLen = existingMap.get(item.link);
    const newLen = (item.fullContent || '').length;
    // Only upsert if new or has more content
    if (existLen !== undefined && newLen <= existLen) continue;

    let parsedDate: string | null = null;
    if (item.pubDate) {
      try { parsedDate = new Date(item.pubDate).toISOString(); } catch { /* skip */ }
    }

    toUpsert.push({
      title: item.title,
      link: item.link,
      description: item.description || '',
      full_content: item.fullContent || '',
      pub_date: parsedDate,
      image: item.image,
      images: item.images || [],
      source_name: sourceName,
      source_url: sourceUrl,
    });
  }

  if (toUpsert.length > 0) {
    for (let i = 0; i < toUpsert.length; i += 50) {
      const batch = toUpsert.slice(i, i + 50);
      const { error } = await sb.from('rss_articles').upsert(batch, { onConflict: 'link' });
      if (error) console.error('DB upsert error:', error.message);
    }
    console.log(`Stored ${toUpsert.length} articles for ${sourceName}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { urls, limit, fetchFullContent, store, nameMap } = body;
    const maxItems = Math.min(limit || 50, 200);

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "No URLs provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Fetch and parse all feeds in parallel (fast)
    const feedResults = await Promise.allSettled(
      urls.map(async (url: string) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSReader/1.0)" },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          const parsed = parseRSS(text, maxItems);
          const sourceName = nameMap?.[url] || parsed.title;
          // Set source name on each item
          parsed.items.forEach(item => { item.source = sourceName; });
          return { url, title: parsed.title, sourceName, items: parsed.items };
        } catch (e: any) {
          clearTimeout(timeout);
          throw new Error(`Failed to fetch ${url}: ${e.message}`);
        }
      })
    );

    const successFeeds = feedResults
      .filter(r => r.status === 'fulfilled')
      .map((r: any) => r.value);

    const failedFeeds = feedResults
      .filter(r => r.status === 'rejected')
      .map((r: any) => r.reason?.message || 'Unknown error');

    if (failedFeeds.length > 0) {
      console.error('Failed feeds:', failedFeeds);
    }

    // Step 2: Scrape full content for articles that need it (in background, don't block response)
    // Only scrape if requested AND we're storing
    if (fetchFullContent && store) {
      // Do scraping + storing in background (non-blocking)
      const bgPromise = (async () => {
        for (const feed of successFeeds) {
          const needsScraping = feed.items.filter((item: FeedItem) => {
            const textLen = stripText(item.fullContent || '').length;
            return textLen < 300 && item.link;
          });

          if (needsScraping.length > 0) {
            console.log(`Scraping ${needsScraping.length}/${feed.items.length} articles for ${feed.sourceName}`);
            // Process in batches of 5
            for (let i = 0; i < needsScraping.length; i += 5) {
              const batch = needsScraping.slice(i, i + 5);
              await Promise.allSettled(
                batch.map(async (item: FeedItem) => {
                  const scraped = await scrapeArticle(item.link);
                  if (scraped && scraped.length > (item.fullContent?.length || 0)) {
                    item.fullContent = scraped;
                    item.description = stripText(scraped).slice(0, 500);
                  }
                })
              );
            }
          }

          // Store all items for this feed
          await storeInDB(feed.items, feed.url, feed.sourceName);
        }
      })();

      // Wait max 25 seconds for background work, then respond anyway
      await Promise.race([
        bgPromise,
        new Promise(resolve => setTimeout(resolve, 25000)),
      ]);
    } else if (store) {
      // Store without scraping
      for (const feed of successFeeds) {
        await storeInDB(feed.items, feed.url, feed.sourceName);
      }
    }

    // Return parsed feed items immediately
    const feeds = successFeeds.map(f => ({
      url: f.url,
      title: f.title,
      items: f.items,
      count: f.items.length,
    }));

    return new Response(JSON.stringify({ feeds, errors: failedFeeds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error('Handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
