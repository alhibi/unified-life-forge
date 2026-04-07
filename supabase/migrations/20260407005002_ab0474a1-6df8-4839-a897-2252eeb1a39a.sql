
-- Add pinned message to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add edited_at to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone DEFAULT NULL;

-- Add expires_at to messages for self-destructing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT NULL;

-- Add self_destruct_seconds setting per conversation
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS self_destruct_seconds integer DEFAULT NULL;

-- Create index for efficient expiry checks
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages (expires_at) WHERE expires_at IS NOT NULL;
