
-- 1) messages: require current participation on UPDATE
DROP POLICY IF EXISTS "Senders can update their own messages" ON public.messages;
CREATE POLICY "Senders can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
)
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- 2) rss_feed_meta: stop exposing internal crawl state to anon
DROP POLICY IF EXISTS "Anyone can read feed meta" ON public.rss_feed_meta;
CREATE POLICY "Authenticated users can read feed meta"
ON public.rss_feed_meta
FOR SELECT
TO authenticated
USING (true);

-- 3) realtime.messages: restrict channel subscriptions to conversation participants.
-- Conversation channels are named "conversation:<uuid>"; presence/typing use
-- "typing:<uuid>". Other channels (public broadcasts) remain open to all
-- authenticated users.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users on permitted conversation channels"
  ON realtime.messages;

CREATE POLICY "Authenticated users on permitted conversation channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'conversation:%' OR realtime.topic() LIKE 'typing:%' THEN
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id::text = split_part(realtime.topic(), ':', 2)
          AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
      )
    ELSE true
  END
);
