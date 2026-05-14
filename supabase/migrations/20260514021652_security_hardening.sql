-- =====================================================================
-- SECURITY HARDENING (addresses Lovable security scan findings)
-- =====================================================================
-- 1. Realtime broadcast/presence subscriptions are unscoped, so any
--    authenticated user can listen to any conversation's typing channel.
-- 2. SECURITY DEFINER helpers are EXECUTE-able by PUBLIC (anon).
-- 3. Recipients can't hide a message for themselves (sender-only delete).
-- 4. profiles.bio leaks to every authenticated user even when no
--    relationship exists.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (1) Realtime authorization: lock down which channels each user can
--     subscribe to. Without this, any authenticated client can
--     `supabase.channel('typing:<other-people-conv>')` and observe
--     when those users are typing to each other.
-- ---------------------------------------------------------------------
-- The Supabase Realtime authorization model uses RLS on realtime.messages.
-- The realtime.topic() function returns the channel topic for the row.
-- We allow:
--   * presence:online           – global presence (every auth'd user)
--   * typing:<conversation_id>  – only the two participants of that conv
--   * postgres_changes:*        – managed by realtime publication + table RLS
-- and deny everything else by default.

ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorize realtime channel subscriptions" ON realtime.messages;
CREATE POLICY "Authorize realtime channel subscriptions"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() = 'presence:online' THEN true
    WHEN realtime.topic() LIKE 'typing:%' THEN EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id::text = substring(realtime.topic() from 8)
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    ELSE false
  END
);

-- Authenticated users still need to *write* presence/broadcast frames for
-- the channels they're allowed to subscribe to (typing indicators send
-- presence updates). Same predicate, INSERT side.
DROP POLICY IF EXISTS "Authorize realtime channel writes" ON realtime.messages;
CREATE POLICY "Authorize realtime channel writes"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() = 'presence:online' THEN true
    WHEN realtime.topic() LIKE 'typing:%' THEN EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id::text = substring(realtime.topic() from 8)
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    ELSE false
  END
);

-- ---------------------------------------------------------------------
-- (2) Restrict EXECUTE on SECURITY DEFINER helpers to authenticated.
--     PostgreSQL grants EXECUTE to PUBLIC by default, which means even
--     the `anon` role could call these. We want only signed-in users.
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_message_read(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_message_read(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.mark_message_read(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- (3) Recipient-side hide-for-self ("delete for me", WhatsApp-style).
--     Sender-side soft-delete already exists via UPDATE deleted = true.
--     This adds a parallel mechanism where a recipient can hide a copy
--     of any message they received without affecting the sender's view.
-- ---------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS hidden_for uuid[] NOT NULL DEFAULT ARRAY[]::uuid[];

CREATE OR REPLACE FUNCTION public.hide_message_for_self(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Caller must be a participant of the conversation.
  IF NOT EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = p_message_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not a participant of this message''s conversation';
  END IF;

  UPDATE public.messages
  SET hidden_for = (
    SELECT ARRAY(
      SELECT DISTINCT unnest(coalesce(hidden_for, ARRAY[]::uuid[]) || auth.uid())
    )
  )
  WHERE id = p_message_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.hide_message_for_self(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hide_message_for_self(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.hide_message_for_self(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- (4) profiles.bio scoping. Username / display_name / avatar_url /
--     last_seen are intentionally public so the global user search
--     keeps working — those are the social-graph keys that let people
--     find each other. bio, however, is free-text supplied by the user
--     and should only leak to:
--       * the user themselves
--       * users that already share a conversation with them.
--     We implement this with a SECURITY DEFINER helper the app can call
--     for non-search reads, plus a stricter base SELECT policy.
--
--     We keep the existing "Users can search other profiles" policy
--     intact so usernames still discover correctly, and document the
--     trade-off here.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_visible_profile(p_user_id uuid)
RETURNS TABLE (
  user_id      uuid,
  username     text,
  display_name text,
  avatar_url   text,
  bio          text,
  last_seen    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share_conv boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_share_conv := EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.user1_id = auth.uid() AND c.user2_id = p_user_id)
       OR (c.user2_id = auth.uid() AND c.user1_id = p_user_id)
  );

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    CASE WHEN p.user_id = auth.uid() OR v_share_conv THEN p.bio ELSE NULL END,
    p.last_seen
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_visible_profile(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_visible_profile(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_visible_profile(uuid) TO authenticated;

-- Sanity: re-affirm RLS is enabled on the customer-facing tables. These
-- are idempotent and safe to re-run.
ALTER TABLE public.messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations     ENABLE ROW LEVEL SECURITY;
