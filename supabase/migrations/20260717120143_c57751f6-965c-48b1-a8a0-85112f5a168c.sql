
CREATE TABLE public.wellness_records (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       text NOT NULL,
  record_id  text NOT NULL,
  data       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, record_id)
);

CREATE INDEX wellness_records_user_kind_idx
  ON public.wellness_records (user_id, kind);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellness_records TO authenticated;
GRANT ALL ON public.wellness_records TO service_role;

ALTER TABLE public.wellness_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wellness records"
  ON public.wellness_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER wellness_records_touch_updated_at
  BEFORE UPDATE ON public.wellness_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
