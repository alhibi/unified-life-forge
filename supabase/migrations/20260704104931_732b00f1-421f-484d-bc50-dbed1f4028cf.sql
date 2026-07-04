ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS forwarded_from_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forwarded_from_sender_id uuid;

CREATE INDEX IF NOT EXISTS idx_messages_forwarded_from_message_id
  ON public.messages(forwarded_from_message_id)
  WHERE forwarded_from_message_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';