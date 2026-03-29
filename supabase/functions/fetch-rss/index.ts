import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseXML(text: string, maxItems = 100) {
  const items: any[] = [];
  const isAtom = text.includes('<feed');
  
  if (isAtom) {
    const titleMatch = text.match(/<feed[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/);
    const feedTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Feed';
    
    const entryRegex = /<entry[\s\S]*?<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(text)) !== null && items.length < maxItems) {
      const entry = match[0];
      const t = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const l = entry.match(/<link[^>]*href=["']([^"']*)["']/);
      const summary = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
      const content = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);
      const d = entry.match(/<published>([\s\S]*?)<\/published>/) || entry.match(/<updated>([\s\S]*?)<\/updated>/);
      const img = entry.match(/<media:thumbnail[^>]*url=["']([^"']*)["']/) || entry.match(/<media:content[^>]*url=["']([^"']*)["']/);
      
      const fullHtml = content ? content[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() 
                     : summary ? summary[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : '';
      const descText = fullHtml.replace(/<[^>]+>/g, '').trim().slice(0, 500);
      
      const images: string[] = [];
      if (img) images.push(img[1]);
      const imgRegex = /<img[^>]*src=["']([^"']*)["']/g;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(fullHtml)) !== null) {
        if (!images.includes(imgMatch[1])) images.push(imgMatch[1]);
      }
      
      items.push({
        title: t ? t[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]+>/g, '').trim() : '',
        link: l ? l[1] : '',
        description: descText,
        fullContent: fullHtml,
        pubDate: d ? d[1].trim() : '',
        image: images[0] || null,
        images,
        source: feedTitle,
      });
    }
    return { title: feedTitle, items };
  }
  
  const channelTitle = text.match(/<channel>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/);
  const feedTitle = channelTitle ? channelTitle[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Feed';
  
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  let m;
  while ((m = itemRegex.exec(text)) !== null && items.length < maxItems) {
    const item_text = m[0];
    const t = item_text.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const l = item_text.match(/<link[^>]*>([\s\S]*?)<\/link>/);
    const desc = item_text.match(/<description[^>]*>([\s\S]*?)<\/description>/);
    const contentEncoded = item_text.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/);
    const d = item_text.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const enclosureImg = item_text.match(/<enclosure[^>]*url=["']([^"']*)["'][^>]*type=["']image/);
    const mediaContent = item_text.match(/<media:content[^>]*url=["']([^"']*)["']/);
    const mediaThumbnail = item_text.match(/<media:thumbnail[^>]*url=["']([^"']*)["']/);
    
    const rawFullContent = contentEncoded 
      ? contentEncoded[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim()
      : desc ? desc[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : '';
    
    const descText = rawFullContent.replace(/<[^>]+>/g, '').trim().slice(0, 500);
    
    const images: string[] = [];
    if (enclosureImg) images.push(enclosureImg[1]);
    if (mediaContent && !images.includes(mediaContent[1])) images.push(mediaContent[1]);
    if (mediaThumbnail && !images.includes(mediaThumbnail[1])) images.push(mediaThumbnail[1]);
    
    const imgRegex = /<img[^>]*src=["']([^"']*)["']/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(rawFullContent)) !== null) {
      if (!images.includes(imgMatch[1])) images.push(imgMatch[1]);
    }
    
    const link = l ? l[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : '';
    
    items.push({
      title: t ? t[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]+>/g, '').trim() : '',
      link,
      description: descText,
      fullContent: rawFullContent,
      pubDate: d ? d[1].trim() : '',
      image: images[0] || null,
      images,
      source: feedTitle,
    });
  }
  
  return { title: feedTitle, items };
}

// Fetch full article content from the web page
async function fetchArticleContent(url: string): Promise<{ content: string; images: string[] } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ar,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    
    // Collect all meaningful images
    const pageImages: string[] = [];
    const allImgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let im;
    while ((im = allImgRegex.exec(html)) !== null) {
      const src = im[1];
      if (src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar')
          && !src.includes('sprite') && !src.includes('pixel') && !src.includes('tracking')
          && !src.includes('1x1') && !src.includes('badge') && !src.includes('emoji')) {
        if (!pageImages.includes(src)) pageImages.push(src);
      }
    }

    let extracted: string | null = null;

    // === SANA specific (Foxiz theme / Elementor) ===
    if (url.includes('sana.sy')) {
      // Strategy A: entry-content with nested tag extraction
      const entryStart = html.indexOf('entry-content');
      if (entryStart !== -1) {
        // Find the parent div opening
        let divStart = html.lastIndexOf('<div', entryStart);
        if (divStart !== -1) {
          extracted = extractNestedTag(html, divStart, 'div');
          if (extracted && getTextLength(extracted) > 50) {
            return { content: cleanArticleHtml(extracted), images: pageImages };
          }
        }
      }
      
      // Strategy B: s-ct-inner container  
      const sctStart = html.indexOf('s-ct-inner');
      if (sctStart !== -1) {
        let divStart = html.lastIndexOf('<div', sctStart);
        if (divStart !== -1) {
          extracted = extractNestedTag(html, divStart, 'div');
          if (extracted && getTextLength(extracted) > 50) {
            return { content: cleanArticleHtml(extracted), images: pageImages };
          }
        }
      }

      // Strategy C: foxiz single content widget
      const foxizStart = html.indexOf('foxiz-single-content');
      if (foxizStart !== -1) {
        const afterFoxiz = html.substring(foxizStart);
        const pTags = afterFoxiz.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
        if (pTags && pTags.length > 0) {
          extracted = pTags.join('\n');
          if (getTextLength(extracted) > 50) {
            return { content: cleanArticleHtml(extracted), images: pageImages };
          }
        }
      }
    }

    // === Al Jazeera specific ===
    if (url.includes('aljazeera')) {
      // Al Jazeera renders client-side, so scraping won't work well.
      // We rely on RSS content:encoded which usually has the full article.
      // Try anyway with known patterns:
      const ajPatterns = [
        /class="[^"]*wysiwyg[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /class="[^"]*article-p[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
      ];
      for (const pattern of ajPatterns) {
        const match = html.match(pattern);
        if (match && getTextLength(match[1] || match[0]) > 100) {
          return { content: cleanArticleHtml(match[1] || match[0]), images: pageImages };
        }
      }
      // Fallback: collect all article paragraphs
      const articleParagraphs = extractLargestParagraphBlock(html);
      if (articleParagraphs && getTextLength(articleParagraphs) > 200) {
        return { content: cleanArticleHtml(articleParagraphs), images: pageImages };
      }
      return null; // Al Jazeera is JS-rendered, RSS content is our best bet
    }

    // === Generic strategies ===
    
    // 1: <article> tag
    const articleTag = html.indexOf('<article');
    if (articleTag !== -1) {
      extracted = extractNestedTag(html, articleTag, 'article');
      if (extracted && getTextLength(extracted) > 200) {
        return { content: cleanArticleHtml(extracted), images: pageImages };
      }
    }

    // 2: Common content class names
    const classPatterns = [
      'article-body', 'article-content', 'article__body', 'article__content',
      'post-content', 'post-body', 'entry-content', 'entry-body',
      'story-body', 'story-content', 'news-content', 'news-body',
      'detail-content', 'main-content', 'text-content', 'wysiwyg',
    ];
    
    for (const cls of classPatterns) {
      const idx = html.indexOf(cls);
      if (idx !== -1) {
        let divStart = html.lastIndexOf('<div', idx);
        if (divStart === -1) divStart = html.lastIndexOf('<section', idx);
        if (divStart !== -1) {
          const tag = html[divStart + 1] === 'd' ? 'div' : 'section';
          extracted = extractNestedTag(html, divStart, tag);
          if (extracted && getTextLength(extracted) > 200) {
            return { content: cleanArticleHtml(extracted), images: pageImages };
          }
        }
      }
    }

    // 3: Largest paragraph block
    extracted = extractLargestParagraphBlock(html);
    if (extracted && getTextLength(extracted) > 300) {
      return { content: cleanArticleHtml(extracted), images: pageImages };
    }

    return null;
  } catch (e) {
    console.error('fetchArticleContent error for', url, ':', e.message);
    return null;
  }
}

// Extract content of a tag starting at `startIdx`, handling nesting properly
function extractNestedTag(html: string, startIdx: number, tag: string): string | null {
  const openTag = `<${tag}`;
  const closeTag = `</${tag}>`;
  
  // Find the end of the opening tag
  const tagEnd = html.indexOf('>', startIdx);
  if (tagEnd === -1) return null;
  
  let depth = 1;
  let i = tagEnd + 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf(openTag, i);
    const nextClose = html.indexOf(closeTag, i);
    
    if (nextClose === -1) break;
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + openTag.length;
    } else {
      depth--;
      if (depth === 0) {
        return html.substring(tagEnd + 1, nextClose);
      }
      i = nextClose + closeTag.length;
    }
  }
  return null;
}

function extractLargestParagraphBlock(html: string): string | null {
  let cleaned = html
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const pRegex = /<p[^>]*>[\s\S]*?<\/p>/gi;
  const paragraphs: { text: string; start: number; end: number }[] = [];
  let match;
  while ((match = pRegex.exec(cleaned)) !== null) {
    const text = match[0].replace(/<[^>]+>/g, '').trim();
    if (text.length > 20) {
      paragraphs.push({ text: match[0], start: match.index, end: match.index + match[0].length });
    }
  }
  
  if (paragraphs.length === 0) return null;
  
  let bestStart = 0, bestEnd = 0, bestCount = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    let count = 1;
    let end = i;
    for (let j = i + 1; j < paragraphs.length; j++) {
      if (paragraphs[j].start - paragraphs[end].end < 500) {
        count++;
        end = j;
      } else break;
    }
    if (count > bestCount) {
      bestCount = count;
      bestStart = i;
      bestEnd = end;
    }
  }
  
  if (bestCount < 2) return null;
  
  const blockStart = paragraphs[bestStart].start;
  const blockEnd = paragraphs[bestEnd].end;
  return cleaned.substring(blockStart, blockEnd);
}

function getTextLength(html: string): number {
  return html.replace(/<[^>]+>/g, '').trim().length;
}

function cleanArticleHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<input[^>]*>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<div[^>]*class="[^"]*(?:share|social|comment|related|sidebar|widget|ad-|advertisement|newsletter|signup|subscribe|efoot|e-shared|tag-bar)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/class="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/id="[^"]*"/gi, '')
    .replace(/data-[a-z-]+="[^"]*"/gi, '')
    .replace(/onclick="[^"]*"/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

async function storeArticlesInDB(items: any[], sourceUrl: string, sourceName: string) {
  const sb = getSupabaseClient();
  
  const links = items.map(i => i.link).filter(Boolean);
  if (links.length === 0) return;
  
  const { data: existing } = await sb
    .from('rss_articles')
    .select('link, full_content')
    .in('link', links);
  
  const existingMap = new Map<string, string>();
  (existing || []).forEach((r: any) => existingMap.set(r.link, r.full_content || ''));
  
  const toUpsert: any[] = [];
  
  for (const item of items) {
    if (!item.link) continue;
    const existingContent = existingMap.get(item.link);
    const newContentLen = (item.fullContent || '').length;
    
    // Skip if article exists and has better or equal content
    if (existingContent !== undefined && newContentLen <= (existingContent?.length || 0)) {
      continue;
    }
    
    toUpsert.push({
      title: item.title,
      link: item.link,
      description: item.description || '',
      full_content: item.fullContent || '',
      pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      image: item.image,
      images: item.images || [],
      source_name: sourceName,
      source_url: sourceUrl,
    });
  }
  
  if (toUpsert.length > 0) {
    // Batch upsert in chunks of 50
    for (let i = 0; i < toUpsert.length; i += 50) {
      const batch = toUpsert.slice(i, i + 50);
      const { error } = await sb.from('rss_articles').upsert(batch, { onConflict: 'link' });
      if (error) console.error('DB upsert error:', error.message);
    }
  }
  
  console.log(`Stored/updated ${toUpsert.length} articles for ${sourceName} (total parsed: ${items.length})`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, limit, fetchFullContent, store, nameMap } = await req.json();
    const maxItems = Math.min(limit || 100, 200);
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "No URLs provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.allSettled(
      urls.map(async (url: string) => {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsReader/2.0)" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parsed = parseXML(text, maxItems);
        
        const sourceName = (nameMap && nameMap[url]) || parsed.title;
        
        // Fetch full content for articles that need it
        if (fetchFullContent) {
          // For Al Jazeera, RSS content:encoded already has good content
          // Only scrape for sources where RSS content is incomplete
          const itemsNeedingContent = parsed.items.filter((item: any) => {
            const contentLen = getTextLength(item.fullContent || '');
            // If content from RSS is already substantial (>500 chars text), skip scraping
            return contentLen < 500 && item.link;
          });
          
          console.log(`${parsed.items.length} total, ${itemsNeedingContent.length} need scraping for ${sourceName}`);
          
          // Process in batches of 5
          const batchSize = 5;
          for (let i = 0; i < itemsNeedingContent.length; i += batchSize) {
            const batch = itemsNeedingContent.slice(i, i + batchSize);
            await Promise.allSettled(
              batch.map(async (item: any) => {
                const result = await fetchArticleContent(item.link);
                if (result) {
                  if (result.content && result.content.length > (item.fullContent?.length || 0)) {
                    item.fullContent = result.content;
                    item.description = result.content.replace(/<[^>]+>/g, '').trim().slice(0, 500);
                  }
                  if (result.images.length > 0) {
                    const existing = item.images || [];
                    for (const img of result.images) {
                      if (!existing.includes(img)) existing.push(img);
                    }
                    item.images = existing;
                    if (!item.image && existing.length > 0) item.image = existing[0];
                  }
                }
              })
            );
          }
        }
        
        // Store in DB
        if (store) {
          parsed.items.forEach((item: any) => item.source = sourceName);
          await storeArticlesInDB(parsed.items, url, sourceName);
        }
        
        return { url, title: parsed.title, items: parsed.items, count: parsed.items.length };
      })
    );

    const feeds = results
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value);
    
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error('Failed feeds:', failed.map((r: any) => r.reason?.message));
    }

    return new Response(JSON.stringify({ feeds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
