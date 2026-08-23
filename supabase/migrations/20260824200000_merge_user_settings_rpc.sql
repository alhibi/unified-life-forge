-- merge_user_settings: atomic merge-on-write for the shared settings document.
--
-- Problem being fixed (settings-surface audit, Batch 2): the entire
-- user_settings.settings jsonb concatenation column is written by several
-- engines — AppContext (app preferences), the chat engine (settings.chat),
-- and the traveling layer (settings.traveling). Two read-modify-write clients
-- racing lose the slower writer's subtree entirely. This RPC merges the
-- incoming patch into the stored document inside one statement, so concurrent
-- writers compose instead of clobbering each other.
--
-- updated_at is maintained by the existing BEFORE UPDATE trigger.
--
-- Security: SECURITY INVOKER + search_path hardening per Supabase guidelines;
-- RLS on user_settings enforces ownership.

CREATE OR REPLACE FUNCTION public.merge_user_settings(p_patch jsonb)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  INSERT INTO user_settings (user_id, settings)
  VALUES (auth.uid(), p_patch)
  ON CONFLICT (user_id) DO UPDATE
    SET settings = user_settings.settings || EXCLUDED.settings;
$$;
