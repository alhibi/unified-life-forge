
-- Fix 1: Rescope user_settings policies from public to authenticated
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" ON public.user_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings" ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" ON public.user_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix 2: Rescope profiles INSERT/UPDATE policies from public to authenticated
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix 3: Fix chat-files storage SELECT policy to use exact match
DROP POLICY IF EXISTS "Conversation participants can view chat files" ON storage.objects;
CREATE POLICY "Conversation participants can view chat files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.file_url LIKE '%/chat-files/' || storage.objects.name
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- Fix 4: Add DELETE policy on conversations for participants only
CREATE POLICY "Participants can delete their conversations"
ON public.conversations FOR DELETE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);
