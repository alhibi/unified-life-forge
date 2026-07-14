
CREATE TABLE public.pkm_notes (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pkm_notes_user_idx ON public.pkm_notes(user_id) WHERE is_deleted = false;

CREATE TABLE public.pkm_note_links (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  source_note_id UUID NOT NULL REFERENCES public.pkm_notes(id) ON DELETE CASCADE,
  target_note_id UUID REFERENCES public.pkm_notes(id) ON DELETE SET NULL,
  link_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_note_id, link_text)
);
CREATE INDEX pkm_links_target_idx ON public.pkm_note_links(target_note_id);

CREATE TABLE public.pkm_ai_generations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.pkm_notes(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('A','B')),
  original_content TEXT NOT NULL,
  generated_content TEXT,
  model TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','streaming','completed','accepted','reverted','error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pkm_notes TO authenticated;
GRANT ALL ON public.pkm_notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pkm_note_links TO authenticated;
GRANT ALL ON public.pkm_note_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pkm_ai_generations TO authenticated;
GRANT ALL ON public.pkm_ai_generations TO service_role;

ALTER TABLE public.pkm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pkm_note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pkm_ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pkm_notes" ON public.pkm_notes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own pkm_note_links" ON public.pkm_note_links
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pkm_notes n WHERE n.id = source_note_id AND n.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pkm_notes n WHERE n.id = source_note_id AND n.user_id = auth.uid()));

CREATE POLICY "own pkm_ai_generations" ON public.pkm_ai_generations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pkm_notes n WHERE n.id = note_id AND n.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pkm_notes n WHERE n.id = note_id AND n.user_id = auth.uid()));

CREATE TRIGGER pkm_notes_updated_at
  BEFORE UPDATE ON public.pkm_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
