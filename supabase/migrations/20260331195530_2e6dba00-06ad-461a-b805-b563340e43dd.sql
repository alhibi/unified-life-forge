
-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload chat files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Anyone can view chat files (public bucket)
CREATE POLICY "Anyone can view chat files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chat-files');

-- Users can delete their own uploaded files
CREATE POLICY "Users can delete own chat files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);
