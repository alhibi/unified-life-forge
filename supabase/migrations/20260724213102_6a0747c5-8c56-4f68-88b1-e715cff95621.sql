
-- Attach the places_count sync trigger (function exists but wasn't attached)
DROP TRIGGER IF EXISTS trg_sync_country_places_count ON public.places;
CREATE TRIGGER trg_sync_country_places_count
AFTER INSERT OR DELETE OR UPDATE OF country_id ON public.places
FOR EACH ROW EXECUTE FUNCTION public.sync_country_places_count();

-- Backfill counts to match actual rows
UPDATE public.countries c
SET places_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT country_id, COUNT(*)::int AS cnt FROM public.places GROUP BY country_id
) sub
WHERE c.id = sub.country_id;

UPDATE public.countries
SET places_count = 0
WHERE id NOT IN (SELECT DISTINCT country_id FROM public.places);
