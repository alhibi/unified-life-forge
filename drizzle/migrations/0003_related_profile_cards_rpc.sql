CREATE OR REPLACE FUNCTION public.get_related_profile_cards(_ids uuid[])
RETURNS TABLE (user_id uuid, username text, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username::text, p.display_name::text, p.avatar_url::text
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id = ANY (COALESCE(_ids[1:200], ARRAY[]::uuid[]))
    AND (
      p.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.blocked_users b
                 WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
      OR EXISTS (SELECT 1 FROM public.conversations c
                 WHERE (c.user1_id = auth.uid() AND c.user2_id = p.user_id)
                    OR (c.user2_id = auth.uid() AND c.user1_id = p.user_id))
      OR EXISTS (SELECT 1 FROM public.messages m
                 JOIN public.conversations c ON c.id = m.conversation_id
                 WHERE m.forwarded_from_sender_id = p.user_id
                   AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
    );
$$;
REVOKE ALL ON FUNCTION public.get_related_profile_cards(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_related_profile_cards(uuid[]) TO authenticated;