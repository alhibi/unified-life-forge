CREATE OR REPLACE FUNCTION public.normalize_arabic(s text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $function$
  SELECT lower(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    coalesce(s, ''),
    '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]', '', 'g'),
    '[إأآا]', 'ا', 'g'),
    'ى', 'ي', 'g'),
    'ة', 'ه', 'g'));
$function$;