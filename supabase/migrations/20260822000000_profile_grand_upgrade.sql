-- Migration: Profile Grand Upgrade (20260822000000_profile_grand_upgrade.sql)
-- Adds professional identity, social presence, badges showcase, status indicators, and privacy settings to profiles table.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status_text TEXT,
  ADD COLUMN IF NOT EXISTS status_emoji TEXT DEFAULT '✨',
  ADD COLUMN IF NOT EXISTS featured_badges TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS profile_theme TEXT DEFAULT 'obsidian',
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"hide_activity": false, "hide_location": false, "hide_online_status": false}'::jsonb;

-- Comment on columns for schema documentation
COMMENT ON COLUMN public.profiles.title IS 'Professional title, role, or passion tag (e.g. باحث وباحث في اللغة العربية)';
COMMENT ON COLUMN public.profiles.location IS 'User city or country (e.g. الرياض، المملكة العربية السعودية)';
COMMENT ON COLUMN public.profiles.website_url IS 'Personal site or portfolio link';
COMMENT ON COLUMN public.profiles.social_links IS 'JSON object of social links { github, twitter, telegram, linkedin, instagram }';
COMMENT ON COLUMN public.profiles.status_text IS 'Custom user status description';
COMMENT ON COLUMN public.profiles.status_emoji IS 'Custom user status emoji icon';
COMMENT ON COLUMN public.profiles.featured_badges IS 'Array of badge IDs selected by user for display in hero header';
COMMENT ON COLUMN public.profiles.profile_theme IS 'Selected profile header visual accent theme';
COMMENT ON COLUMN public.profiles.is_public IS 'Whether the user profile is publicly viewable by link';
COMMENT ON COLUMN public.profiles.privacy_settings IS 'Granular visibility toggles for activity, location, and presence';

-- Enable Row Level Security if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure read access policy for public profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Public profiles are viewable by everyone"
      ON public.profiles FOR SELECT
      USING (is_public = true OR auth.uid() = user_id);
  END IF;
END $$;

-- Ensure users can update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;
