import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
      
      // Get full content HTML, prefer <content> over <summary>
      const fullHtml = content ? content[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() 
                     : summary ? summary[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : '';
      const descText = fullHtml.replace(/<[^>]+>/g, '').trim().slice(0, 300);
      
      // Extract all images from content
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
  
  // Parse RSS 2.0
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
    
    // Full content: prefer content:encoded > description
    const rawFullContent = contentEncoded 
      ? contentEncoded[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim()
      : desc ? desc[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : '';
    
    const descText = rawFullContent.replace(/<[^>]+>/g, '').trim().slice(0, 300);
    
    // Extract images
    const images: string[] = [];
    if (enclosureImg) images.push(enclosureImg[1]);
    if (mediaContent && !images.includes(mediaContent[1])) images.push(mediaContent[1]);
    if (mediaThumbnail && !images.includes(mediaThumbnail[1])) images.push(mediaThumbnail[1]);
    
    const imgRegex = /<img[^>]*src=["']([^"']*)["']/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(rawFullContent)) !== null) {
      if (!images.includes(imgMatch[1])) images.push(imgMatch[1]);
    }
    
    items.push({
      title: t ? t[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]+>/g, '').trim() : '',
      link: l ? l[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : '',
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, limit } = await req.json();
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
        return { url, ...parseXML(text, maxItems) };
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
