-- Column-level SELECT: revoke blanket read, then grant everything except last_seen
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, user_id, username, display_name, avatar_url, bio, created_at)
  ON public.profiles TO authenticated;
GRANT SELECT (last_seen) ON public.profiles TO service_role;

-- Conversation-participant-scoped accessor for last_seen.
CREATE OR REPLACE FUNCTION public.get_last_seen(target_user_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.last_seen
  FROM public.profiles p
  WHERE p.user_id = target_user_id
    AND (
      p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE (c.user1_id = auth.uid() AND c.user2_id = target_user_id)
           OR (c.user2_id = auth.uid() AND c.user1_id = target_user_id)
      )
    )
$$;

REVOKE ALL ON FUNCTION public.get_last_seen(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_last_seen(uuid) TO authenticated;