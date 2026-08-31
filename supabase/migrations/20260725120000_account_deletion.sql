-- =====================================================================
-- ACCOUNT DELETION (right to erasure)
-- =====================================================================
-- The app had no way for a user to delete their account. Settings offered
-- sign-out only, while the backend held profiles, journal entries, notes,
-- messages, wellness records, saved places and uploaded files keyed to
-- auth.users. This adds a single RPC the owner can call with their own JWT.
--
-- Why an RPC and not an edge function: deleting a row from auth.users needs
-- privileges the anon/authenticated roles do not have. A SECURITY DEFINER
-- function owned by the migration role gets them without shipping a
-- service-role key to a function, and without a second network hop. The
-- function derives its subject from auth.uid() only — it takes no arguments,
-- so there is no parameter to tamper with and no way to delete anyone else.
--
-- Most user-owned tables already declare
--   user_id ... REFERENCES auth.users(id) ON DELETE CASCADE
-- and are erased by the auth.users delete alone. This migration handles the
-- three groups that are not covered.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- (1) BUG FIX: public.places blocks account deletion entirely.
--
-- places.user_id was declared `REFERENCES auth.users(id)` with no ON DELETE
-- clause, which defaults to NO ACTION. Deleting an auth.users row for anyone
-- who had ever saved a place would abort with a foreign-key violation, so
-- account deletion could not have worked even if a UI existed.
--
-- Places are community content: the table's RLS grants "public read places"
-- to anon and authenticated, so other users' atlases reference them. Erasing
-- the contributor should therefore unlink the row, not destroy the landmark.
-- The column is already nullable, so SET NULL is a no-op for existing rows.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'places'
    AND con.contype = 'f'
    AND con.confrelid = 'auth.users'::regclass;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.places DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE public.places
    ADD CONSTRAINT places_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- ---------------------------------------------------------------------
-- (2) The erasure RPC.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated'
      USING ERRCODE = '28000';
  END IF;

  -- (a) Chat tables predate the auth.users FK convention: conversations,
  --     messages, chats, chat_members, chat_attachments and blocked_users
  --     all store bare uuids with no foreign key, so nothing cascades and
  --     the rows would be orphaned rather than deleted.
  --
  --     A direct conversation only exists for its two participants, so
  --     erasing one of them dissolves it. Deleting the conversation cascades
  --     to its messages, and from there to chat_attachments.
  DELETE FROM public.conversations
  WHERE user1_id = uid OR user2_id = uid;

  -- Group and channel chats survive: other members are still using them.
  -- Leave every membership instead, which cascades that member's per-chat
  -- state. `chats.created_by` is NOT NULL so it cannot be blanked; it is
  -- left as an opaque uuid that no longer resolves to a person once the
  -- auth.users row is gone.
  DELETE FROM public.chat_members WHERE user_id = uid;

  -- Messages this user sent into surviving group chats. `messages` in the
  -- group schema is keyed by chat, not conversation, so the delete above
  -- does not reach them.
  DELETE FROM public.messages WHERE sender_id = uid;

  DELETE FROM public.blocked_users
  WHERE blocker_id = uid OR blocked_id = uid;

  -- (b) Uploaded objects. Removing the storage.objects rows is exactly what
  --     the storage client does on remove(); the physical files are reaped by
  --     Supabase's own collection pass. Scoped to buckets this app writes to.
  DELETE FROM storage.objects
  WHERE owner = uid
    AND bucket_id IN ('avatars', 'chat-files', 'dm', 'audio');

  -- (c) Everything else — profiles, user_settings, journal_entries,
  --     pkm_notes, wellness_records, reading_*, podcast_*, diwan_folders,
  --     archive_documents, clipboard_items, game_progress, keyword_alerts,
  --     mind_*, audio_files, message_drafts, user_roles,
  --     catalog_user_product_interaction — declares ON DELETE CASCADE
  --     against auth.users and goes with this statement.
  --
  --     catalog_translation_record uses ON DELETE SET NULL
  --     for reviewed_by (see 20260830000000_catalog_core). The row
  --     itself stays as part of the catalog's review audit trail,
  --     while the reviewer link is blanked. Documented here so the
  --     cascade-coverage test sees it.
  DELETE FROM auth.users WHERE id = uid;
END $$;

COMMENT ON FUNCTION public.delete_own_account() IS
  'Permanently erases the calling user (auth.uid()) and all data they own. '
  'Takes no arguments so it cannot be aimed at another account.';

-- Only signed-in users. Explicitly revoked from PUBLIC/anon so an
-- unauthenticated caller cannot even probe it.
REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
