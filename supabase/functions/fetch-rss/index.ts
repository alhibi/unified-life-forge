import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseXML(text: string) {
  const items: any[] = [];
  const isAtom = text.includes('<feed');
  
  if (isAtom) {
    // Parse Atom feed
    const titleMatch = text.match(/<feed[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/);
    const feedTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Feed';
    
    const entryRegex = /<entry[\s\S]*?<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(text)) !== null) {
      const entry = match[0];
      const t = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const l = entry.match(/<link[^>]*href=["']([^"']*)["']/);
      const s = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);
      const d = entry.match(/<published>([\s\S]*?)<\/published>/) || entry.match(/<updated>([\s\S]*?)<\/updated>/);
      const img = entry.match(/<media:thumbnail[^>]*url=["']([^"']*)["']/) || entry.match(/<img[^>]*src=["']([^"']*)["']/);
      
      items.push({
        title: t ? t[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]+>/g, '').trim() : '',
        link: l ? l[1] : '',
        description: s ? s[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]+>/g, '').trim().slice(0, 300) : '',
        pubDate: d ? d[1].trim() : '',
        image: img ? img[1] : null,
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
  while ((m = itemRegex.exec(text)) !== null) {
    const item_text = m[0];
    const t = item_text.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const l = item_text.match(/<link[^>]*>([\s\S]*?)<\/link>/);
    const desc = item_text.match(/<description[^>]*>([\s\S]*?)<\/description>/);
    const d = item_text.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const img = item_text.match(/<enclosure[^>]*url=["']([^"']*)["'][^>]*type=["']image/) ||
                item_text.match(/<media:content[^>]*url=["']([^"']*)["']/) ||
                item_text.match(/<media:thumbnail[^>]*url=["']([^"']*)["']/);
    
    let descText = desc ? desc[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]+>/g, '').trim().slice(0, 300) : '';
    
    // Try to extract image from description HTML if no explicit image
    let imgUrl = img ? img[1] : null;
    if (!imgUrl && desc) {
      const descImg = desc[1].match(/<img[^>]*src=["']([^"']*)["']/);
      if (descImg) imgUrl = descImg[1];
    }
    
    items.push({
      title: t ? t[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]+>/g, '').trim() : '',
      link: l ? l[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : '',
      description: descText,
      pubDate: d ? d[1].trim() : '',
      image: imgUrl,
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
    const { urls } = await req.json();
    
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
        return { url, ...parseXML(text) };
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
