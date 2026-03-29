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
        hasRichContent: !!(content),
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
    
    const hasRichContent = !!contentEncoded;
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

async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { "User-Agent": "ReadYou/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    
    let articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) return cleanArticleHtml(articleMatch[1]);
    
    const contentPatterns = [
      /class="[^"]*(?:article-body|article-content|post-content|entry-content|story-body|wysiwyg)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match && match[1].length > 200) return cleanArticleHtml(match[1]);
    }
    
    return null;
  } catch {
    return null;
  }
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
    .replace(/class="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/id="[^"]*"/gi, '')
    .replace(/data-[a-z-]+="[^"]*"/gi, '')
    .trim();
}

function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

async function storeArticlesInDB(items: any[], sourceUrl: string, sourceName: string) {
  const sb = getSupabaseClient();
  const rows = items.map(item => ({
    title: item.title,
    link: item.link,
    description: item.description || '',
    full_content: item.fullContent || '',
    pub_date: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    image: item.image,
    images: item.images || [],
    source_name: sourceName,
    source_url: sourceUrl,
  }));

  // Upsert - skip duplicates based on link
  const { error } = await sb
    .from('rss_articles')
    .upsert(rows, { onConflict: 'link', ignoreDuplicates: true });
  
  if (error) console.error('DB store error:', error.message);
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
          headers: { "User-Agent": "ReadYou/1.0" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parsed = parseXML(text, maxItems);
        
        // For items without rich content, try to fetch full article
        if (fetchFullContent) {
          const itemsNeedingContent = parsed.items.filter((item: any) => !item.hasRichContent && item.link);
          const toFetch = itemsNeedingContent.slice(0, 10);
          await Promise.allSettled(
            toFetch.map(async (item: any) => {
              const content = await fetchArticleContent(item.link);
              if (content && content.length > (item.fullContent?.length || 0)) {
                item.fullContent = content;
              }
            })
          );
        }
        
        // Determine source name
        const sourceName = (nameMap && nameMap[url]) || parsed.title;
        
        // Store in DB if requested
        if (store) {
          await storeArticlesInDB(parsed.items, url, sourceName);
        }
        
        // Clean up internal field
        parsed.items.forEach((item: any) => delete item.hasRichContent);
        
        return { url, ...parsed };
      })
    );

    const feeds = results
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value);

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
