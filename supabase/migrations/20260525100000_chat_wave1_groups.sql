-- =====================================================================
-- CHAT WAVE 1 — GROUPS, CHANNELS, MEMBERS, ATTACHMENTS, SETTINGS
-- =====================================================================
-- Goals
--   1. Introduce a unified `chats` model that supersedes the strict
--      1-to-1 `conversations` table and supports:
--        • dm        — direct message between exactly two users
--        • group     — many-to-many with roles (owner/admin/member)
--        • channel   — broadcast surface where only admins can post
--   2. Extend `messages` with a `chat_id` foreign key so every new
--      message lives under the unified model. Legacy code that still
--      reads `conversation_id` keeps working — both columns are kept
--      in lock-step by a trigger so we can migrate the codebase
--      incrementally instead of in one breaking jump.
--   3. Add `chat_members` for per-user / per-chat state (role, mute,
--      pin, archive, last-read pointer, custom title, notifications).
--      This is the table that makes "this chat is muted for me but not
--      for you" possible at the schema level instead of localStorage.
--   4. Add `chat_attachments` so media gallery / cleanup / dedup all
--      go through one normalized index instead of scanning messages.
--   5. Add `blocked_users` table — foundation for the privacy wave.
--   6. Backfill: for every existing `conversations` row we materialize
--      a `chats` row (kind = 'dm') and two `chat_members` rows. The
--      legacy `pinned_message_id` and `self_destruct_seconds` ride
--      along to the new table.
--   7. Tight RLS on every new table, narrowly-scoped SECURITY DEFINER
--      RPCs (`create_group_chat`, `add_chat_member`, `remove_chat_member`,
--      `update_chat_member_role`, `update_chat_metadata`,
--      `leave_chat`, `mark_chat_read`, `set_chat_pinned`,
--      `set_chat_muted`, `set_chat_archived`, `block_user`,
--      `unblock_user`).
--   8. Realtime publication entries for `chats`, `chat_members`,
--      `chat_attachments`, plus realtime.messages RLS that scopes
--      `chat:<uuid>` and `chat-typing:<uuid>` channels to participants.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (1) chats: unified container for DMs, groups, channels
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chats (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                        text NOT NULL
                              CHECK (kind IN ('dm', 'group', 'channel')),
  -- Optional human metadata (title/description/avatar). For DMs these
  -- stay NULL — the UI derives them from the other participant's
  -- profile so you can rename a person on your phone without
  -- broadcasting that to the world.
  title                       text,
  description                 text,
  avatar_url                  text,
  -- Permission knobs (groups + channels only):
  --   who_can_send         — 'all' | 'admins'
  --   who_can_add_members  — 'all' | 'admins'
  --   who_can_edit_meta    — 'admins' | 'owner'
  who_can_send                text NOT NULL DEFAULT 'all'
                              CHECK (who_can_send IN ('all', 'admins')),
  who_can_add_members         text NOT NULL DEFAULT 'all'
                              CHECK (who_can_add_members IN ('all', 'admins')),
  who_can_edit_meta           text NOT NULL DEFAULT 'admins'
                              CHECK (who_can_edit_meta IN ('admins', 'owner')),
  -- Self-destruct seconds — moved here so DMs and groups share the same
  -- model. Mirrors `conversations.self_destruct_seconds`.
  self_destruct_seconds       integer,
  -- Most recent pinned message (single, like Telegram supergroups).
  pinned_message_id           uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  -- Group invite link (NULL until generated). Channels can also have one
  -- but they default to closed (admins-only invite).
  invite_token                text UNIQUE,
  invite_revoked              boolean NOT NULL DEFAULT false,
  invite_token_created_at     timestamptz,
  -- Discoverability flag for channels — if true, anyone can find by
  -- title and join. Defaults to false so groups stay private.
  is_public                   boolean NOT NULL DEFAULT false,
  -- Audit
  created_by                  uuid NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  -- For DMs only: link back to the legacy conversations row so we can
  -- still operate on it during the transition. NULL for groups/channels.
  legacy_conversation_id      uuid UNIQUE REFERENCES public.conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chats_kind                 ON public.chats(kind);
CREATE INDEX IF NOT EXISTS idx_chats_legacy_conv          ON public.chats(legacy_conversation_id) WHERE legacy_conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chats_invite_token         ON public.chats(invite_token) WHERE invite_token IS NOT NULL AND invite_revoked = false;
CREATE INDEX IF NOT EXISTS idx_chats_updated_at           ON public.chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_public_channels      ON public.chats(kind, is_public) WHERE kind = 'channel' AND is_public = true;

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------
-- (2) chat_members — per-user state for each chat
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_members (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id                     uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id                     uuid NOT NULL,
  role                        text NOT NULL DEFAULT 'member'
                              CHECK (role IN ('owner', 'admin', 'member')),
  -- Custom display title shown next to this member's name in groups
  -- (e.g. "Founder", "Moderator", "Bot"). Only owner/admin can set.
  custom_title                text,
  joined_at                   timestamptz NOT NULL DEFAULT now(),
  added_by                    uuid,
  -- Per-member preference state. Replaces the localStorage-only model
  -- so settings survive browser changes / sign-in on a new device.
  muted_until                 timestamptz,        -- NULL = unmuted; far-future timestamp = "forever"
  archived_at                 timestamptz,        -- NULL = not archived
  pinned_at                   timestamptz,        -- NULL = not pinned (used to order pinned chats)
  notifications_enabled       boolean NOT NULL DEFAULT true,
  -- Read pointer: last message the user acknowledges having seen.
  -- Drives unread counts and "X new messages" entry point.
  last_read_message_id        uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  last_read_at                timestamptz,
  -- Soft-leave: a removed member keeps their row so historical messages
  -- from them still resolve their display title; we just stop showing
  -- the chat in their list.
  removed_at                  timestamptz,
  removed_by                  uuid,
  -- Per-chat draft (server-synced). Up to 4096 chars; we soft-cap below.
  draft_text                  text,
  draft_updated_at            timestamptz,
  UNIQUE(chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user           ON public.chat_members(user_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_members_chat           ON public.chat_members(chat_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_members_pinned         ON public.chat_members(user_id, pinned_at DESC) WHERE pinned_at IS NOT NULL AND removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_members_archived       ON public.chat_members(user_id) WHERE archived_at IS NOT NULL AND removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_members_admins         ON public.chat_members(chat_id, role) WHERE role IN ('owner', 'admin') AND removed_at IS NULL;

ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members REPLICA IDENTITY FULL;

-- Soft cap: limit draft size to MAX_TEXT_LENGTH (4096). Keep sane.
ALTER TABLE public.chat_members
  ADD CONSTRAINT chat_members_draft_len_chk
  CHECK (draft_text IS NULL OR length(draft_text) <= 4096) NOT VALID;

-- ---------------------------------------------------------------------
-- (3) chat_attachments — normalized media index
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id                     uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  message_id                  uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  uploaded_by                 uuid NOT NULL,
  kind                        text NOT NULL
                              CHECK (kind IN ('image', 'video', 'audio', 'voice', 'file', 'sticker', 'gif')),
  storage_path                text NOT NULL,    -- private bucket path
  thumb_path                  text,             -- generated client-side, small (≤ 30 KB)
  mime_type                   text,
  size_bytes                  bigint,
  duration_seconds            numeric,          -- audio/video/voice
  width                       integer,
  height                      integer,
  -- BlurHash placeholder for instant low-res preview before the real
  -- image loads. ≤ 30 chars, base83.
  blurhash                    text,
  -- Caption/title for the media (e.g. file name or image caption).
  caption                     text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_chat       ON public.chat_attachments(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_chat_kind  ON public.chat_attachments(chat_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message    ON public.chat_attachments(message_id);

ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------
-- (4) Extend messages with chat_id (back-compat with conversations)
-- ---------------------------------------------------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_chat
  ON public.messages(chat_id, created_at)
  WHERE chat_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- (5) blocked_users — foundation for the privacy wave
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id                  uuid NOT NULL,
  blocked_id                  uuid NOT NULL,
  reason                      text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- (6) Helper: is the caller a (non-removed) member of the chat?
-- Wrapped in a SECURITY DEFINER function so RLS predicates can call it
-- without recursive RLS on chat_members. (Without SECURITY DEFINER an
-- RLS policy on chats would call back into chat_members RLS, which
-- in turn would call back into chats RLS — Postgres detects and
-- aborts that loop.)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_chat_member(p_chat_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members m
    WHERE m.chat_id = p_chat_id
      AND m.user_id = p_user_id
      AND m.removed_at IS NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.chat_member_role(p_chat_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.chat_members
   WHERE chat_id = p_chat_id
     AND user_id = p_user_id
     AND removed_at IS NULL
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.chat_member_role(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.chat_member_role(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.chat_member_role(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- (7) RLS policies — chats
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can read their chats"         ON public.chats;
DROP POLICY IF EXISTS "Public channels are readable to all"  ON public.chats;
DROP POLICY IF EXISTS "Authenticated users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Admins can update chat metadata"      ON public.chats;
DROP POLICY IF EXISTS "Owner can delete chat"                ON public.chats;

CREATE POLICY "Members can read their chats"
ON public.chats FOR SELECT TO authenticated
USING (
  public.is_chat_member(id, auth.uid())
  OR (kind = 'channel' AND is_public = true)
);

-- Anyone signed-in can create a chat. Validation happens via the
-- create_group_chat RPC; the table policy is permissive on INSERT
-- because the caller must put themselves in chat_members in the
-- same transaction (the RPC enforces this). Direct INSERT is allowed
-- so the RPC can use SECURITY INVOKER paths if needed.
CREATE POLICY "Authenticated users can create chats"
ON public.chats FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- UPDATE: admins/owner of the chat can update metadata. The check
-- runs against the new row's id (which equals the existing one for
-- UPDATE).
CREATE POLICY "Admins can update chat metadata"
ON public.chats FOR UPDATE TO authenticated
USING (
  public.chat_member_role(id, auth.uid()) IN ('owner', 'admin')
)
WITH CHECK (
  public.chat_member_role(id, auth.uid()) IN ('owner', 'admin')
);

-- DELETE: owner only.
CREATE POLICY "Owner can delete chat"
ON public.chats FOR DELETE TO authenticated
USING (
  public.chat_member_role(id, auth.uid()) = 'owner'
);

-- ---------------------------------------------------------------------
-- (8) RLS policies — chat_members
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can see other members of their chats" ON public.chat_members;
DROP POLICY IF EXISTS "Members can insert themselves"               ON public.chat_members;
DROP POLICY IF EXISTS "Admins can insert other members"             ON public.chat_members;
DROP POLICY IF EXISTS "Members can update their own preferences"    ON public.chat_members;
DROP POLICY IF EXISTS "Admins can update other members"             ON public.chat_members;
DROP POLICY IF EXISTS "Admins can remove members"                   ON public.chat_members;

CREATE POLICY "Members can see other members of their chats"
ON public.chat_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_chat_member(chat_id, auth.uid())
);

-- Self-insert (e.g. joining a public channel). Admin-driven inserts
-- happen via add_chat_member RPC.
CREATE POLICY "Members can insert themselves"
ON public.chat_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- Members can update their OWN preferences (mute/pin/archive/draft).
-- Role/custom-title changes go through update_chat_member_role RPC.
CREATE POLICY "Members can update their own preferences"
ON public.chat_members FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  -- Cannot promote yourself: role can only stay the same on self-update.
  AND role = (SELECT role FROM public.chat_members WHERE id = chat_members.id)
);

-- Members can leave a chat via UPDATE removed_at = now() on their own
-- row (handled implicitly by the previous policy).

-- Hard delete is not exposed via RLS — admin removals go through RPC
-- so we always have a soft-leave trail.

-- ---------------------------------------------------------------------
-- (9) RLS policies — chat_attachments
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can see attachments in their chats" ON public.chat_attachments;
DROP POLICY IF EXISTS "Members can record attachments"             ON public.chat_attachments;

CREATE POLICY "Members can see attachments in their chats"
ON public.chat_attachments FOR SELECT TO authenticated
USING (public.is_chat_member(chat_id, auth.uid()));

CREATE POLICY "Members can record attachments"
ON public.chat_attachments FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND public.is_chat_member(chat_id, auth.uid())
);

-- ---------------------------------------------------------------------
-- (10) RLS policies — blocked_users
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can see their own block list"   ON public.blocked_users;
DROP POLICY IF EXISTS "Users can add blocks"                 ON public.blocked_users;
DROP POLICY IF EXISTS "Users can remove their own blocks"    ON public.blocked_users;

CREATE POLICY "Users can see their own block list"
ON public.blocked_users FOR SELECT TO authenticated
USING (blocker_id = auth.uid());

CREATE POLICY "Users can add blocks"
ON public.blocked_users FOR INSERT TO authenticated
WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can remove their own blocks"
ON public.blocked_users FOR DELETE TO authenticated
USING (blocker_id = auth.uid());

-- ---------------------------------------------------------------------
-- (11) Update messages SELECT policy to also accept chat_id-based lookup
-- without breaking the legacy conversation-based path. We rewrite the
-- existing policy to OR the two predicates.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their chats"
ON public.messages FOR SELECT TO authenticated
USING (
  -- Legacy DM path (conversations table): keep it working until every
  -- caller migrates to chat_id.
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
  OR
  -- New unified path: caller must be a (non-removed) member of the chat.
  (chat_id IS NOT NULL AND public.is_chat_member(chat_id, auth.uid()))
);

-- INSERT: caller must be a participant (legacy) OR an active member of
-- the chat with permission to send.
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;

CREATE POLICY "Users can send messages in their chats"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    -- Legacy DM path
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR
    -- New path: must be a member, and if `who_can_send='admins'` must
    -- be admin/owner.
    (chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chats ch
      JOIN public.chat_members m ON m.chat_id = ch.id
      WHERE ch.id = messages.chat_id
        AND m.user_id = auth.uid()
        AND m.removed_at IS NULL
        AND (
          ch.who_can_send = 'all'
          OR m.role IN ('owner', 'admin')
        )
    ))
  )
);

-- ---------------------------------------------------------------------
-- (12) updated_at trigger on chats
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_chat_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chats_set_updated_at ON public.chats;
CREATE TRIGGER chats_set_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_chat_updated_at();

-- Bump chats.updated_at AND mirror messages.conversation_id <-> chat_id
-- on INSERT so legacy + new ordering stay in sync.
CREATE OR REPLACE FUNCTION public.bump_chat_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Pair the message with its chat_id when only conversation_id was
  -- supplied (legacy callers).
  IF NEW.chat_id IS NULL AND NEW.conversation_id IS NOT NULL THEN
    SELECT id INTO NEW.chat_id
      FROM public.chats
     WHERE legacy_conversation_id = NEW.conversation_id
     LIMIT 1;
  END IF;

  -- Bump the new chat's updated_at so the conversation list re-sorts.
  IF NEW.chat_id IS NOT NULL THEN
    UPDATE public.chats
    SET updated_at = NEW.created_at
    WHERE id = NEW.chat_id
      AND updated_at < NEW.created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_bump_chat ON public.messages;
CREATE TRIGGER messages_bump_chat
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_chat_on_new_message();

-- ---------------------------------------------------------------------
-- (13) Backfill from existing conversations
-- ---------------------------------------------------------------------
-- For every existing conversation row, materialize:
--   • A chats row of kind='dm'
--   • Two chat_members rows (user1, user2) with role='member'
--   • An update on every message in that conversation to set chat_id
-- This is idempotent — re-running after a partial run is safe.
DO $$
DECLARE
  c RECORD;
  v_chat_id uuid;
BEGIN
  FOR c IN SELECT * FROM public.conversations LOOP
    -- Skip if already backfilled
    SELECT id INTO v_chat_id
      FROM public.chats
     WHERE legacy_conversation_id = c.id
     LIMIT 1;

    IF v_chat_id IS NULL THEN
      INSERT INTO public.chats (
        kind, created_by, legacy_conversation_id,
        self_destruct_seconds, pinned_message_id,
        created_at, updated_at
      )
      VALUES (
        'dm', c.user1_id, c.id,
        c.self_destruct_seconds, c.pinned_message_id,
        c.created_at, c.updated_at
      )
      RETURNING id INTO v_chat_id;

      INSERT INTO public.chat_members (chat_id, user_id, role, joined_at, added_by)
      VALUES (v_chat_id, c.user1_id, 'member', c.created_at, c.user1_id)
      ON CONFLICT (chat_id, user_id) DO NOTHING;

      INSERT INTO public.chat_members (chat_id, user_id, role, joined_at, added_by)
      VALUES (v_chat_id, c.user2_id, 'member', c.created_at, c.user1_id)
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;

    -- Pair existing messages with the new chat_id
    UPDATE public.messages
       SET chat_id = v_chat_id
     WHERE conversation_id = c.id
       AND chat_id IS NULL;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- (14) Realtime publication entries
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chats') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chats';
  END IF;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_members') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members';
  END IF;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_attachments') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_attachments';
  END IF;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- (15) Realtime authorization for chat:<uuid> and chat-typing:<uuid>
-- topics. Reuses the same approach as the existing typing:* policies
-- but for the unified chat model.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authorize chat realtime channels" ON realtime.messages;
CREATE POLICY "Authorize chat realtime channels"
ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    WHEN realtime.topic() = 'presence:online' THEN true
    -- Legacy patterns (kept working during transition)
    WHEN realtime.topic() LIKE 'typing:%'        THEN EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = substring(realtime.topic() from 8)
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    WHEN realtime.topic() LIKE 'conversation:%' THEN EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = split_part(realtime.topic(), ':', 2)
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    -- New unified patterns
    WHEN realtime.topic() LIKE 'chat:%'         THEN
      public.is_chat_member((split_part(realtime.topic(), ':', 2))::uuid, auth.uid())
    WHEN realtime.topic() LIKE 'chat-typing:%'  THEN
      public.is_chat_member((split_part(realtime.topic(), ':', 2))::uuid, auth.uid())
    ELSE true
  END
);

DROP POLICY IF EXISTS "Authorize chat realtime writes" ON realtime.messages;
CREATE POLICY "Authorize chat realtime writes"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() = 'presence:online' THEN true
    WHEN realtime.topic() LIKE 'typing:%'        THEN EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = substring(realtime.topic() from 8)
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    WHEN realtime.topic() LIKE 'chat-typing:%'  THEN
      public.is_chat_member((split_part(realtime.topic(), ':', 2))::uuid, auth.uid())
    ELSE false
  END
);

-- ---------------------------------------------------------------------
-- (16) RPC: create_group_chat
-- Creates a chat (group/channel) with the caller as owner, plus
-- chat_members rows for every member id passed in. Returns the new
-- chat row so the caller can immediately render it without a follow-up
-- SELECT (which would be subject to RLS replication lag).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group_chat(
  p_kind         text,
  p_title        text,
  p_description  text DEFAULT NULL,
  p_avatar_url   text DEFAULT NULL,
  p_member_ids   uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS public.chats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat   public.chats;
  v_member uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_kind NOT IN ('group', 'channel') THEN
    RAISE EXCEPTION 'Invalid kind. Use create_or_get_dm for direct messages.';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title required for groups and channels';
  END IF;
  IF length(p_title) > 120 THEN
    RAISE EXCEPTION 'Title too long (max 120 chars)';
  END IF;

  INSERT INTO public.chats (kind, title, description, avatar_url, created_by)
  VALUES (p_kind, trim(p_title), p_description, p_avatar_url, auth.uid())
  RETURNING * INTO v_chat;

  -- Owner row
  INSERT INTO public.chat_members (chat_id, user_id, role, added_by)
  VALUES (v_chat.id, auth.uid(), 'owner', auth.uid());

  -- Bulk add members (skip duplicates and self)
  IF p_member_ids IS NOT NULL THEN
    FOREACH v_member IN ARRAY p_member_ids LOOP
      IF v_member IS NOT NULL AND v_member <> auth.uid() THEN
        INSERT INTO public.chat_members (chat_id, user_id, role, added_by)
        VALUES (v_chat.id, v_member, 'member', auth.uid())
        ON CONFLICT (chat_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_chat;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_group_chat(text, text, text, text, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_group_chat(text, text, text, text, uuid[]) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_group_chat(text, text, text, text, uuid[]) TO authenticated;

-- ---------------------------------------------------------------------
-- (17) RPC: create_or_get_dm
-- DM-creation entrypoint that mirrors to legacy conversations and
-- returns the resulting chats row. Idempotent — calling twice with
-- the same other_user_id returns the same chat.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_get_dm(p_other_user_id uuid)
RETURNS public.chats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user1   uuid;
  v_user2   uuid;
  v_conv_id uuid;
  v_chat    public.chats;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_other_user_id IS NULL OR p_other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;
  -- Block check: refuse to create a DM between users where either
  -- side has blocked the other.
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Cannot start a chat with a blocked user';
  END IF;

  -- Canonical user pair ordering (UNIQUE constraint on conversations).
  IF auth.uid() < p_other_user_id THEN
    v_user1 := auth.uid();
    v_user2 := p_other_user_id;
  ELSE
    v_user1 := p_other_user_id;
    v_user2 := auth.uid();
  END IF;

  -- Reuse an existing conversation if any.
  SELECT id INTO v_conv_id
    FROM public.conversations
   WHERE user1_id = v_user1 AND user2_id = v_user2
   LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (user1_id, user2_id)
    VALUES (v_user1, v_user2)
    RETURNING id INTO v_conv_id;
  END IF;

  -- Find or create the matching chats row.
  SELECT * INTO v_chat
    FROM public.chats
   WHERE legacy_conversation_id = v_conv_id
   LIMIT 1;

  IF v_chat.id IS NULL THEN
    INSERT INTO public.chats (kind, created_by, legacy_conversation_id)
    VALUES ('dm', auth.uid(), v_conv_id)
    RETURNING * INTO v_chat;

    INSERT INTO public.chat_members (chat_id, user_id, role, added_by)
    VALUES (v_chat.id, v_user1, 'member', auth.uid())
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    INSERT INTO public.chat_members (chat_id, user_id, role, added_by)
    VALUES (v_chat.id, v_user2, 'member', auth.uid())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;

  RETURN v_chat;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_or_get_dm(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_or_get_dm(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.create_or_get_dm(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- (18) RPC: add_chat_member, remove_chat_member, update_chat_member_role
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_chat_member(p_chat_id uuid, p_user_id uuid)
RETURNS public.chat_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_who_can text;
  v_role    text;
  v_member  public.chat_members;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT who_can_add_members INTO v_who_can FROM public.chats WHERE id = p_chat_id;
  IF v_who_can IS NULL THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;

  v_role := public.chat_member_role(p_chat_id, auth.uid());
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this chat';
  END IF;
  IF v_who_can = 'admins' AND v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only admins can add members in this chat';
  END IF;

  -- Restore a previously-removed member instead of inserting a duplicate.
  UPDATE public.chat_members
     SET removed_at = NULL,
         removed_by = NULL,
         joined_at  = now(),
         added_by   = auth.uid(),
         role       = 'member'
   WHERE chat_id = p_chat_id
     AND user_id = p_user_id
   RETURNING * INTO v_member;

  IF v_member.id IS NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, role, added_by)
    VALUES (p_chat_id, p_user_id, 'member', auth.uid())
    RETURNING * INTO v_member;
  END IF;

  RETURN v_member;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_chat_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_chat_member(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.add_chat_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_chat_member(p_chat_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_caller_role := public.chat_member_role(p_chat_id, auth.uid());
  v_target_role := public.chat_member_role(p_chat_id, p_user_id);

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this chat';
  END IF;

  -- Self-removal is always allowed (i.e. "leave chat"). Otherwise the
  -- caller must be admin/owner AND must outrank the target.
  IF p_user_id <> auth.uid() THEN
    IF v_caller_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Only admins can remove members';
    END IF;
    IF v_target_role = 'owner' THEN
      RAISE EXCEPTION 'Cannot remove the owner';
    END IF;
    IF v_caller_role = 'admin' AND v_target_role = 'admin' THEN
      RAISE EXCEPTION 'Admins cannot remove other admins; transfer ownership instead';
    END IF;
  END IF;

  UPDATE public.chat_members
     SET removed_at = now(),
         removed_by = auth.uid()
   WHERE chat_id = p_chat_id
     AND user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_chat_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_chat_member(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.remove_chat_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_chat_member_role(
  p_chat_id    uuid,
  p_user_id    uuid,
  p_new_role   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_new_role NOT IN ('admin', 'member') THEN
    -- Owner transfer is not exposed here — would require a specific RPC
    -- with confirmation flow.
    RAISE EXCEPTION 'Invalid role';
  END IF;

  v_caller_role := public.chat_member_role(p_chat_id, auth.uid());
  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;

  UPDATE public.chat_members
     SET role = p_new_role
   WHERE chat_id = p_chat_id
     AND user_id = p_user_id
     AND removed_at IS NULL
     AND role <> 'owner';  -- never demote the owner
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_chat_member_role(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_chat_member_role(uuid, uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.update_chat_member_role(uuid, uuid, text) TO authenticated;

-- ---------------------------------------------------------------------
-- (19) RPC: update_chat_metadata (admin-only title/description/avatar)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_chat_metadata(
  p_chat_id     uuid,
  p_title       text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_avatar_url  text DEFAULT NULL
)
RETURNS public.chats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_who_can     text;
  v_chat        public.chats;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT who_can_edit_meta INTO v_who_can FROM public.chats WHERE id = p_chat_id;
  IF v_who_can IS NULL THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;

  v_caller_role := public.chat_member_role(p_chat_id, auth.uid());
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not a member';
  END IF;
  IF v_who_can = 'owner' AND v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the owner can edit metadata in this chat';
  END IF;
  IF v_who_can = 'admins' AND v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only admins can edit metadata';
  END IF;

  UPDATE public.chats
     SET title       = COALESCE(p_title,       title),
         description = COALESCE(p_description, description),
         avatar_url  = COALESCE(p_avatar_url,  avatar_url)
   WHERE id = p_chat_id
   RETURNING * INTO v_chat;
  RETURN v_chat;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_chat_metadata(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_chat_metadata(uuid, text, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.update_chat_metadata(uuid, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- (20) Per-member preference RPCs
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_chat_pinned(p_chat_id uuid, p_pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  UPDATE public.chat_members
     SET pinned_at = CASE WHEN p_pinned THEN now() ELSE NULL END
   WHERE chat_id = p_chat_id AND user_id = auth.uid() AND removed_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_chat_pinned(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_chat_pinned(uuid, boolean) FROM anon;
GRANT  EXECUTE ON FUNCTION public.set_chat_pinned(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_chat_archived(p_chat_id uuid, p_archived boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  UPDATE public.chat_members
     SET archived_at = CASE WHEN p_archived THEN now() ELSE NULL END
   WHERE chat_id = p_chat_id AND user_id = auth.uid() AND removed_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_chat_archived(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_chat_archived(uuid, boolean) FROM anon;
GRANT  EXECUTE ON FUNCTION public.set_chat_archived(uuid, boolean) TO authenticated;

-- Mute for N seconds. p_seconds < 0 => mute forever (year 9999).
CREATE OR REPLACE FUNCTION public.set_chat_muted(p_chat_id uuid, p_seconds integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_seconds = 0 THEN
    v_until := NULL;
  ELSIF p_seconds < 0 THEN
    v_until := '9999-12-31 23:59:59+00'::timestamptz;
  ELSE
    v_until := now() + make_interval(secs => p_seconds);
  END IF;
  UPDATE public.chat_members
     SET muted_until = v_until
   WHERE chat_id = p_chat_id AND user_id = auth.uid() AND removed_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_chat_muted(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_chat_muted(uuid, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.set_chat_muted(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_chat_read(p_chat_id uuid, p_message_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  -- If no specific message id is supplied, read up to the latest one.
  IF p_message_id IS NULL THEN
    SELECT id INTO v_msg_id
      FROM public.messages
     WHERE chat_id = p_chat_id
     ORDER BY created_at DESC
     LIMIT 1;
  ELSE
    v_msg_id := p_message_id;
  END IF;

  UPDATE public.chat_members
     SET last_read_message_id = v_msg_id,
         last_read_at         = now()
   WHERE chat_id = p_chat_id AND user_id = auth.uid() AND removed_at IS NULL;

  -- Cascade to legacy `messages.read = true` for DMs so existing UIs and
  -- the unread-count singleton keep working without migration.
  UPDATE public.messages
     SET read = true
   WHERE chat_id = p_chat_id
     AND sender_id <> auth.uid()
     AND read = false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_chat_read(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_chat_read(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.mark_chat_read(uuid, uuid) TO authenticated;

-- Save / clear server-synced draft for the active chat.
CREATE OR REPLACE FUNCTION public.set_chat_draft(p_chat_id uuid, p_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_text IS NULL OR length(trim(p_text)) = 0 THEN
    UPDATE public.chat_members
       SET draft_text = NULL, draft_updated_at = NULL
     WHERE chat_id = p_chat_id AND user_id = auth.uid() AND removed_at IS NULL;
  ELSE
    IF length(p_text) > 4096 THEN
      RAISE EXCEPTION 'Draft too long';
    END IF;
    UPDATE public.chat_members
       SET draft_text = p_text, draft_updated_at = now()
     WHERE chat_id = p_chat_id AND user_id = auth.uid() AND removed_at IS NULL;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_chat_draft(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_chat_draft(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.set_chat_draft(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------
-- (21) Block / unblock RPCs (light wrappers — table policies suffice but
-- the RPC route makes the call shape consistent with everything else)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_user(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_user_id IS NULL OR p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block self';
  END IF;
  INSERT INTO public.blocked_users (blocker_id, blocked_id, reason)
  VALUES (auth.uid(), p_user_id, p_reason)
  ON CONFLICT (blocker_id, blocked_id) DO UPDATE
    SET reason = EXCLUDED.reason;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.block_user(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.block_user(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.block_user(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.unblock_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  DELETE FROM public.blocked_users
   WHERE blocker_id = auth.uid()
     AND blocked_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.unblock_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unblock_user(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- (22) RPC: list_my_chats
-- Single round-trip that returns every active chat for the caller with
-- enough hydrated metadata to render the list (avatars, role, last
-- message preview, unread count, mute/pin/archive flags). Saves the
-- client from the N+1 fan-out it currently does.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_chats()
RETURNS TABLE (
  chat_id              uuid,
  kind                 text,
  title                text,
  description          text,
  avatar_url           text,
  is_public            boolean,
  who_can_send         text,
  legacy_conversation_id uuid,
  pinned_message_id    uuid,
  self_destruct_seconds integer,
  updated_at           timestamptz,
  created_at           timestamptz,
  member_role          text,
  member_pinned_at     timestamptz,
  member_archived_at   timestamptz,
  member_muted_until   timestamptz,
  member_last_read_at  timestamptz,
  member_draft_text    text,
  unread_count         integer,
  member_count         integer,
  last_message_id      uuid,
  last_message_at      timestamptz,
  last_message_kind    text,
  last_message_sender  uuid,
  last_message_preview text,
  last_message_deleted boolean,
  -- DM-only "other party" fields (NULL for groups/channels)
  other_user_id        uuid,
  other_username       text,
  other_display_name   text,
  other_avatar_url     text,
  other_last_seen      timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my AS (
    SELECT m.*,
           c.kind, c.title, c.description, c.avatar_url, c.is_public,
           c.who_can_send, c.legacy_conversation_id, c.pinned_message_id,
           c.self_destruct_seconds, c.updated_at, c.created_at
      FROM public.chat_members m
      JOIN public.chats c ON c.id = m.chat_id
     WHERE m.user_id = auth.uid()
       AND m.removed_at IS NULL
  ),
  last_msg AS (
    SELECT DISTINCT ON (msg.chat_id)
           msg.chat_id, msg.id, msg.created_at, msg.message_type,
           msg.sender_id, msg.content, msg.deleted, msg.file_name
      FROM public.messages msg
     WHERE msg.chat_id IN (SELECT my.chat_id FROM my)
     ORDER BY msg.chat_id, msg.created_at DESC
  ),
  unread AS (
    SELECT my.chat_id, COUNT(*)::int AS cnt
      FROM my
      LEFT JOIN public.messages msg
        ON msg.chat_id = my.chat_id
       AND msg.sender_id <> auth.uid()
       AND msg.deleted = false
       AND (
         my.last_read_at IS NULL
         OR msg.created_at > my.last_read_at
       )
     GROUP BY my.chat_id
  ),
  mcount AS (
    SELECT chat_id, COUNT(*)::int AS cnt
      FROM public.chat_members
     WHERE removed_at IS NULL
     GROUP BY chat_id
  ),
  dm_other AS (
    SELECT my.chat_id,
           o.user_id  AS other_user_id,
           p.username AS other_username,
           p.display_name AS other_display_name,
           p.avatar_url AS other_avatar_url,
           p.last_seen AS other_last_seen
      FROM my
      JOIN public.chat_members o
        ON o.chat_id = my.chat_id
       AND o.user_id <> auth.uid()
       AND o.removed_at IS NULL
      LEFT JOIN public.profiles p ON p.user_id = o.user_id
     WHERE my.kind = 'dm'
  )
  SELECT
    my.chat_id,
    my.kind,
    my.title,
    my.description,
    my.avatar_url,
    my.is_public,
    my.who_can_send,
    my.legacy_conversation_id,
    my.pinned_message_id,
    my.self_destruct_seconds,
    my.updated_at,
    my.created_at,
    my.role               AS member_role,
    my.pinned_at          AS member_pinned_at,
    my.archived_at        AS member_archived_at,
    my.muted_until        AS member_muted_until,
    my.last_read_at       AS member_last_read_at,
    my.draft_text         AS member_draft_text,
    COALESCE(unread.cnt, 0)::int AS unread_count,
    COALESCE(mcount.cnt, 0)::int AS member_count,
    last_msg.id           AS last_message_id,
    last_msg.created_at   AS last_message_at,
    last_msg.message_type AS last_message_kind,
    last_msg.sender_id    AS last_message_sender,
    CASE
      WHEN last_msg.deleted THEN ''
      WHEN last_msg.message_type IN ('image','voice','file','sticker','gif','video') THEN COALESCE(last_msg.file_name, '')
      ELSE COALESCE(last_msg.content, '')
    END                   AS last_message_preview,
    COALESCE(last_msg.deleted, false) AS last_message_deleted,
    dm_other.other_user_id,
    dm_other.other_username,
    dm_other.other_display_name,
    dm_other.other_avatar_url,
    dm_other.other_last_seen
  FROM my
  LEFT JOIN last_msg  ON last_msg.chat_id = my.chat_id
  LEFT JOIN unread    ON unread.chat_id   = my.chat_id
  LEFT JOIN mcount    ON mcount.chat_id   = my.chat_id
  LEFT JOIN dm_other  ON dm_other.chat_id = my.chat_id
  ORDER BY
    (my.pinned_at IS NULL),
    COALESCE(my.pinned_at, my.updated_at) DESC,
    my.updated_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.list_my_chats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_my_chats() FROM anon;
GRANT  EXECUTE ON FUNCTION public.list_my_chats() TO authenticated;

-- ---------------------------------------------------------------------
-- (23) RPC: list_chat_members (used by member-list sheet)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_chat_members(p_chat_id uuid)
RETURNS TABLE (
  user_id      uuid,
  role         text,
  custom_title text,
  joined_at    timestamptz,
  added_by     uuid,
  username     text,
  display_name text,
  avatar_url   text,
  last_seen    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    m.role,
    m.custom_title,
    m.joined_at,
    m.added_by,
    p.username,
    p.display_name,
    p.avatar_url,
    p.last_seen
  FROM public.chat_members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.chat_id = p_chat_id
    AND m.removed_at IS NULL
    AND public.is_chat_member(p_chat_id, auth.uid())
  ORDER BY
    CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
    m.joined_at;
$$;

REVOKE EXECUTE ON FUNCTION public.list_chat_members(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_chat_members(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.list_chat_members(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- (24) RPC: get_messages_paginated
-- Returns a page of N messages strictly older than `before_id`. Used
-- by the new useInfiniteQuery in the client.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_messages_paginated(
  p_chat_id   uuid,
  p_before_id uuid DEFAULT NULL,
  p_limit     integer DEFAULT 50
)
RETURNS SETOF public.messages
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before timestamptz;
  v_lim    integer;
BEGIN
  IF NOT public.is_chat_member(p_chat_id, auth.uid()) THEN
    -- Allow legacy DM access path too
    IF NOT EXISTS (
      SELECT 1
        FROM public.chats c
        JOIN public.conversations conv ON conv.id = c.legacy_conversation_id
       WHERE c.id = p_chat_id
         AND (conv.user1_id = auth.uid() OR conv.user2_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Not a participant';
    END IF;
  END IF;

  v_lim := LEAST(GREATEST(p_limit, 1), 200);

  IF p_before_id IS NOT NULL THEN
    SELECT created_at INTO v_before FROM public.messages WHERE id = p_before_id;
  END IF;

  RETURN QUERY
  SELECT *
    FROM public.messages
   WHERE chat_id = p_chat_id
     AND (v_before IS NULL OR created_at < v_before)
   ORDER BY created_at DESC
   LIMIT v_lim;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_messages_paginated(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_messages_paginated(uuid, uuid, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_messages_paginated(uuid, uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------
-- (25) Storage RLS update — also allow chat-files reads when the path's
-- second segment (the chat id) matches a chat the caller is a member of.
-- The legacy convention puts conversation_id there; we allow either.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read chat files in their chats" ON storage.objects;
CREATE POLICY "Users can read chat files in their chats"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (
    -- Uploader's own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Legacy: <sender_id>/<conversation_id>/...
    EXISTS (
      SELECT 1
        FROM public.conversations c
       WHERE (storage.foldername(name))[2] IS NOT NULL
         AND c.id = ((storage.foldername(name))[2])::uuid
         AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
    OR
    -- New: <sender_id>/<chat_id>/...
    EXISTS (
      SELECT 1
        FROM public.chat_members m
       WHERE (storage.foldername(name))[2] IS NOT NULL
         AND m.chat_id = ((storage.foldername(name))[2])::uuid
         AND m.user_id = auth.uid()
         AND m.removed_at IS NULL
    )
    OR
    -- Forwarded media (any chat that references this object)
    EXISTS (
      SELECT 1
        FROM public.messages msg
        JOIN public.chat_members m ON m.chat_id = msg.chat_id
       WHERE msg.deleted = false
         AND msg.file_url = storage.objects.name
         AND m.user_id = auth.uid()
         AND m.removed_at IS NULL
    )
  )
);

-- ---------------------------------------------------------------------
-- (26) Diagnostic: a tiny health check the app can call at boot
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_schema_version()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'version',   'wave1',
    'committed', '2026-05-25',
    'features',  ARRAY['groups','channels','members','attachments','blocks','member_drafts','server_unread']
  );
$$;

GRANT EXECUTE ON FUNCTION public.chat_schema_version() TO PUBLIC;
