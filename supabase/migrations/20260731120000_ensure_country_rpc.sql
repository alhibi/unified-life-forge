-- Restore "save a place in a country the catalogue has not seen yet", without
-- reopening the hole that closing it created.
--
-- THE HISTORY
--
-- 20260724211109 added:
--
--     CREATE POLICY "Auth users can add countries" ON public.countries
--       FOR INSERT TO authenticated WITH CHECK (true);
--
-- `countries` is world-readable reference data (`FOR SELECT USING (true)`, granted
-- to anon), so that policy let any authenticated account write arbitrary rows —
-- any `iso_code`, unbounded `name_ar`/`name_en`, any `bounds`, any `places_count` —
-- into a table every other user reads. It is the one table in this schema where
-- one account's writes are visible to all the others.
--
-- 20260725093631 correctly dropped it. But nothing replaced it, and
-- `src/features/travel-atlas/api.ts` still inserts directly:
--
--     async function ensureCountry(entry: AtlasCountry): Promise<string> {
--       ... .from('countries').insert({ ... })
--       if (insertError) throw insertError;
--
-- `ensureCountry` is called from `createPlace`, and it throws. So since that
-- migration, saving a place in any country without an existing row has failed
-- outright with an RLS violation — the feature was traded away silently as
-- collateral of the fix. The comment above `ensureCountry` even records the
-- contradiction: "Country rows are public reference data with no client write
-- policy, so the first place saved in a country creates its row."
--
-- THE FIX
--
-- A SECURITY DEFINER function, which is the pattern the same hardening migration
-- used for `search_profiles`. The client can create a country row, but only one
-- this function is willing to build:
--
--   • the caller must be authenticated;
--   • `iso_code` must be exactly two uppercase letters (ISO 3166-1 alpha-2), which
--     together with the UNIQUE constraint caps the table at 676 possible rows;
--   • names must be non-empty and at most 120 characters, so the column cannot be
--     used as free storage or to push unbounded text into every other client's
--     atlas render;
--   • `continent` must be one of the seven values the app's own dataset uses
--     (src/features/travel-atlas/data/worldCountries.generated.ts), or NULL;
--   • `bounds` must be the {sw:[lng,lat], ne:[lng,lat]} shape the map reads, with
--     coordinates actually on Earth. A longitude of 1e9 would send every user's
--     fit-to-bounds to nowhere;
--   • `places_count` and `cover_image_url` are never taken from the caller. They
--     are server-owned, and `WITH CHECK (true)` previously allowed seeding the
--     counter at two billion.
--
-- It is also idempotent: concurrent first-saves in the same country race, so it
-- returns the existing id rather than failing on the UNIQUE constraint.
--
-- There is still no INSERT, UPDATE or DELETE policy for `authenticated` on
-- `countries`, so this function is the only client write path and every real
-- country row remains immutable from a client.

BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_country(
  p_iso_code   text,
  p_name_ar    text,
  p_name_en    text,
  p_bounds     jsonb,
  p_continent  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id       uuid;
  v_iso      text := upper(btrim(coalesce(p_iso_code, '')));
  v_name_ar  text := btrim(coalesce(p_name_ar, ''));
  v_name_en  text := btrim(coalesce(p_name_en, ''));
  v_cont     text := nullif(btrim(coalesce(p_continent, '')), '');
  v_sw_lng   numeric;
  v_sw_lat   numeric;
  v_ne_lng   numeric;
  v_ne_lat   numeric;
BEGIN
  -- SECURITY DEFINER runs as the owner, so the function must do the authorisation
  -- the dropped policy used to do.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'atlas:unauthorized' USING ERRCODE = '42501';
  END IF;

  IF v_iso !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'atlas:invalid_iso_code' USING ERRCODE = '22023';
  END IF;

  IF length(v_name_ar) NOT BETWEEN 1 AND 120
     OR length(v_name_en) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'atlas:invalid_country_name' USING ERRCODE = '22023';
  END IF;

  IF v_cont IS NOT NULL AND v_cont NOT IN (
       'Africa', 'Asia', 'Europe', 'North America',
       'Oceania', 'South America', 'Seven seas (open ocean)'
     ) THEN
    RAISE EXCEPTION 'atlas:invalid_continent' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_bounds) <> 'object'
     OR jsonb_typeof(p_bounds -> 'sw') <> 'array'
     OR jsonb_typeof(p_bounds -> 'ne') <> 'array'
     OR jsonb_array_length(p_bounds -> 'sw') <> 2
     OR jsonb_array_length(p_bounds -> 'ne') <> 2
     OR jsonb_typeof(p_bounds -> 'sw' -> 0) <> 'number'
     OR jsonb_typeof(p_bounds -> 'sw' -> 1) <> 'number'
     OR jsonb_typeof(p_bounds -> 'ne' -> 0) <> 'number'
     OR jsonb_typeof(p_bounds -> 'ne' -> 1) <> 'number' THEN
    RAISE EXCEPTION 'atlas:invalid_bounds' USING ERRCODE = '22023';
  END IF;

  v_sw_lng := (p_bounds -> 'sw' -> 0)::numeric;
  v_sw_lat := (p_bounds -> 'sw' -> 1)::numeric;
  v_ne_lng := (p_bounds -> 'ne' -> 0)::numeric;
  v_ne_lat := (p_bounds -> 'ne' -> 1)::numeric;

  IF v_sw_lng NOT BETWEEN -180 AND 180 OR v_ne_lng NOT BETWEEN -180 AND 180
     OR v_sw_lat NOT BETWEEN -90 AND 90 OR v_ne_lat NOT BETWEEN -90 AND 90 THEN
    RAISE EXCEPTION 'atlas:bounds_off_earth' USING ERRCODE = '22023';
  END IF;

  -- Already catalogued: the common case, and the reason this is not just an insert.
  SELECT c.id INTO v_id FROM public.countries c WHERE c.iso_code = v_iso;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.countries (iso_code, name_ar, name_en, continent, center, bounds)
  VALUES (
    v_iso,
    v_name_ar,
    v_name_en,
    v_cont,
    ST_SetSRID(
      ST_MakePoint((v_sw_lng + v_ne_lng) / 2, (v_sw_lat + v_ne_lat) / 2),
      4326
    )::geography,
    jsonb_build_object(
      'sw', jsonb_build_array(v_sw_lng, v_sw_lat),
      'ne', jsonb_build_array(v_ne_lng, v_ne_lat)
    )
  )
  -- Two users saving their first place in the same country at the same time both
  -- reach the INSERT. Without this, the loser gets a unique-violation instead of a
  -- country id and their save fails for a reason that has nothing to do with them.
  ON CONFLICT (iso_code) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT c.id INTO v_id FROM public.countries c WHERE c.iso_code = v_iso;
  END IF;

  RETURN v_id;
END;
$$;

-- A SECURITY DEFINER function is only as safe as its grants: anon must not reach
-- it, or the authorisation check above is the only thing standing between the
-- public internet and a write to shared data.
REVOKE ALL ON FUNCTION public.ensure_country(text, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_country(text, text, text, jsonb, text) TO authenticated;

COMMIT;
