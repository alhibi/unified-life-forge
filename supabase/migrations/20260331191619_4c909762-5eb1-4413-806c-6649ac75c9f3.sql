
CREATE TABLE public.clipboard_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  clipboard_type text NOT NULL DEFAULT 'sunnah',
  title text NOT NULL,
  description text,
  source text,
  item_from text,
  saved_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, clipboard_type)
);

ALTER TABLE public.clipboard_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clipboard items"
  ON public.clipboard_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clipboard items"
  ON public.clipboard_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clipboard items"
  ON public.clipboard_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
