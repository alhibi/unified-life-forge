ALTER TABLE public.mg_connections DROP CONSTRAINT IF EXISTS mg_connections_novelty_score_check;
ALTER TABLE public.mg_connections ADD CONSTRAINT mg_connections_novelty_score_check CHECK (novelty_score >= 1 AND novelty_score <= 10);

ALTER TABLE public.mg_connections DROP CONSTRAINT IF EXISTS mg_connections_confidence_label_check;
ALTER TABLE public.mg_connections ADD CONSTRAINT mg_connections_confidence_label_check CHECK (confidence_label = ANY (ARRAY['speculative','plausible','strong','well_established']));

ALTER TABLE public.mg_connections DROP CONSTRAINT IF EXISTS mg_connections_status_check;
ALTER TABLE public.mg_connections ADD CONSTRAINT mg_connections_status_check CHECK (status = ANY (ARRAY['new','kept','pinned','dismissed']));