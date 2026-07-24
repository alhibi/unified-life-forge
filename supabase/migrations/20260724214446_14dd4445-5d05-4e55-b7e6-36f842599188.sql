UPDATE public.places
SET location = jsonb_build_object(
  'type', 'Point',
  'coordinates', jsonb_build_array(36.315000 + (rn - 1) * 0.002, 33.512800 + (rn - 1) * 0.0012)
),
updated_at = now()
FROM (
  SELECT p.id,
         row_number() OVER (ORDER BY p.created_at) AS rn
  FROM public.places p
  JOIN public.countries c ON c.id = p.country_id
  WHERE c.iso_code = 'SY'
    AND p.name_ar = 'باب توما'
    AND (
      ((p.location->'coordinates'->>0)::double precision = 0 AND (p.location->'coordinates'->>1)::double precision = 0)
      OR (p.location->'coordinates'->>0)::double precision NOT BETWEEN 35.7 AND 42.4
      OR (p.location->'coordinates'->>1)::double precision NOT BETWEEN 32.3 AND 37.3
    )
) fixed
WHERE public.places.id = fixed.id;