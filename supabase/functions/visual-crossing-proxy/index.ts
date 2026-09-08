// Visual Crossing proxy — keeps the API key server-side.
// The client weather engine calls this function with lat/lng; the function
// reads VISUAL_CROSSING_API_KEY from the secret store and returns only the
// climatology fields the app needs.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('VISUAL_CROSSING_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'visual_crossing_not_configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      lat: url.searchParams.get('lat'),
      lng: url.searchParams.get('lng'),
    });
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { lat, lng } = parsed.data;

    const upstream =
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/` +
      `${lat.toFixed(2)},${lng.toFixed(2)}/today?unitGroup=metric&include=days,current` +
      `&elements=temp,tempmax,tempmin,precip&key=${apiKey}&contentType=json`;

    const res = await fetch(upstream, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `upstream_${res.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const data = await res.json();
    const today = data?.days?.[0] ?? null;

    return new Response(
      JSON.stringify({
        temp: today?.temp ?? null,
        tempmax: today?.tempmax ?? null,
        tempmin: today?.tempmin ?? null,
        precip: today?.precip ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
