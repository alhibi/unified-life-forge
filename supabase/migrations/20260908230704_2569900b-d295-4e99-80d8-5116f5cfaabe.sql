CREATE TABLE IF NOT EXISTS public.chat_public_keys (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key text NOT NULL CHECK (char_length(public_key) BETWEEN 32 AND 512),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_public_keys TO authenticated;
GRANT ALL ON public.chat_public_keys TO service_role;

ALTER TABLE public.chat_public_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read public keys" ON public.chat_public_keys;
CREATE POLICY "Authenticated users can read public keys"
  ON public.chat_public_keys
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users manage their own public key" ON public.chat_public_keys;
CREATE POLICY "Users manage their own public key"
  ON public.chat_public_keys
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_chat_public_key_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_chat_public_keys_updated_at ON public.chat_public_keys;
CREATE TRIGGER update_chat_public_keys_updated_at
  BEFORE UPDATE ON public.chat_public_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_chat_public_key_updated_at();