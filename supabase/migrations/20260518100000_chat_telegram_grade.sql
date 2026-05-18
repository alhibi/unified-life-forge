-- =====================================================================
-- CHAT — TELEGRAM-GRADE POLISH
-- =====================================================================
-- Goals
--   1. Real "delivered" tick. Until now `MessageStatus = 'delivered'` was
--      a dead UI state because nothing on the server ever stamped a
--      delivery time. We add a `delivered_at timestamptz` column and a
--      pair of SECURITY DEFINER helpers the recipient client calls when
--      a realtime INSERT lands in their tab. Senders see the status
--      transition pending → sent → delivered → read like Telegram.
--
--   2. Deterministic conversation ordering. The client currently bumps
--      `conversations.updated_at` from inside `sendMessage()` which
--      races the realtime echo: the receiving tab sometimes sees the
--      INSERT before the conversation row has been bumped, so the
--      list ordering flickers. A row-level AFTER INSERT trigger does
--      it server-side, atomically, with the message commit.
--
--   3. Forward provenance is already on the messages table (added in
--      `20260517100000_chat_polish.sql`); this migration is purely
--      additive.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (1) delivered_at column + RPCs
-- ---------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT NULL;

-- Index helps the realtime echo path: when a tab boots a conversation we
-- bulk-mark every still-undelivered, not-from-me message as delivered.
CREATE INDEX IF NOT EXISTS idx_messages_undelivered
  ON public.messages (conversation_id)
  WHERE delivered_at IS NULL AND deleted = false;

-- Single message: called by the recipient tab from the realtime INSERT
-- handler. Idempotent — re-calls do not bump the timestamp.
CREATE OR REPLACE FUNCTION public.mark_message_delivered(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.messages m
  SET delivered_at = now()
  FROM public.conversations c
  WHERE m.id = p_message_id
    AND c.id = m.conversation_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    AND m.sender_id <> auth.uid()
    AND m.delivered_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_message_delivered(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_message_delivered(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.mark_message_delivered(uuid) TO authenticated;

-- Bulk variant: when a conversation opens we sweep every undelivered
-- message in one round-trip (the existing mark_messages_read also does
-- this for read receipts, but a chat may have undelivered-but-still-
-- unread messages if the tab was offline when they were sent).
CREATE OR REPLACE FUNCTION public.mark_messages_delivered(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  UPDATE public.messages
  SET delivered_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> auth.uid()
    AND delivered_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_messages_delivered(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_messages_delivered(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.mark_messages_delivered(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- (2) Server-side conversations.updated_at bump on new message
-- ---------------------------------------------------------------------
-- The trigger fires AFTER INSERT so the row is already visible to the
-- realtime publication, then bumps the parent conversation. The two
-- changes commit together so subscribers always see them in causal
-- order: INSERT messages → UPDATE conversations.
CREATE OR REPLACE FUNCTION public.bump_conversation_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id
    AND updated_at < NEW.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_bump_conversation ON public.messages;
CREATE TRIGGER messages_bump_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_conversation_on_new_message();

-- ---------------------------------------------------------------------
-- (3) Realtime: make sure conversations table broadcasts UPDATEs so the
-- bump trigger reaches every subscribed client.
-- ---------------------------------------------------------------------
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversations') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  END IF;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
