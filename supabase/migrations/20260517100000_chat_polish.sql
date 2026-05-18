-- =====================================================================
-- CHAT POLISH (idempotency, forwarding, hide-for-self UX)
-- =====================================================================
-- Goals:
--   1. Stop the "ghost duplicate" flicker that happens when the realtime
--      INSERT lands a few ms after the INSERT promise resolves: the
--      optimistic row and the canonical row briefly co-exist because the
--      old fuzzy "same content + sender" dedup mis-fires for empty
--      content (image/file/voice). A real client-supplied UUID per
--      send fixes it for every message_type.
--   2. Track forward provenance so the bubble can render
--      "↪ Forwarded from <user>" the same way Telegram does.
--   3. Allow conversation participants to read the storage object that a
--      forwarded image/voice/file points at — even when they were not the
--      original recipients. The current RLS only walks the folder path
--      (sender_id/conversation_id/...), which means as soon as the file
--      is referenced from a different conversation the new participant
--      gets a 403. We widen it to: any participant of any conversation
--      that contains a non-deleted message referencing this object can
--      read it.
-- =====================================================================

-- (1) Idempotency client id ------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS client_id uuid;

-- Soft uniqueness per sender. Multiple NULLs allowed (legacy rows).
CREATE UNIQUE INDEX IF NOT EXISTS messages_sender_client_id_unique
  ON public.messages (sender_id, client_id)
  WHERE client_id IS NOT NULL;

-- (2) Forward provenance ---------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS forwarded_from_message_id uuid
    REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forwarded_from_sender_id uuid;

-- (3) Cross-conversation file read for forwarded media --------------------
DROP POLICY IF EXISTS "Users can read chat files in their conversations" ON storage.objects;

CREATE POLICY "Users can read chat files in their conversations"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (
    -- The user uploaded the file (their own folder).
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- The user is a participant in the original conversation
    -- (folder layout is <sender_id>/<conversation_id>/...).
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE (storage.foldername(name))[2] IS NOT NULL
        AND c.id = ((storage.foldername(name))[2])::uuid
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR
    -- The user is a participant in ANY conversation that references
    -- this object via a (non-deleted) message — covers forwards.
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.deleted = false
        AND m.file_url IS NOT NULL
        AND m.file_url = storage.objects.name
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  )
);

-- (4) "Delete for me" client wrapper around hide_message_for_self ---------
-- The existing hide_message_for_self() is fine; this is just a tiny alias
-- so app code can call delete_for_me to mirror the user-facing label.
CREATE OR REPLACE FUNCTION public.delete_message_for_me(p_message_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.hide_message_for_self(p_message_id);
$$;

REVOKE EXECUTE ON FUNCTION public.delete_message_for_me(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_message_for_me(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.delete_message_for_me(uuid) TO authenticated;
