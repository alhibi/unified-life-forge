import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseXML(text: string, maxItems = 50) {
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
      const descText = fullHtml.replace(/<[^>]+>/g, '').trim().slice(0, 300);
      
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
        hasRichContent: !!(content && fullHtml.length > 300),
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
    
    const hasRichContent = !!contentEncoded && rawFullContent.length > 300;
    const descText = rawFullContent.replace(/<[^>]+>/g, '').trim().slice(0, 300);
    
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
      hasRichContent,
      pubDate: d ? d[1].trim() : '',
      image: images[0] || null,
      images,
      source: feedTitle,
    });
  }
  
  return { title: feedTitle, items };
}

// Robust article content extractor - tries multiple strategies
async function fetchArticleContent(url: string): Promise<{ content: string; images: string[] } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ar,en;q=0.9",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    
    // Extract all images from the page for enrichment
    const pageImages: string[] = [];
    const allImgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let im;
    while ((im = allImgRegex.exec(html)) !== null) {
      const src = im[1];
      if (src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar')
          && !src.includes('sprite') && !src.includes('pixel') && !src.includes('tracking')
          && !src.includes('1x1') && !src.includes('badge')) {
        if (!pageImages.includes(src)) pageImages.push(src);
      }
    }

    let extracted: string | null = null;

    // Strategy 1: Find the deepest/largest <article> tag
    extracted = extractByTag(html, 'article');
    if (extracted && getTextLength(extracted) > 200) {
      return { content: cleanArticleHtml(extracted), images: pageImages };
    }

    // Strategy 2: Common content container class names (comprehensive list)
    const classPatterns = [
      'article-body', 'article-content', 'article__body', 'article__content',
      'post-content', 'post-body', 'post__content', 'post__body',
      'entry-content', 'entry-body',
      'story-body', 'story-content', 'story__body',
      'wysiwyg', 'rich-text', 'text-content',
      'single-post-content', 'single__content',
      'node__content', 'field--name-body',
      'td-post-content', 'tdb-block-inner',
      'c-article-body', 'article-detail',
      'detail-content', 'news-content', 'news-body', 'news-detail',
      'content-article', 'main-content',
    ];
    
    for (const cls of classPatterns) {
      const regex = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)(?=<\\/(?:div|section|main))`, 'i');
      const match = html.match(regex);
      if (match && getTextLength(match[1]) > 200) {
        extracted = match[1];
        return { content: cleanArticleHtml(extracted), images: pageImages };
      }
    }

    // Strategy 3: WordPress specific - look for .entry-content or #content
    const wpPatterns = [
      /id="content"[^>]*>([\s\S]*?)(?=<\/(?:div|main|section)>[\s\S]*?<(?:footer|aside|div[^>]*(?:sidebar|widget|comment)))/i,
      /class="[^"]*the_content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    for (const pattern of wpPatterns) {
      const match = html.match(pattern);
      if (match && getTextLength(match[1]) > 200) {
        return { content: cleanArticleHtml(match[1]), images: pageImages };
      }
    }

    // Strategy 4: Al Jazeera specific patterns
    if (url.includes('aljazeera')) {
      const ajPatterns = [
        /class="[^"]*wysiwyg[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      ];
      for (const pattern of ajPatterns) {
        const match = html.match(pattern);
        if (match && getTextLength(match[1]) > 100) {
          return { content: cleanArticleHtml(match[1]), images: pageImages };
        }
      }
    }

    // Strategy 5: SANA specific
    if (url.includes('sana.sy')) {
      const sanaMatch = html.match(/class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (sanaMatch && getTextLength(sanaMatch[1]) > 100) {
        return { content: cleanArticleHtml(sanaMatch[1]), images: pageImages };
      }
    }

    // Strategy 6: Find the largest text block with <p> tags
    extracted = extractLargestParagraphBlock(html);
    if (extracted && getTextLength(extracted) > 300) {
      return { content: cleanArticleHtml(extracted), images: pageImages };
    }

    return null;
  } catch (e) {
    console.error('fetchArticleContent error:', e.message);
    return null;
  }
}

// Extract content from a specific HTML tag, handling nesting
function extractByTag(html: string, tag: string): string | null {
  const openTag = `<${tag}`;
  const closeTag = `</${tag}>`;
  let startIdx = html.indexOf(openTag);
  if (startIdx === -1) return null;
  
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

// Find the largest block of consecutive <p> tags
function extractLargestParagraphBlock(html: string): string | null {
  // Remove nav, header, footer, sidebar, comments
  let cleaned = html
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Find all <p> tags with their positions
  const pRegex = /<p[^>]*>[\s\S]*?<\/p>/gi;
  const paragraphs: { text: string; start: number; end: number }[] = [];
  let match;
  while ((match = pRegex.exec(cleaned)) !== null) {
    const text = match[0].replace(/<[^>]+>/g, '').trim();
    if (text.length > 30) {
      paragraphs.push({ text: match[0], start: match.index, end: match.index + match[0].length });
    }
  }
  
  if (paragraphs.length === 0) return null;
  
  // Find the largest cluster of nearby paragraphs
  let bestStart = 0, bestEnd = 0, bestCount = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    let count = 1;
    let end = i;
    for (let j = i + 1; j < paragraphs.length; j++) {
      // If gap between paragraphs is less than 500 chars, consider them in same block
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
  
  // Extract the block including content between paragraphs (images, etc)
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
    .replace(/<div[^>]*class="[^"]*(?:share|social|comment|related|sidebar|widget|ad-|advertisement|newsletter|signup|subscribe)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
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
  
  // Check which articles already exist with full content
  const links = items.map(i => i.link).filter(Boolean);
  const { data: existing } = await sb
    .from('rss_articles')
    .select('link, full_content')
    .in('link', links);
  
  const existingMap = new Map<string, string>();
  (existing || []).forEach((r: any) => existingMap.set(r.link, r.full_content || ''));
  
  const toInsert: any[] = [];
  const toUpdate: any[] = [];
  
  for (const item of items) {
    if (!item.link) continue;
    const existingContent = existingMap.get(item.link);
    const row = {
      title: item.title,
      link: item.link,
      description: item.description || '',
      full_content: item.fullContent || '',
      pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      image: item.image,
      images: item.images || [],
      source_name: sourceName,
      source_url: sourceUrl,
    };
    
    if (existingContent === undefined) {
      // New article
      toInsert.push(row);
    } else if (item.fullContent && item.fullContent.length > (existingContent?.length || 0)) {
      // Existing but we have better content now - update
      toUpdate.push(row);
    }
  }
  
  if (toInsert.length > 0) {
    const { error } = await sb.from('rss_articles').upsert(toInsert, { onConflict: 'link', ignoreDuplicates: true });
    if (error) console.error('DB insert error:', error.message);
  }
  
  // Update articles with better content
  for (const row of toUpdate) {
    const { error } = await sb.from('rss_articles')
      .update({ full_content: row.full_content, images: row.images, image: row.image })
      .eq('link', row.link);
    if (error) console.error('DB update error:', error.message);
  }
  
  console.log(`Stored: ${toInsert.length} new, ${toUpdate.length} updated for ${sourceName}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, limit, fetchFullContent, store, nameMap } = await req.json();
    const maxItems = Math.min(limit || 50, 100);
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "No URLs provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.allSettled(
      urls.map(async (url: string) => {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ReadYou/1.0)" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parsed = parseXML(text, maxItems);
        
        // Fetch full content for ALL articles that lack it - process in batches of 5
        if (fetchFullContent) {
          const itemsNeedingContent = parsed.items.filter((item: any) => !item.hasRichContent && item.link);
          console.log(`${itemsNeedingContent.length} articles need full content from ${url}`);
          
          // Process in parallel batches of 5 to stay within timeout
          const batchSize = 5;
          for (let i = 0; i < itemsNeedingContent.length; i += batchSize) {
            const batch = itemsNeedingContent.slice(i, i + batchSize);
            await Promise.allSettled(
              batch.map(async (item: any) => {
                const result = await fetchArticleContent(item.link);
                if (result) {
                  if (result.content && result.content.length > (item.fullContent?.length || 0)) {
                    item.fullContent = result.content;
                  }
                  // Enrich images
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
        
        const sourceName = (nameMap && nameMap[url]) || parsed.title;
        
        // Store in DB
        if (store) {
          // Pass sourceName to items before storing
          parsed.items.forEach((item: any) => item.source = sourceName);
          await storeArticlesInDB(parsed.items, url, sourceName);
        }
        
        // Clean up internal fields
        parsed.items.forEach((item: any) => delete item.hasRichContent);
        
        return { url, ...parsed };
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
