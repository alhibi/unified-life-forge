-- =====================================================================
-- DIWAN LIBRARY — قاعدة بيانات المكتبة الشعرية الكبرى
-- =====================================================================
-- جداول للشعراء والقصائد والأبيات قابلة للتعبئة من adab.com أو
-- مصادر مماثلة (Ashaar, ديوان العرب…). تدعم بحثًا عربيًا كاملًا
-- يتجاهل التشكيل وتطبيع الهمزات، مع pagination كفؤة وعلاقات نظيفة.
--
-- يعتمد على دالة public.normalize_arabic الموجودة من قبل في
-- 20260517020000_rss_search_arabic.sql.
-- =====================================================================

-- ─── 1) العصور الأدبية ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diwan_eras (
  id           text PRIMARY KEY,                -- 'jahili', 'islami'…
  name_ar      text NOT NULL,
  name_en      text,
  period_label text,                            -- "500-622م"
  start_year   integer,                         -- ميلادي تقريبي
  end_year     integer,
  color        text,                            -- لون شريط/شارة
  sort_order   integer NOT NULL DEFAULT 0,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diwan_eras_sort ON public.diwan_eras (sort_order);

-- ─── 2) الشعراء ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diwan_poets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,         -- "al-mutanabbi"
  external_id     text,                         -- id الأصلي على المصدر
  source          text NOT NULL DEFAULT 'adab', -- adab|ashaar|aldiwan|seed
  source_url      text,
  era_id          text REFERENCES public.diwan_eras(id) ON DELETE SET NULL,
  name_ar         text NOT NULL,                -- "أبو الطيب المتنبي"
  name_en         text,
  title           text,                         -- "ملء الدنيا وشاغل الناس"
  bio             text,
  birth_year      integer,                      -- ميلادي
  death_year      integer,
  birth_city      text,
  death_city      text,
  image_url       text,
  poems_count     integer NOT NULL DEFAULT 0,
  verses_count    integer NOT NULL DEFAULT 0,
  search_vector   tsvector GENERATED ALWAYS AS (
                    setweight(to_tsvector('simple', public.normalize_arabic(name_ar)),    'A') ||
                    setweight(to_tsvector('simple', public.normalize_arabic(coalesce(title, ''))),    'B') ||
                    setweight(to_tsvector('simple', public.normalize_arabic(coalesce(bio, ''))),    'C')
                  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diwan_poets_era       ON public.diwan_poets (era_id);
CREATE INDEX IF NOT EXISTS idx_diwan_poets_search    ON public.diwan_poets USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_diwan_poets_name_norm ON public.diwan_poets (public.normalize_arabic(name_ar));
CREATE UNIQUE INDEX IF NOT EXISTS idx_diwan_poets_source_external
  ON public.diwan_poets (source, external_id) WHERE external_id IS NOT NULL;

-- ─── 3) القصائد ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diwan_poems (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  external_id     text,
  source          text NOT NULL DEFAULT 'adab',
  source_url      text,
  poet_id         uuid NOT NULL REFERENCES public.diwan_poets(id) ON DELETE CASCADE,
  era_id          text REFERENCES public.diwan_eras(id) ON DELETE SET NULL,
  title           text NOT NULL,
  kind            text,                         -- مديح/رثاء/غزل/فخر/حماسة/زهد…
  meter           text,                         -- البحر: الطويل، البسيط، الكامل…
  rhyme           text,                         -- حرف الروي
  opening         text,                         -- مطلع القصيدة (أول شطر)
  verses_count    integer NOT NULL DEFAULT 0,
  full_text       text,                         -- النص كاملًا للبحث
  tags            text[] NOT NULL DEFAULT '{}', -- مواضيع: حكمة، عشق، فروسية…
  search_vector   tsvector GENERATED ALWAYS AS (
                    setweight(to_tsvector('simple', public.normalize_arabic(title)),                'A') ||
                    setweight(to_tsvector('simple', public.normalize_arabic(coalesce(opening, ''))), 'B') ||
                    setweight(to_tsvector('simple', public.normalize_arabic(coalesce(full_text,''))),'C')
                  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diwan_poems_poet    ON public.diwan_poems (poet_id);
CREATE INDEX IF NOT EXISTS idx_diwan_poems_era     ON public.diwan_poems (era_id);
CREATE INDEX IF NOT EXISTS idx_diwan_poems_meter   ON public.diwan_poems (meter)  WHERE meter  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diwan_poems_rhyme   ON public.diwan_poems (rhyme)  WHERE rhyme  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diwan_poems_kind    ON public.diwan_poems (kind)   WHERE kind   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_diwan_poems_tags    ON public.diwan_poems USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_diwan_poems_search  ON public.diwan_poems USING gin(search_vector);
CREATE UNIQUE INDEX IF NOT EXISTS idx_diwan_poems_source_external
  ON public.diwan_poems (source, external_id) WHERE external_id IS NOT NULL;

-- ─── 4) الأبيات ─────────────────────────────────────────────────────────
-- نخزن كل بيت كصدر + عجز مع موقعه. هذا يفتح بحث البيت المفرد
-- (بحث القافية، بحث جزئي على الشطر، استشهادات…)
CREATE TABLE IF NOT EXISTS public.diwan_verses (
  id              bigserial PRIMARY KEY,
  poem_id         uuid NOT NULL REFERENCES public.diwan_poems(id) ON DELETE CASCADE,
  poet_id         uuid NOT NULL REFERENCES public.diwan_poets(id) ON DELETE CASCADE,
  position        integer NOT NULL,             -- 0-indexed
  hemistich1      text NOT NULL,                -- الصدر
  hemistich2      text,                         -- العجز (قد يكون NULL لأبيات الرجز)
  normalized_text text GENERATED ALWAYS AS (
                    public.normalize_arabic(hemistich1 || ' ' || coalesce(hemistich2, ''))
                  ) STORED,
  search_vector   tsvector GENERATED ALWAYS AS (
                    to_tsvector('simple',
                      public.normalize_arabic(hemistich1 || ' ' || coalesce(hemistich2, ''))
                    )
                  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diwan_verses_poem      ON public.diwan_verses (poem_id, position);
CREATE INDEX IF NOT EXISTS idx_diwan_verses_poet      ON public.diwan_verses (poet_id);
CREATE INDEX IF NOT EXISTS idx_diwan_verses_search    ON public.diwan_verses USING gin(search_vector);
CREATE UNIQUE INDEX IF NOT EXISTS idx_diwan_verses_poem_position
  ON public.diwan_verses (poem_id, position);

-- ─── 5) محفوظات المستخدم ────────────────────────────────────────────────
-- المفضلة الشخصية على القصائد (تنفع للحاكم/الديوان الخاص لاحقاً).
CREATE TABLE IF NOT EXISTS public.diwan_user_favorites (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poem_id     uuid NOT NULL REFERENCES public.diwan_poems(id) ON DELETE CASCADE,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, poem_id)
);

CREATE INDEX IF NOT EXISTS idx_diwan_fav_user ON public.diwan_user_favorites (user_id);

-- ─── 6) RLS ─────────────────────────────────────────────────────────────
-- كل البيانات الأدبية public-read. الكتابة محصورة في service_role
-- (سكريبتات الـ ingest).
ALTER TABLE public.diwan_eras            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diwan_poets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diwan_poems           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diwan_verses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diwan_user_favorites  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Diwan eras readable by all"  ON public.diwan_eras;
DROP POLICY IF EXISTS "Diwan poets readable by all" ON public.diwan_poets;
DROP POLICY IF EXISTS "Diwan poems readable by all" ON public.diwan_poems;
DROP POLICY IF EXISTS "Diwan verses readable by all" ON public.diwan_verses;

CREATE POLICY "Diwan eras readable by all"  ON public.diwan_eras   FOR SELECT USING (true);
CREATE POLICY "Diwan poets readable by all" ON public.diwan_poets  FOR SELECT USING (true);
CREATE POLICY "Diwan poems readable by all" ON public.diwan_poems  FOR SELECT USING (true);
CREATE POLICY "Diwan verses readable by all" ON public.diwan_verses FOR SELECT USING (true);

-- المفضلة: كل مستخدم يرى/يكتب الخاصة به فقط
DROP POLICY IF EXISTS "Users read own favorites"   ON public.diwan_user_favorites;
DROP POLICY IF EXISTS "Users insert own favorites" ON public.diwan_user_favorites;
DROP POLICY IF EXISTS "Users delete own favorites" ON public.diwan_user_favorites;
DROP POLICY IF EXISTS "Users update own favorites" ON public.diwan_user_favorites;

CREATE POLICY "Users read own favorites"
  ON public.diwan_user_favorites FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own favorites"
  ON public.diwan_user_favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own favorites"
  ON public.diwan_user_favorites FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users update own favorites"
  ON public.diwan_user_favorites FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── 7) Triggers — حافظ على العدّادات ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.diwan_recount_poet(p_poet_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.diwan_poets p SET
    poems_count  = (SELECT count(*) FROM public.diwan_poems  WHERE poet_id = p.id),
    verses_count = (SELECT count(*) FROM public.diwan_verses WHERE poet_id = p.id),
    updated_at   = now()
  WHERE p.id = p_poet_id;
$$;

CREATE OR REPLACE FUNCTION public.diwan_recount_poem(p_poem_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.diwan_poems p SET
    verses_count = (SELECT count(*) FROM public.diwan_verses WHERE poem_id = p.id),
    updated_at   = now()
  WHERE p.id = p_poem_id;
$$;

-- ─── 8) RPCs لتطبيق الواجهة ────────────────────────────────────────────

-- 8.1) قائمة الشعراء بترتيب وفلترة
CREATE OR REPLACE FUNCTION public.diwan_list_poets(
  era         text DEFAULT NULL,
  q           text DEFAULT NULL,
  page_limit  integer DEFAULT 30,
  page_offset integer DEFAULT 0
) RETURNS TABLE (
  id           uuid,
  slug         text,
  era_id       text,
  name_ar      text,
  title        text,
  bio          text,
  birth_year   integer,
  death_year   integer,
  poems_count  integer,
  verses_count integer,
  rank         real
)
LANGUAGE sql
STABLE
AS $$
  WITH normalized AS (
    SELECT CASE
      WHEN q IS NULL OR length(trim(q)) = 0 THEN NULL
      ELSE plainto_tsquery('simple', public.normalize_arabic(q))
    END AS tsq
  )
  SELECT
    p.id, p.slug, p.era_id, p.name_ar, p.title, p.bio,
    p.birth_year, p.death_year, p.poems_count, p.verses_count,
    CASE WHEN n.tsq IS NULL THEN 0 ELSE ts_rank(p.search_vector, n.tsq) END AS rank
  FROM public.diwan_poets p, normalized n
  WHERE (era IS NULL OR p.era_id = era)
    AND (n.tsq IS NULL OR p.search_vector @@ n.tsq)
  ORDER BY
    rank DESC,
    p.verses_count DESC NULLS LAST,
    p.name_ar
  LIMIT GREATEST(1, LEAST(page_limit, 200))
  OFFSET GREATEST(0, page_offset);
$$;

-- 8.2) قصائد شاعر معيّن
CREATE OR REPLACE FUNCTION public.diwan_list_poems_by_poet(
  poet_slug   text,
  q           text DEFAULT NULL,
  meter       text DEFAULT NULL,
  rhyme       text DEFAULT NULL,
  page_limit  integer DEFAULT 30,
  page_offset integer DEFAULT 0
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
  rank         real
)
LANGUAGE sql
STABLE
AS $$
  WITH normalized AS (
    SELECT CASE
      WHEN q IS NULL OR length(trim(q)) = 0 THEN NULL
      ELSE plainto_tsquery('simple', public.normalize_arabic(q))
    END AS tsq
  ),
  poet AS (
    SELECT id FROM public.diwan_poets WHERE slug = poet_slug LIMIT 1
  )
  SELECT
    pm.id, pm.slug, pm.title, pm.opening, pm.meter, pm.rhyme, pm.kind,
    pm.tags, pm.verses_count,
    CASE WHEN n.tsq IS NULL THEN 0 ELSE ts_rank(pm.search_vector, n.tsq) END AS rank
  FROM public.diwan_poems pm
  CROSS JOIN normalized n
  WHERE pm.poet_id = (SELECT id FROM poet)
    AND (n.tsq IS NULL OR pm.search_vector @@ n.tsq)
    AND (meter IS NULL OR pm.meter = meter)
    AND (rhyme IS NULL OR pm.rhyme = rhyme)
  ORDER BY
    rank DESC,
    pm.verses_count DESC NULLS LAST,
    pm.title
  LIMIT GREATEST(1, LEAST(page_limit, 200))
  OFFSET GREATEST(0, page_offset);
$$;

-- 8.3) بحث شامل في القصائد بمعايير متعددة
CREATE OR REPLACE FUNCTION public.diwan_search_poems(
  q            text DEFAULT NULL,
  era          text DEFAULT NULL,
  poet_slug    text DEFAULT NULL,
  meter        text DEFAULT NULL,
  rhyme        text DEFAULT NULL,
  kind         text DEFAULT NULL,
  tag          text DEFAULT NULL,
  page_limit   integer DEFAULT 30,
  page_offset  integer DEFAULT 0
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
  rank         real
)
LANGUAGE sql
STABLE
AS $$
  WITH normalized AS (
    SELECT CASE
      WHEN q IS NULL OR length(trim(q)) = 0 THEN NULL
      ELSE plainto_tsquery('simple', public.normalize_arabic(q))
    END AS tsq
  )
  SELECT
    pm.id, pm.slug, pm.title, pm.opening, pm.meter, pm.rhyme, pm.kind,
    pm.tags, pm.verses_count,
    pm.poet_id, p.slug AS poet_slug, p.name_ar AS poet_name,
    pm.era_id,
    CASE WHEN n.tsq IS NULL THEN 0 ELSE ts_rank(pm.search_vector, n.tsq) END AS rank
  FROM public.diwan_poems pm
  JOIN public.diwan_poets p ON p.id = pm.poet_id
  CROSS JOIN normalized n
  WHERE (n.tsq IS NULL OR pm.search_vector @@ n.tsq)
    AND (era       IS NULL OR pm.era_id = era)
    AND (poet_slug IS NULL OR p.slug = poet_slug)
    AND (meter     IS NULL OR pm.meter = meter)
    AND (rhyme     IS NULL OR pm.rhyme = rhyme)
    AND (kind      IS NULL OR pm.kind  = kind)
    AND (tag       IS NULL OR tag = ANY(pm.tags))
  ORDER BY
    rank DESC,
    pm.verses_count DESC NULLS LAST,
    pm.title
  LIMIT GREATEST(1, LEAST(page_limit, 200))
  OFFSET GREATEST(0, page_offset);
$$;

-- 8.4) بحث على مستوى البيت (لمشروع "ابحث عن بيت سمعته")
CREATE OR REPLACE FUNCTION public.diwan_search_verses(
  q           text,
  era         text DEFAULT NULL,
  page_limit  integer DEFAULT 30,
  page_offset integer DEFAULT 0
) RETURNS TABLE (
  verse_id     bigint,
  poem_id      uuid,
  poem_slug    text,
  poem_title   text,
  poet_id      uuid,
  poet_slug    text,
  poet_name    text,
  era_id       text,
  position     integer,
  hemistich1   text,
  hemistich2   text,
  rank         real
)
LANGUAGE sql
STABLE
AS $$
  WITH normalized AS (
    SELECT plainto_tsquery('simple', public.normalize_arabic(coalesce(q, ''))) AS tsq
  )
  SELECT
    v.id AS verse_id,
    v.poem_id, pm.slug AS poem_slug, pm.title AS poem_title,
    v.poet_id, p.slug  AS poet_slug, p.name_ar AS poet_name,
    pm.era_id,
    v.position, v.hemistich1, v.hemistich2,
    ts_rank(v.search_vector, n.tsq) AS rank
  FROM public.diwan_verses v
  JOIN public.diwan_poems  pm ON pm.id = v.poem_id
  JOIN public.diwan_poets  p  ON p.id  = v.poet_id
  CROSS JOIN normalized n
  WHERE v.search_vector @@ n.tsq
    AND (era IS NULL OR pm.era_id = era)
  ORDER BY rank DESC, v.poem_id, v.position
  LIMIT GREATEST(1, LEAST(page_limit, 200))
  OFFSET GREATEST(0, page_offset);
$$;

-- 8.5) قصيدة كاملة مع كل أبياتها
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
                 'position',   v.position,
                 'hemistich1', v.hemistich1,
                 'hemistich2', v.hemistich2
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

-- 8.6) إحصاءات سريعة للصفحة الرئيسية
CREATE OR REPLACE FUNCTION public.diwan_library_stats()
RETURNS TABLE (
  poets_count   bigint,
  poems_count   bigint,
  verses_count  bigint,
  eras_count    bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM public.diwan_poets),
    (SELECT count(*) FROM public.diwan_poems),
    (SELECT count(*) FROM public.diwan_verses),
    (SELECT count(*) FROM public.diwan_eras);
$$;

-- ─── 9) صلاحيات تنفيذ الـ RPCs ─────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.diwan_list_poets(text, text, integer, integer)            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.diwan_list_poems_by_poet(text, text, text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.diwan_search_poems(text, text, text, text, text, text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.diwan_search_verses(text, text, integer, integer)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.diwan_get_poem(text)                                      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.diwan_library_stats()                                     FROM PUBLIC;

GRANT  EXECUTE ON FUNCTION public.diwan_list_poets(text, text, integer, integer)            TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.diwan_list_poems_by_poet(text, text, text, text, integer, integer) TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.diwan_search_poems(text, text, text, text, text, text, text, integer, integer) TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.diwan_search_verses(text, text, integer, integer)         TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.diwan_get_poem(text)                                      TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.diwan_library_stats()                                     TO anon, authenticated;
