
-- Add missing columns on messages that the client expects.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS hidden_for   uuid[]        NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_id    text;

-- Index to make "unread + delivered" scans fast.
CREATE INDEX IF NOT EXISTS idx_messages_conv_delivered
  ON public.messages (conversation_id)
  WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_client_id
  ON public.messages (client_id)
  WHERE client_id IS NOT NULL;

-- Idempotent RPC: stamp delivered_at on every message in this conversation
-- that was NOT sent by the caller and is not yet delivered.
CREATE OR REPLACE FUNCTION public.mark_messages_delivered(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Guard: caller must be a participant of the conversation.
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND (c.user1_id = v_uid OR c.user2_id = v_uid)
  ) THEN
    RETURN;
  END IF;

  UPDATE public.messages
     SET delivered_at = now()
   WHERE conversation_id = p_conversation_id
     AND sender_id      <> v_uid
     AND delivered_at    IS NULL
     AND deleted         = false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_messages_delivered(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_messages_delivered(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.mark_messages_delivered(uuid) TO authenticated;
