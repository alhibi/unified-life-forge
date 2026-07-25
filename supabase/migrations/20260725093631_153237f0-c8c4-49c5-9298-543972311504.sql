
-- 1) Countries: remove permissive INSERT policy for authenticated users
DROP POLICY IF EXISTS "Auth users can add countries" ON public.countries;

-- 2) Profiles: replace broad SELECT with self + conversation partners
DROP POLICY IF EXISTS "Users can search other profiles" ON public.profiles;

CREATE POLICY "Users view own or conversation partners"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.user1_id = auth.uid() AND c.user2_id = profiles.user_id)
       OR (c.user2_id = auth.uid() AND c.user1_id = profiles.user_id)
  )
);

-- 3) Minimal-data search RPC for finding new people to chat with
CREATE OR REPLACE FUNCTION public.search_profiles(q text, lim int DEFAULT 12)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND length(btrim(q)) >= 2
    AND p.user_id <> auth.uid()
    AND (p.username ILIKE '%' || q || '%' OR coalesce(p.display_name,'') ILIKE '%' || q || '%')
  ORDER BY p.username ASC
  LIMIT GREATEST(1, LEAST(coalesce(lim, 12), 25));
$$;

REVOKE ALL ON FUNCTION public.search_profiles(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text, int) TO authenticated;
