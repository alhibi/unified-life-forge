-- =====================================================================
-- DIWAN — معجم المفردات + التشكيل + RPCs المتقدمة
-- =====================================================================
-- يكمّل الـ schema الذي عرّفته 20260519100000_diwan_library.sql:
--   • أعمدة التشكيل (نسخة كاملة الحركات) على الأبيات.
--   • جدول diwan_glossary لشرح المفردات الصعبة.
--   • RPCs جديدة:
--       - diwan_suggest(prefix, page_limit)        — autocomplete حيّ
--       - diwan_similar_poems(poem_slug, ...)      — قصائد مشابهة
--       - diwan_poem_glossary(poem_slug)           — مفردات قصيدة
--       - diwan_smart_search(q, page_limit)        — بحث موحّد
--   • تحديث diwan_get_poem لإرجاع التشكيل ضمن jsonb.
-- يعتمد على public.normalize_arabic (انظر 20260517020000_rss_search_arabic.sql).
-- =====================================================================

-- ─── 1) أعمدة التشكيل على الأبيات ──────────────────────────────────────
-- نُخزن النسخة المُشكَّلة بشكل منفصل لأن التشكيل ثقيل ويُشوّش الـ FTS.
-- البحث يبقى على hemistich1/2 الأصليين. الحركات تُعرض اختياريًا.
ALTER TABLE public.diwan_verses
  ADD COLUMN IF NOT EXISTS hemistich1_diacritized text,
  ADD COLUMN IF NOT EXISTS hemistich2_diacritized text;

-- ─── 2) جدول معجم المفردات ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diwan_glossary (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poem_id         uuid NOT NULL REFERENCES public.diwan_poems(id) ON DELETE CASCADE,
  word            text NOT NULL,                      -- بصيغته في القصيدة
  word_normalized text GENERATED ALWAYS AS (public.normalize_arabic(word)) STORED,
  meaning         text NOT NULL,
  verse_position  integer,                            -- البيت الذي ورد فيه (اختياري)
  source          text NOT NULL DEFAULT 'manual',     -- manual|enrich|imported
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diwan_glossary_poem
  ON public.diwan_glossary (poem_id);
CREATE INDEX IF NOT EXISTS idx_diwan_glossary_word_norm
  ON public.diwan_glossary (word_normalized);
-- نتجنّب التكرار: نفس الكلمة لنفس البيت تُحفظ مرّة واحدة. إن كان
-- verse_position فارغاً نعدّه شرحاً عاماً للقصيدة.
CREATE UNIQUE INDEX IF NOT EXISTS idx_diwan_glossary_unique
  ON public.diwan_glossary (poem_id, word_normalized, COALESCE(verse_position, -1));

ALTER TABLE public.diwan_glossary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Diwan glossary readable by all" ON public.diwan_glossary;
CREATE POLICY "Diwan glossary readable by all"
  ON public.diwan_glossary FOR SELECT USING (true);

-- ─── 3) RPC: diwan_suggest — autocomplete حيّ ──────────────────────────
-- يُغذّي شريط البحث في SearchBar أثناء الكتابة. يدمج الشعراء
-- والقصائد، ويرفع الترتيب لمن يبدأ اسمه/عنوانه بالمدخل.
CREATE OR REPLACE FUNCTION public.diwan_suggest(
  prefix      text,
  page_limit  integer DEFAULT 8
) RETURNS TABLE (
  kind  text,
  slug  text,
  label text,
  sub   text,
  rank  real
)
LANGUAGE sql STABLE
AS $$
  WITH q AS (
    SELECT public.normalize_arabic(coalesce(prefix, '')) AS p
  )
  -- الشعراء
  SELECT
    'poet'::text                                                AS kind,
    p.slug,
    p.name_ar                                                   AS label,
    CASE
      WHEN p.birth_year IS NOT NULL AND p.death_year IS NOT NULL
        THEN p.birth_year || '–' || p.death_year || 'م'
      WHEN p.death_year IS NOT NULL
        THEN 'ت ' || p.death_year || 'م'
      ELSE p.title
    END                                                         AS sub,
    (
      CASE WHEN public.normalize_arabic(p.name_ar) LIKE (q.p || '%') THEN 2.0 ELSE 1.0 END
      + (p.verses_count::real / 1000.0)
    )::real                                                     AS rank
  FROM public.diwan_poets p, q
  WHERE q.p <> ''
    AND public.normalize_arabic(p.name_ar) LIKE ('%' || q.p || '%')
  UNION ALL
  -- القصائد
  SELECT
    'poem'::text                                                AS kind,
    pm.slug,
    pm.title                                                    AS label,
    pt.name_ar                                                  AS sub,
    (
      CASE WHEN public.normalize_arabic(pm.title) LIKE (q.p || '%') THEN 1.5 ELSE 0.8 END
      + (pm.verses_count::real / 5000.0)
    )::real                                                     AS rank
  FROM public.diwan_poems pm
  JOIN public.diwan_poets pt ON pt.id = pm.poet_id, q
  WHERE q.p <> ''
    AND (
         public.normalize_arabic(pm.title) LIKE ('%' || q.p || '%')
      OR public.normalize_arabic(coalesce(pm.opening, '')) LIKE (q.p || '%')
    )
  ORDER BY rank DESC
  LIMIT GREATEST(1, LEAST(page_limit, 20));
$$;

REVOKE EXECUTE ON FUNCTION public.diwan_suggest(text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.diwan_suggest(text, integer) TO anon, authenticated;

-- ─── 4) RPC: diwan_similar_poems — قصائد مشابهة ────────────────────────
-- نُسجّل التشابه بشكل تركيبي (بدون pgvector):
--   البحر +3.0 · الغرض +2.5 · العصر +1.5 · القافية +1.0
--   · نفس الشاعر +0.8 · كل وسم مشترك +0.4
CREATE OR REPLACE FUNCTION public.diwan_similar_poems(
  poem_slug   text,
  page_limit  integer DEFAULT 6
) RETURNS TABLE (
  id           uuid,
  slug         text,
  title        text,
  opening      text,
  meter        text,
  rhyme        text,
  kind         text,
  tags         text[],
  verses_count integer,
  poet_id      uuid,
  poet_slug    text,
  poet_name    text,
  era_id       text,
  rank         real,
  score        real
)
LANGUAGE sql STABLE
AS $$
  WITH src AS (
    SELECT id, era_id, meter, rhyme, kind, poet_id, tags
    FROM public.diwan_poems
    WHERE slug = poem_slug
    LIMIT 1
  )
  SELECT
    pm.id, pm.slug, pm.title, pm.opening, pm.meter, pm.rhyme, pm.kind,
    pm.tags, pm.verses_count,
    pm.poet_id, p.slug AS poet_slug, p.name_ar AS poet_name,
    pm.era_id,
    0::real AS rank,
    (
        (CASE WHEN pm.era_id  = src.era_id  THEN 1.5 ELSE 0 END)
      + (CASE WHEN pm.meter   IS NOT NULL AND pm.meter = src.meter THEN 3.0 ELSE 0 END)
      + (CASE WHEN pm.kind    IS NOT NULL AND pm.kind  = src.kind  THEN 2.5 ELSE 0 END)
      + (CASE WHEN pm.rhyme   IS NOT NULL AND pm.rhyme = src.rhyme THEN 1.0 ELSE 0 END)
      + (CASE WHEN pm.poet_id = src.poet_id THEN 0.8 ELSE 0 END)
      + (
          SELECT count(*)::real
          FROM unnest(pm.tags) t
          WHERE t = ANY(src.tags)
        ) * 0.4
    )::real AS score
  FROM public.diwan_poems pm
  JOIN public.diwan_poets p ON p.id = pm.poet_id
  CROSS JOIN src
  WHERE pm.id <> src.id
    AND (
         pm.era_id  = src.era_id
      OR pm.meter   = src.meter
      OR pm.kind    = src.kind
      OR pm.poet_id = src.poet_id
      OR pm.tags && src.tags
    )
  ORDER BY score DESC, pm.verses_count DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(page_limit, 30));
$$;

REVOKE EXECUTE ON FUNCTION public.diwan_similar_poems(text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.diwan_similar_poems(text, integer) TO anon, authenticated;

-- ─── 5) RPC: diwan_poem_glossary — مفردات قصيدة ────────────────────────
CREATE OR REPLACE FUNCTION public.diwan_poem_glossary(poem_slug text)
RETURNS TABLE (
  word            text,
  word_normalized text,
  meaning         text,
  verse_position  integer
)
LANGUAGE sql STABLE
AS $$
  SELECT g.word, g.word_normalized, g.meaning, g.verse_position
  FROM public.diwan_glossary g
  JOIN public.diwan_poems pm ON pm.id = g.poem_id
  WHERE pm.slug = poem_slug
  ORDER BY g.verse_position NULLS LAST, g.word;
$$;

REVOKE EXECUTE ON FUNCTION public.diwan_poem_glossary(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.diwan_poem_glossary(text) TO anon, authenticated;

-- ─── 6) RPC: diwan_smart_search — بحث موحّد ────────────────────────────
-- يدمج بحث الشعراء + القصائد + الأبيات في استدعاء واحد، مع وزن
-- مختلف لكل نوع. مفيد لشريط بحث "كل شيء" مستقبلًا.
CREATE OR REPLACE FUNCTION public.diwan_smart_search(
  q           text,
  page_limit  integer DEFAULT 12
) RETURNS TABLE (
  kind        text,        -- poet | poem | verse
  slug        text,
  label       text,        -- name | title | hemistich1
  sub         text,        -- title | poet name | hemistich2
  poem_slug   text,        -- non-null only for verse
  poet_slug   text,
  poet_name   text,
  era_id      text,
  rank        real
)
LANGUAGE sql STABLE
AS $$
  WITH n AS (
    SELECT plainto_tsquery('simple', public.normalize_arabic(coalesce(q, ''))) AS tsq
  )
  -- شعراء
  SELECT
    'poet'::text       AS kind,
    p.slug,
    p.name_ar          AS label,
    p.title            AS sub,
    NULL::text         AS poem_slug,
    p.slug             AS poet_slug,
    p.name_ar          AS poet_name,
    NULL::text         AS era_id,
    (ts_rank(p.search_vector, n.tsq) * 1.5)::real AS rank
  FROM public.diwan_poets p, n
  WHERE n.tsq IS NOT NULL AND p.search_vector @@ n.tsq
  UNION ALL
  -- قصائد
  SELECT
    'poem'::text       AS kind,
    pm.slug,
    pm.title           AS label,
    pt.name_ar         AS sub,
    NULL::text         AS poem_slug,
    pt.slug            AS poet_slug,
    pt.name_ar         AS poet_name,
    pm.era_id,
    (ts_rank(pm.search_vector, n.tsq) * 1.2)::real AS rank
  FROM public.diwan_poems pm
  JOIN public.diwan_poets pt ON pt.id = pm.poet_id, n
  WHERE n.tsq IS NOT NULL AND pm.search_vector @@ n.tsq
  UNION ALL
  -- أبيات
  SELECT
    'verse'::text                         AS kind,
    pm.slug                               AS slug,
    v.hemistich1                          AS label,
    coalesce(v.hemistich2, pt.name_ar)    AS sub,
    pm.slug                               AS poem_slug,
    pt.slug                               AS poet_slug,
    pt.name_ar                            AS poet_name,
    pm.era_id,
    ts_rank(v.search_vector, n.tsq)::real AS rank
  FROM public.diwan_verses v
  JOIN public.diwan_poems pm ON pm.id = v.poem_id
  JOIN public.diwan_poets pt ON pt.id = v.poet_id, n
  WHERE n.tsq IS NOT NULL AND v.search_vector @@ n.tsq
  ORDER BY rank DESC
  LIMIT GREATEST(1, LEAST(page_limit, 60));
$$;

REVOKE EXECUTE ON FUNCTION public.diwan_smart_search(text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.diwan_smart_search(text, integer) TO anon, authenticated;

-- ─── 7) تحديث diwan_get_poem لإرجاع التشكيل ───────────────────────────
-- نفس التوقيع، لذا CREATE OR REPLACE كافٍ. الجديد: حقول
-- hemistich1_diacritized و hemistich2_diacritized داخل جسم الـ jsonb.
CREATE OR REPLACE FUNCTION public.diwan_get_poem(poem_slug text)
RETURNS TABLE (
  id           uuid,
  slug         text,
  title        text,
  opening      text,
  meter        text,
  rhyme        text,
  kind         text,
  tags         text[],
  verses_count integer,
  source_url   text,
  poet_id      uuid,
  poet_slug    text,
  poet_name    text,
  poet_title   text,
  era_id       text,
  era_name     text,
  verses       jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pm.id, pm.slug, pm.title, pm.opening, pm.meter, pm.rhyme, pm.kind,
    pm.tags, pm.verses_count, pm.source_url,
    p.id   AS poet_id,  p.slug AS poet_slug,  p.name_ar AS poet_name, p.title AS poet_title,
    e.id   AS era_id,   e.name_ar AS era_name,
    coalesce(
      (
        SELECT jsonb_agg(jsonb_build_object(
                 'position',                v.position,
                 'hemistich1',              v.hemistich1,
                 'hemistich2',              v.hemistich2,
                 'hemistich1_diacritized',  v.hemistich1_diacritized,
                 'hemistich2_diacritized',  v.hemistich2_diacritized
               ) ORDER BY v.position)
        FROM public.diwan_verses v
        WHERE v.poem_id = pm.id
      ),
      '[]'::jsonb
    ) AS verses
  FROM public.diwan_poems pm
  JOIN public.diwan_poets p ON p.id = pm.poet_id
  LEFT JOIN public.diwan_eras e ON e.id = pm.era_id
  WHERE pm.slug = poem_slug
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.diwan_get_poem(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.diwan_get_poem(text) TO anon, authenticated;
