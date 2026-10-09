CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(trim(username)) = lower(trim(_username))
  )
$$;
REVOKE ALL ON FUNCTION public.is_username_available(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated, anon;