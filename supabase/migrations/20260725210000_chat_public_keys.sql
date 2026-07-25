-- ─────────────────────────────────────────────────────────────────────────────
-- End-to-end encryption: the public-key directory.
--
-- One active public key per account. Only the PUBLIC half is ever stored: the
-- private key is generated non-extractable in the browser and lives in that
-- device's IndexedDB, so this table cannot be used to read anyone's messages —
-- not by an attacker who dumps it, and not by us.
--
-- Read access is intentionally open to every authenticated user: you have to be
-- able to fetch the key of the person you are writing to. Write access is
-- restricted to the owner of the row, so nobody can substitute someone else's
-- key. (A malicious *server* still could, which is why the client shows a
-- comparable safety number and warns when a peer's key changes.)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_public_keys (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- base64url of the raw P-256 public point (65 bytes → 87 chars).
  public_key TEXT NOT NULL CHECK (char_length(public_key) BETWEEN 32 AND 512),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chat_public_keys TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chat_public_keys TO authenticated;
GRANT ALL ON public.chat_public_keys TO service_role;

ALTER TABLE public.chat_public_keys ENABLE ROW LEVEL SECURITY;

-- Anyone signed in may LOOK UP a key (required to start an encrypted chat).
DROP POLICY IF EXISTS "Authenticated users can read public keys" ON public.chat_public_keys;
CREATE POLICY "Authenticated users can read public keys"
  ON public.chat_public_keys
  FOR SELECT TO authenticated
  USING (true);

-- Only the owner may publish or replace their own key.
DROP POLICY IF EXISTS "Users manage their own public key" ON public.chat_public_keys;
CREATE POLICY "Users manage their own public key"
  ON public.chat_public_keys
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep updated_at honest; the client sends it but the trigger is authoritative.
DROP TRIGGER IF EXISTS update_chat_public_keys_updated_at ON public.chat_public_keys;
CREATE TRIGGER update_chat_public_keys_updated_at
  BEFORE UPDATE ON public.chat_public_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.chat_public_keys IS
  'Public halves of per-device ECDH P-256 identity keys used for end-to-end encrypted direct messages. Private keys never leave the browser.';
