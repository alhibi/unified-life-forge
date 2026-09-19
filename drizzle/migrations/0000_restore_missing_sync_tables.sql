-- Tables the shipped client code queries but which were never created on this
-- project: game progress sync, podcast sync, roles, and the chat block list.

-- 1) Roles ------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Game progress ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_progress TO authenticated;
GRANT ALL ON public.game_progress TO service_role;
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD their own game progress" ON public.game_progress;
CREATE POLICY "Users can CRUD their own game progress"
ON public.game_progress FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) Podcast sync -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.podcast_subscriptions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_url text NOT NULL,
  title text,
  image text,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feed_url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.podcast_subscriptions TO authenticated;
GRANT ALL ON public.podcast_subscriptions TO service_role;
ALTER TABLE public.podcast_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD their own podcast subscriptions" ON public.podcast_subscriptions;
CREATE POLICY "Users can CRUD their own podcast subscriptions"
ON public.podcast_subscriptions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.podcast_episode_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_guid text NOT NULL,
  feed_url text,
  position_sec int NOT NULL DEFAULT 0,
  duration_sec int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  played_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, episode_guid)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.podcast_episode_state TO authenticated;
GRANT ALL ON public.podcast_episode_state TO service_role;
ALTER TABLE public.podcast_episode_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD their own podcast episode state" ON public.podcast_episode_state;
CREATE POLICY "Users can CRUD their own podcast episode state"
ON public.podcast_episode_state FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.podcast_queue (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_guid text NOT NULL,
  feed_url text,
  position int NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, episode_guid)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.podcast_queue TO authenticated;
GRANT ALL ON public.podcast_queue TO service_role;
ALTER TABLE public.podcast_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD their own podcast queue" ON public.podcast_queue;
CREATE POLICY "Users can CRUD their own podcast queue"
ON public.podcast_queue FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.podcast_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.podcast_prefs TO authenticated;
GRANT ALL ON public.podcast_prefs TO service_role;
ALTER TABLE public.podcast_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD their own podcast prefs" ON public.podcast_prefs;
CREATE POLICY "Users can CRUD their own podcast prefs"
ON public.podcast_prefs FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) Block list -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own block list" ON public.blocked_users;
CREATE POLICY "Users can see their own block list"
ON public.blocked_users FOR SELECT TO authenticated
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can add blocks" ON public.blocked_users;
CREATE POLICY "Users can add blocks"
ON public.blocked_users FOR INSERT TO authenticated
WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can remove their own blocks" ON public.blocked_users;
CREATE POLICY "Users can remove their own blocks"
ON public.blocked_users FOR DELETE TO authenticated
USING (auth.uid() = blocker_id);