
-- 1. Create a secure function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a participant
  IF NOT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = p_conversation_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  UPDATE messages
  SET read = true
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read = false;
END;
$$;

-- 2. Create a secure function to mark a single message as read
CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a participant of the conversation containing this message
  IF NOT EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = p_message_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  UPDATE messages
  SET read = true
  WHERE id = p_message_id
    AND sender_id != auth.uid()
    AND read = false;
END;
$$;

-- 3. Drop the overpermissive UPDATE policy
DROP POLICY IF EXISTS "Participants can mark messages read" ON public.messages;

-- 4. Add UPDATE policy on chat-files storage bucket (owner can update their files)
CREATE POLICY "Users can update their own chat files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
