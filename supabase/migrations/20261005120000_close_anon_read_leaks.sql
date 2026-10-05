-- ============================================================================
-- Close two anonymous-read data leaks found by the 2026-10-05 forensic audit.
--
-- Postgres combines permissive RLS policies with OR. Several tables carried
-- BOTH an owner-scoped policy AND a blanket `USING (true)` policy granted to
-- `anon`. The blanket one wins, so the owner-scoped one was decorative.
--
-- Leak 1 — travel atlas
--   `places` holds `user_id` and `location GEOGRAPHY(POINT, 4326)`: every
--   user's saved places with precise coordinates. The policy
--   `"public read places" FOR SELECT TO anon, authenticated USING (true)`
--   made all of it readable by anyone holding the publishable key — which is
--   compiled into every shipped bundle by design.
--
--   `src/test/rlsHostileClient.test.ts` already listed `places` and
--   `place_photos` as PRIVATE_TABLES and asserted an anonymous client gets
--   zero rows. That assertion never ran (the suite disabled itself when the
--   env vars were absent), so the contradiction between the schema and the
--   test went unnoticed. Both are fixed in the same change set.
--
-- Leak 2 — profiles
--   `profiles.is_public` defaults to TRUE and the policy
--   `"Public profiles are viewable by everyone"` has no TO clause, so it
--   applies to `anon`. Combined, every account was publicly readable by
--   default, including `location`, `bio`, `status_text`, `social_links` and
--   `website_url`.
--
--   Worse, the three privacy toggles the UI offers
--   (`hide_location` / `hide_activity` / `hide_online_status`, see
--   `src/features/profile/components/ProfilePrivacySettingsTab.tsx`) are
--   stored in the `privacy_settings` JSONB column and were read by no policy,
--   view or function anywhere. Turning "hide my location" on changed nothing
--   observable. This migration makes the toggle real.
--
-- Rollout note: this is deliberately restrictive. Anonymous visitors lose
-- read access to user-generated places. If a curated, genuinely public place
-- catalogue is wanted later, it belongs in its own table rather than in a
-- blanket policy over user rows.
-- ============================================================================

-- ─── Leak 1: user-owned travel data must not be anon-readable ──────────────

DROP POLICY IF EXISTS "public read places"       ON public.places;
DROP POLICY IF EXISTS "public read place_photos" ON public.place_photos;
DROP POLICY IF EXISTS "public read place_links"  ON public.place_links;

-- `countries` is a reference catalogue with no user_id and no user content;
-- it stays publicly readable on purpose. Recorded here so a future reader
-- does not "fix" it by analogy with the three policies above.

-- Owner-scoped SELECT must exist for each table now that the blanket policy
-- is gone. `places` already has "Users read own places"; the two child tables
-- inherit ownership through their parent row.

DROP POLICY IF EXISTS "Users read own place_photos" ON public.place_photos;
CREATE POLICY "Users read own place_photos"
  ON public.place_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.places p
      WHERE p.id = place_photos.place_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users read own place_links" ON public.place_links;
CREATE POLICY "Users read own place_links"
  ON public.place_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.places p
      WHERE p.id = place_links.place_id
        AND p.user_id = auth.uid()
    )
  );

-- Revoke the table-level grants that accompanied the blanket policies, so a
-- future policy mistake cannot re-expose these tables to anonymous callers.
REVOKE SELECT ON public.places       FROM anon;
REVOKE SELECT ON public.place_photos FROM anon;
REVOKE SELECT ON public.place_links  FROM anon;

-- ─── Leak 2: profiles are private by default and honour the toggles ────────

-- New accounts are private unless the user opts in.
ALTER TABLE public.profiles ALTER COLUMN is_public SET DEFAULT false;

-- Replace the anon-reachable blanket policy. Visibility is now:
--   • always yourself
--   • people you share a conversation with (already covered by the separate
--     "Users view own or conversation partners" policy, kept as-is)
--   • opted-in public profiles, to signed-in users only — not to `anon`
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Opted-in public profiles are viewable by signed-in users"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_public = true OR auth.uid() = user_id);

REVOKE SELECT ON public.profiles FROM anon;

-- Make the privacy toggles mean something. The UI writes booleans into
-- `privacy_settings`; this view is what other users should read, and it
-- blanks the fields the owner asked to hide. The owner always sees their own
-- row in full.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.title,
  p.website_url,
  p.social_links,
  p.status_emoji,
  p.featured_badges,
  p.profile_theme,
  p.is_public,
  CASE
    WHEN p.user_id = auth.uid() THEN p.location
    WHEN COALESCE((p.privacy_settings ->> 'hide_location')::boolean, false) THEN NULL
    ELSE p.location
  END AS location,
  CASE
    WHEN p.user_id = auth.uid() THEN p.status_text
    WHEN COALESCE((p.privacy_settings ->> 'hide_online_status')::boolean, false) THEN NULL
    ELSE p.status_text
  END AS status_text,
  -- Consumers must branch on this instead of reading activity tables directly.
  CASE
    WHEN p.user_id = auth.uid() THEN false
    ELSE COALESCE((p.privacy_settings ->> 'hide_activity')::boolean, false)
  END AS activity_hidden
FROM public.profiles p;

COMMENT ON VIEW public.profiles_public IS
  'Privacy-filtered projection of public.profiles. security_invoker=true so the '
  'caller''s RLS on profiles still applies; the CASE arms additionally honour '
  'privacy_settings, which no policy enforced before 2026-10-05. Read other '
  'users through this view, never from profiles directly.';

GRANT SELECT ON public.profiles_public TO authenticated;
