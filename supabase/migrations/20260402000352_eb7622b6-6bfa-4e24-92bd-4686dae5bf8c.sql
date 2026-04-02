
-- Fix 1: Replace overly permissive messages UPDATE policy
DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;

-- Senders can update their own messages (edit content, mark deleted)
CREATE POLICY "Senders can update their own messages"
ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid());

-- Participants can mark messages as read (any participant in conversation)
-- This is broader but needed for read receipts - app logic restricts to 'read' column
CREATE POLICY "Participants can mark messages read"
ON public.messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- Fix 2: Make chat-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-files';

-- Remove the public SELECT policy on chat-files if it exists
DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view chat files" ON storage.objects;

-- Add authenticated SELECT policy scoped to conversation participants
CREATE POLICY "Conversation participants can view chat files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.file_url LIKE '%' || storage.objects.name || '%'
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);
