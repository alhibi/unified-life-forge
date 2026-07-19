-- Local to Cloud Migration for SmartHub / amv.life

-- 1. Games (game_progress)
CREATE TABLE IF NOT EXISTS public.game_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game)
);

GRANT ALL ON public.game_progress TO authenticated;
GRANT ALL ON public.game_progress TO service_role;

ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own game progress" ON public.game_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_game_progress_updated_at
  BEFORE UPDATE ON public.game_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. Podcasts (subscriptions, episode state, queue, prefs)
CREATE TABLE IF NOT EXISTS public.podcast_subscriptions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_url TEXT NOT NULL,
  title TEXT,
  image TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feed_url)
);

GRANT ALL ON public.podcast_subscriptions TO authenticated;
GRANT ALL ON public.podcast_subscriptions TO service_role;

ALTER TABLE public.podcast_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own podcast subscriptions" ON public.podcast_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

---

CREATE TABLE IF NOT EXISTS public.podcast_episode_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_guid TEXT NOT NULL,
  feed_url TEXT,
  position_sec INT NOT NULL DEFAULT 0,
  duration_sec INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, episode_guid)
);

GRANT ALL ON public.podcast_episode_state TO authenticated;
GRANT ALL ON public.podcast_episode_state TO service_role;

ALTER TABLE public.podcast_episode_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own podcast episode state" ON public.podcast_episode_state
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

---

CREATE TABLE IF NOT EXISTS public.podcast_queue (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_guid TEXT NOT NULL,
  feed_url TEXT,
  position INT NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, episode_guid)
);

GRANT ALL ON public.podcast_queue TO authenticated;
GRANT ALL ON public.podcast_queue TO service_role;

ALTER TABLE public.podcast_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own podcast queue" ON public.podcast_queue
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

---

CREATE TABLE IF NOT EXISTS public.podcast_prefs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.podcast_prefs TO authenticated;
GRANT ALL ON public.podcast_prefs TO service_role;

ALTER TABLE public.podcast_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own podcast prefs" ON public.podcast_prefs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_podcast_prefs_updated_at
  BEFORE UPDATE ON public.podcast_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. Mind (mind_state, mind_anchors)
CREATE TABLE IF NOT EXISTS public.mind_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.mind_state TO authenticated;
GRANT ALL ON public.mind_state TO service_role;

ALTER TABLE public.mind_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own mind state" ON public.mind_state
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_mind_state_updated_at
  BEFORE UPDATE ON public.mind_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS public.mind_anchors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.mind_anchors TO authenticated;
GRANT ALL ON public.mind_anchors TO service_role;

ALTER TABLE public.mind_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own mind anchors" ON public.mind_anchors
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 4. Clipboard / Location Saver (Modify existing clipboard_items table)
ALTER TABLE public.clipboard_items
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS label TEXT;


-- 5. Audio Storage
CREATE TABLE IF NOT EXISTS public.audio_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_sec INT,
  size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.audio_files TO authenticated;
GRANT ALL ON public.audio_files TO service_role;

ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own audio files metadata" ON public.audio_files
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create Private storage bucket for audio if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own audio files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own audio files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own audio files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own audio files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);


-- 6. Diwan Folders
CREATE TABLE IF NOT EXISTS public.diwan_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.diwan_folders TO authenticated;
GRANT ALL ON public.diwan_folders TO service_role;

ALTER TABLE public.diwan_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own diwan folders" ON public.diwan_folders
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

---

CREATE TABLE IF NOT EXISTS public.diwan_folder_items (
  folder_id UUID NOT NULL REFERENCES public.diwan_folders(id) ON DELETE CASCADE,
  poem_id INT NOT NULL REFERENCES public.diwan_poems(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (folder_id, poem_id)
);

GRANT ALL ON public.diwan_folder_items TO authenticated;
GRANT ALL ON public.diwan_folder_items TO service_role;

ALTER TABLE public.diwan_folder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own diwan folder items" ON public.diwan_folder_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.diwan_folders WHERE diwan_folders.id = diwan_folder_items.folder_id AND diwan_folders.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.diwan_folders WHERE diwan_folders.id = diwan_folder_items.folder_id AND diwan_folders.user_id = auth.uid()));


-- 7. Message Drafts
CREATE TABLE IF NOT EXISTS public.message_drafts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

GRANT ALL ON public.message_drafts TO authenticated;
GRANT ALL ON public.message_drafts TO service_role;

ALTER TABLE public.message_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own message drafts" ON public.message_drafts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_message_drafts_updated_at
  BEFORE UPDATE ON public.message_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 8. User Roles (as required by security guidelines)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = has_role.user_id AND user_roles.role = has_role.required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
