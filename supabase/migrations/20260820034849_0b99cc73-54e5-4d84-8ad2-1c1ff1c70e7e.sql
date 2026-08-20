ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status_text text,
  ADD COLUMN IF NOT EXISTS status_emoji text DEFAULT '✨',
  ADD COLUMN IF NOT EXISTS featured_badges text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS profile_theme text NOT NULL DEFAULT 'obsidian',
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{"hide_activity":false,"hide_location":false,"hide_online_status":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_title_len CHECK (title IS NULL OR char_length(title) <= 80),
  ADD CONSTRAINT profiles_location_len CHECK (location IS NULL OR char_length(location) <= 80),
  ADD CONSTRAINT profiles_website_len CHECK (website_url IS NULL OR char_length(website_url) <= 300),
  ADD CONSTRAINT profiles_status_len CHECK (status_text IS NULL OR char_length(status_text) <= 120),
  ADD CONSTRAINT profiles_bio_len CHECK (bio IS NULL OR char_length(bio) <= 500);