-- Drop the broken policy
DROP POLICY IF EXISTS "Conversation participants can view chat files" ON storage.objects;

-- Create a simpler working policy: users can read files in folders that belong to conversations they're part of
CREATE POLICY "Users can read chat files in their conversations"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (
    -- User owns the file (uploaded it)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User is a participant in the conversation (second folder segment is conversation_id)
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = ((storage.foldername(name))[2])::uuid
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  )
);