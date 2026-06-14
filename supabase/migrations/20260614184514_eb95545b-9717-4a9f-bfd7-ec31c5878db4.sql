
-- Prevent sender_id / conversation_id tampering on UPDATE.
-- RLS WITH CHECK cannot reference OLD, so we enforce immutability via a trigger.
CREATE OR REPLACE FUNCTION public.messages_prevent_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
    RAISE EXCEPTION 'sender_id is immutable';
  END IF;
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'conversation_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_prevent_owner_change ON public.messages;
CREATE TRIGGER messages_prevent_owner_change
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.messages_prevent_owner_change();
