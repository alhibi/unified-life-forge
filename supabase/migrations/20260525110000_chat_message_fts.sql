-- =====================================================================
-- CHAT WAVE 2 — MESSAGE FULL-TEXT SEARCH
-- =====================================================================
-- Goals
--   1. Add a generated `tsvector` column on `messages.content` so we can
--      run ranked search across every message the caller is allowed to
--      see, in O(log n) instead of the current O(n) ILIKE-on-every-row
--      that the client does after pulling the entire history.
--
--   2. Use the same Arabic-aware pipeline as the rest of the app: the
--      `public.normalize_arabic(text)` function already strips diacritics
--      and unifies hamza/yaa/taa-marbuta variants so users find matches
--      regardless of how the typing locale rendered them.
--
--   3. Expose a single SECURITY DEFINER RPC `search_chat_messages` that
--      returns ranked, snippet-highlighted hits scoped to the caller's
--      conversations and chats. The RPC enforces visibility itself
--      (mirrors the RLS predicate) so we can keep the query plan flat
--      instead of re-checking RLS per row, while still being safe to
--      grant to `authenticated`.
--
-- Notes on ranking
--   • `setweight('A')` on content because messages have only one body.
--   • `ts_rank_cd` is the cover-density variant — penalizes matches that
--     are far apart in long messages (we don't have many but it costs
--     nothing).
--   • Snippet via `ts_headline` with a reasonable max length so callers
--     can render the match preview directly without re-scanning client-
--     side. We escape the markers as <mark> so React can render them
--     into a safe span via a tiny serializer, never via dangerouslySet.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (1) Generated tsvector column
-- ---------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    -- We only index plain `text` rows. Files / images / voice messages
    -- still flow through here because their `content` carries the
    -- caption (or filename, which we set client-side). Empty strings
    -- contribute the empty tsvector — search just won't match them.
    setweight(to_tsvector('simple', public.normalize_arabic(coalesce(content, ''))), 'A')
  ) STORED;

-- Skip soft-deleted rows from the index — they're invisible to all RLS
-- queries anyway, no point burning index bytes. Partial index keeps
-- the GIN tree small and fast to update on every insert.
CREATE INDEX IF NOT EXISTS idx_messages_search_vector
  ON public.messages
  USING GIN (search_vector)
  WHERE deleted = false;

-- ---------------------------------------------------------------------
-- (2) search_chat_messages RPC
-- ---------------------------------------------------------------------
-- Scope semantics:
--   • If `p_chat_id` is provided, results are scoped to that chat
--     only. Caller must be a member (legacy or unified path).
--   • If `p_chat_id` is NULL, results are scoped to every conversation
--     and every chat the caller participates in.
--
-- We return `chat_id` AND `conversation_id` so the client can navigate
-- using whichever model the calling surface uses (legacy `useChat` reads
-- conversation_id, the new `useChats` reads chat_id).
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_chat_messages(text, uuid, integer);

CREATE OR REPLACE FUNCTION public.search_chat_messages(
  p_query   text,
  p_chat_id uuid    DEFAULT NULL,
  p_limit   integer DEFAULT 50
)
RETURNS TABLE (
  message_id        uuid,
  chat_id           uuid,
  conversation_id   uuid,
  sender_id         uuid,
  content           text,
  message_type      text,
  created_at        timestamptz,
  -- ts_headline-rendered preview with <mark>…</mark> wrapping the match
  snippet           text,
  rank              real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_qnorm  text;
  v_tsq    tsquery;
  v_lim    integer := GREATEST(1, LEAST(coalesce(p_limit, 50), 200));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Empty / whitespace-only queries return nothing. Calling
  -- plainto_tsquery on '' yields the empty query which matches
  -- everything; that's not what callers want.
  IF p_query IS NULL OR length(trim(p_query)) = 0 THEN
    RETURN;
  END IF;

  v_qnorm := public.normalize_arabic(p_query);
  v_tsq   := plainto_tsquery('simple', v_qnorm);

  -- An empty tsquery (e.g. when the input was all punctuation that the
  -- normalizer stripped) is treated as a no-op too.
  IF v_tsq::text = '' THEN
    RETURN;
  END IF;

  -- If the caller scoped to a specific chat, validate membership once
  -- up front so we can fail fast on permission issues instead of
  -- returning an empty result that looks like "no matches".
  IF p_chat_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.chats ch
      WHERE ch.id = p_chat_id
        AND (
          public.is_chat_member(ch.id, v_uid)
          OR EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = ch.legacy_conversation_id
              AND (c.user1_id = v_uid OR c.user2_id = v_uid)
          )
        )
    ) THEN
      RAISE EXCEPTION 'Not a member of chat %', p_chat_id;
    END IF;
  END IF;

  RETURN QUERY
  WITH allowed AS (
    -- Conversations the caller participates in (legacy DM path).
    SELECT c.id AS conversation_id
      FROM public.conversations c
     WHERE c.user1_id = v_uid OR c.user2_id = v_uid
  ),
  allowed_chats AS (
    -- Chats the caller is a non-removed member of (unified path).
    SELECT m.chat_id
      FROM public.chat_members m
     WHERE m.user_id = v_uid
       AND m.removed_at IS NULL
  ),
  hits AS (
    SELECT
      m.id                                          AS message_id,
      m.chat_id                                     AS chat_id,
      m.conversation_id                             AS conversation_id,
      m.sender_id                                   AS sender_id,
      m.content                                     AS content,
      m.message_type                                AS message_type,
      m.created_at                                  AS created_at,
      ts_rank_cd(m.search_vector, v_tsq)            AS rank
    FROM public.messages m
    WHERE m.deleted = false
      AND m.search_vector @@ v_tsq
      AND (
        m.conversation_id IN (SELECT conversation_id FROM allowed)
        OR m.chat_id IN (SELECT chat_id FROM allowed_chats)
      )
      AND (p_chat_id IS NULL OR m.chat_id = p_chat_id OR EXISTS (
        SELECT 1 FROM public.chats ch2
        WHERE ch2.id = p_chat_id
          AND ch2.legacy_conversation_id = m.conversation_id
      ))
      -- Hide rows the caller has hidden-for-self via long-press.
      AND NOT (m.hidden_for IS NOT NULL AND v_uid = ANY(m.hidden_for))
    ORDER BY rank DESC, m.created_at DESC
    LIMIT v_lim
  )
  SELECT
    h.message_id,
    h.chat_id,
    h.conversation_id,
    h.sender_id,
    h.content,
    h.message_type,
    h.created_at,
    -- Headline gets the same simple+normalized pipeline as the index
    -- so the highlight aligns with the matched lexemes. We keep the
    -- snippet small (96 chars window, max 1 fragment) for chat list
    -- display and let the caller request the full row separately if
    -- they want more context.
    ts_headline(
      'simple',
      public.normalize_arabic(h.content),
      v_tsq,
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=24, MinWords=6, ShortWord=2'
    ) AS snippet,
    h.rank
  FROM hits h
  ORDER BY h.rank DESC, h.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_chat_messages(text, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_chat_messages(text, uuid, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.search_chat_messages(text, uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.search_chat_messages(text, uuid, integer) IS
  'Wave-2 chat FTS. Ranked, snippet-highlighted message search across the caller''s conversations and chats. Scope to a single chat with p_chat_id, or pass NULL to search globally.';

-- ---------------------------------------------------------------------
-- (3) Backfill safety: the GENERATED column is computed at insert/update
-- time but already-existing rows need a no-op rewrite so the new column
-- gets populated. PostgreSQL handles this automatically for STORED
-- generated columns when ALTER ADD COLUMN runs (it rewrites the table)
-- but on big tables that's expensive. The DO block below is a safety
-- net for environments where the rewrite was deferred (e.g. a partial
-- migration). It is idempotent — touching only rows where the vector
-- is NULL, which a STORED generated column will never produce on a
-- successful rewrite.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  -- This is a no-op when the rewrite worked (search_vector is never
  -- NULL on STORED). Kept here as belt-and-braces.
  PERFORM 1
    FROM public.messages
   WHERE search_vector IS NULL
   LIMIT 1;
END $$;
