# AGENTS.md — German Learning Module (SmartHub / amv.life)

You are building the **German-via-Arabic learning module** inside the existing SmartHub codebase (React + TypeScript + Tailwind + Supabase + Capacitor). This document is your spec. Follow it exactly. Do not summarize it back to the user — implement it.

---

## 0. OPERATING STANDARD (non-negotiable)

- Elite standard only. Every screen, every table, every function must be **complete and production-ready**, not a scaffold. No "TODO: implement later," no stub functions returning mock data, no half-wired UI states.
- **Zero fake or simulated data reaches production.** If content isn't generated and reviewed yet, the corresponding UI must show an honest empty/locked state — never hardcoded placeholder vocabulary, fake progress numbers, or invented stats.
- No generic AI-slop output. Do not default to a templated Duolingo clone. Follow the existing SmartHub design language (technical minimalism, cali.so-inspired information density) — see §7.
- Every feature you touch must be finished end-to-end (schema → Edge Function → UI) before moving to the next. Do not leave a layer half-built.
- If a requirement in this doc conflicts with something faster-but-lower-quality, the requirement wins.

---

## 1. SCOPE

Build a standalone module, `de-learning` (or existing app naming convention), teaching German to Arabic-speaking users, structured across CEFR levels A0 through C1, with spaced-repetition-driven review, a wide interactive exercise set, and an Arabic-specific pedagogical bridge (see §8). This is not a thin wrapper around static lesson JSON — it is a full content system with its own generation pipeline, scheduling engine, and progress model.

---

## 2. HARD CONTENT VOLUME REQUIREMENTS

Do not treat these as soft targets. Content below these thresholds is an incomplete implementation.

| Level | Units | New words | Cumulative words | Lessons |
|---|---|---|---|---|
| A0 | 4 | 150 | 150 | ~30 |
| A1 | 12 | 550 | 700 | ~130 |
| A2 | 14 | 600 | 1,300 | ~150 |
| B1 | 16 | 1,300 | 2,600 | ~180 |
| B2 | 18 | 2,000 | 4,600 | ~200 |
| C1 | 16 | 3,400 | ~8,000 | ~180 |

Per vocabulary item, minimum **6 exercise variants across at least 4 distinct exercise types** (§9). At full scope this is ~45,000–50,000 exercise records — expected and required, not a warning sign. Do not ship a version with a token 200-word vocabulary list and call it done; build the pipeline (§10) so the real volume is reachable.

Every `vocabulary_items` row must have, before it is eligible for `published` status:
- non-null `audio_url` (real audio, not silence/placeholder)
- `translation_ar`, `example_sentence_de`, `example_sentence_ar` all populated
- `gender` and `plural_form` populated for every noun
- `frequency_rank` set (drives ordering within a level)

Every `grammar_points` row that touches case, gender, or plural formation must have `contrastive_note_ar` populated — see §8. This is not optional metadata; it is the core differentiator and must not be left null.

---

## 3. DATABASE SCHEMA (Supabase / Postgres)

Implement exactly this shape. Add RLS on every table — content tables are public-read / service-role-write; user tables are owner-scoped.

```sql
create table languages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  direction text not null default 'ltr'
);

create table cefr_levels (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code in ('A0','A1','A2','B1','B2','C1')),
  name_ar text not null,
  sort_order int not null
);

create table units (
  id uuid primary key default gen_random_uuid(),
  level_id uuid references cefr_levels(id) not null,
  title_ar text not null,
  title_de text not null,
  theme text,
  icon text,
  sort_order int not null
);
create index on units(level_id, sort_order);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id) not null,
  type text not null check (type in ('vocab','grammar','listening','speaking','story','review')),
  title_ar text not null,
  estimated_minutes int default 6,
  sort_order int not null
);
create index on lessons(unit_id, sort_order);

create table grammar_points (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) not null,
  name text not null,
  explanation_ar text not null,
  contrastive_note_ar text
);

create table vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  lemma_de text not null,
  gender text check (gender in ('der','die','das') or gender is null),
  plural_form text,
  ipa text,
  audio_url text,
  image_url text,
  translation_ar text not null,
  example_sentence_de text,
  example_sentence_ar text,
  frequency_rank int,
  level_id uuid references cefr_levels(id) not null,
  status text not null default 'draft' check (status in ('draft','generated','reviewed','published'))
);
create index on vocabulary_items(level_id, frequency_rank);
create index on vocabulary_items(status);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) not null,
  type text not null check (type in (
    'mcq','type_answer','listen_choose','dictation','speak_repeat',
    'sentence_build','fill_blank_grammar','dialogue_simulation',
    'story_comprehension','matching_pairs','error_correction',
    'compound_word_decomposition'
  )),
  payload jsonb not null,
  difficulty int default 1,
  status text not null default 'draft' check (status in ('draft','generated','reviewed','published'))
);
create index on exercises(lesson_id);

create table exercise_vocab_map (
  exercise_id uuid references exercises(id) not null,
  vocab_id uuid references vocabulary_items(id) not null,
  primary key (exercise_id, vocab_id)
);

-- user-scoped tables
create table user_progress (
  user_id uuid references auth.users(id) not null,
  lesson_id uuid references lessons(id) not null,
  status text default 'not_started',
  mastery_score numeric default 0,
  last_practiced_at timestamptz,
  primary key (user_id, lesson_id)
);

create table srs_state (
  user_id uuid references auth.users(id) not null,
  item_id uuid not null,
  item_type text not null check (item_type in ('vocab','grammar')),
  stability numeric not null default 1,
  difficulty numeric not null default 5,
  due_at timestamptz not null default now(),
  review_count int default 0,
  lapses int default 0,
  primary key (user_id, item_id)
);
create index on srs_state(user_id, due_at);

create table srs_review_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  item_id uuid not null,
  rating text not null check (rating in ('again','hard','good','easy')),
  reviewed_at timestamptz default now(),
  elapsed_days numeric
);

create table user_stats (
  user_id uuid references auth.users(id) primary key,
  xp int default 0,
  streak_days int default 0,
  league_tier text default 'bronze',
  last_active_date date
);

create table placement_test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  placed_level_id uuid references cefr_levels(id),
  raw_score numeric,
  taken_at timestamptz default now()
);

create table content_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id) not null,
  status text default 'pending' check (status in ('pending','generated','reviewed','published','failed')),
  model_used text,
  created_at timestamptz default now()
);

-- RLS
alter table vocabulary_items enable row level security;
create policy "public read published vocab" on vocabulary_items for select using (status = 'published');
alter table exercises enable row level security;
create policy "public read published exercises" on exercises for select using (status = 'published');

alter table user_progress enable row level security;
create policy "owner rw progress" on user_progress for all using (auth.uid() = user_id);
alter table srs_state enable row level security;
create policy "owner rw srs" on srs_state for all using (auth.uid() = user_id);
alter table srs_review_log enable row level security;
create policy "owner rw review log" on srs_review_log for all using (auth.uid() = user_id);
alter table user_stats enable row level security;
create policy "owner rw stats" on user_stats for all using (auth.uid() = user_id);
```

Content-table writes (`vocabulary_items`, `exercises`, status transitions) happen only through the service role inside Edge Functions — never directly from the client.

---

## 4. SPACED REPETITION ENGINE (FSRS)

Implement FSRS (stability/difficulty model), not a fixed-interval Leitner scheme.

- State per item: `stability` (days until retrievability drops to ~90%), `difficulty` (1–10).
- On each review, compute retrievability `R = (1 + elapsed_days / (9 * stability)) ** -1`, then update `stability`/`difficulty` based on the rating (`again` / `hard` / `good` / `easy`) using standard FSRS update rules. `again` increases `lapses`, sharply reduces `stability`. `easy` increases `stability` beyond the default `good` increment.
- `due_at = now() + next_interval_days`.
- Write every review to `srs_review_log` — this log is required input for future per-user parameter personalization; do not skip logging even in MVP.

---

## 5. SESSION COMPOSITION ALGORITHM

`session-builder` must mix, not present blocks sequentially (interleaving is a hard requirement, not a nice-to-have):

- ~40% new content from the user's current lesson position
- ~40% due SRS reviews (`srs_state.due_at <= now()`, ordered by most-overdue first)
- ~20% weak-point remediation (items with `lapses >= 2` in the last 30 days), pulled preferentially from an exercise type different from the one that originally caused the lapse

Session length target: 5–8 minutes (chunking requirement, §0). Do not build a "how many can you get through" endless mode as the primary loop.

---

## 6. EXERCISE PAYLOAD SCHEMAS

`exercises.payload` must conform exactly to these shapes per `type`:

```
mcq:
  { prompt_de?, prompt_ar?, media: { image_url?, audio_url? },
    options: [{ id, text, is_correct }] }

type_answer:
  { direction: "ar_to_de" | "de_to_ar", prompt,
    accepted_answers: [string], hint? }

listen_choose:
  { audio_url, options: [{ id, text }], correct_option_id }

dictation:
  { audio_url, correct_text, allow_partial_credit: boolean }

speak_repeat:
  { target_text_de, target_audio_url, min_score_threshold: number }

sentence_build:
  { correct_sentence, shuffled_tokens: [string], distractor_tokens?: [string] }

fill_blank_grammar:
  { sentence_template, correct_answer, options?: [string], grammar_point_id }

dialogue_simulation:
  { turns: [{ speaker, text_de, text_ar }],
    response_options: [{ id, text, is_correct }] }

story_comprehension:
  { story_text_de, story_text_ar?, questions: [{ question, options, correct_option_id }] }

matching_pairs:
  { pairs: [{ left, right }] }

error_correction:
  { incorrect_sentence, correct_sentence, error_token_index, explanation_ar }

compound_word_decomposition:
  { compound_word, parts: [{ part, meaning_ar }], combined_meaning_ar }
```

Validate payload shape server-side against the type before allowing `status` to move past `draft`. Malformed payloads must never reach `published`.

---

## 7. EDGE FUNCTIONS (contracts)

Reuse the existing OpenRouter + circuit-breaker pattern already used elsewhere in SmartHub — same fallback-model behavior, same failure handling, no new integration pattern invented.

```
POST /functions/v1/session-builder
  in:  { user_id, session_length_minutes? }
  out: { session_id, items: [{ exercise_id, type, payload, srs_item_id? }],
         composition: { new: n, review: n, weak_point: n } }

POST /functions/v1/srs-review
  in:  { user_id, item_id, rating, elapsed_ms }
  out: { next_due_at, new_stability, new_difficulty }

POST /functions/v1/pronunciation-score
  in:  { user_id, exercise_id, audio_storage_path }
  out: { score: 0-100, phoneme_feedback: [...], pass: boolean }

POST /functions/v1/generate-content   (service-role only, admin trigger)
  in:  { unit_id, level_code, target_word_count, model }
  out: { job_id, status }

POST /functions/v1/tts-audio          (service-role only, internal)
  in:  { text_de, voice_profile }
  out: { audio_url }

POST /functions/v1/xp-streak-update
  in:  { user_id, session_id, xp_earned }
  out: { new_xp, new_streak_days, league_change? }
```

All functions must return typed error responses on failure (no silent 200 with empty body). `generate-content` and `tts-audio` must be unreachable from the client — service-role/admin gated only.

---

## 8. THE ARABIC↔GERMAN BRIDGE (core differentiator — do not skip)

This is what makes the module more than a Duolingo clone. Implement all of the following, not a subset:

- **Case system (Nominativ/Akkusativ/Dativ/Genitiv):** every grammar point covering this must explain it in `contrastive_note_ar` via the Arabic إعراب system (رفع/نصب/جر) as the anchor concept, not as an isolated foreign rule.
- **Irregular plurals:** every plural-formation grammar point must draw the explicit parallel to جمع التكسير in `contrastive_note_ar` — German plural forms are memorized per-word the same way Arabic broken plurals are.
- **Compound words (Komposita):** implement the `compound_word_decomposition` exercise type fully (§6) for every compound noun introduced from B1 onward.
- **Grammatical gender:** every UI surface showing a German noun (lesson cards, review queue, exercise prompts) must render a consistent color badge for `der`/`die`/`das` — this is a persistent visual system, not a one-time lesson.

---

## 9. AUDIO REQUIREMENT

- No robotic/free-tier TTS for the top ~2,000 highest-frequency words — use a production-quality voice provider or real native-speaker recordings for this tier.
- Lower-frequency tail content may use high-quality TTS, but audio must still pass a listenability review gate before `vocabulary_items.status` can move to `published`.
- Every audio asset goes through Supabase Storage; `audio_url` must never point to a placeholder or silent file.

---

## 10. CONTENT GENERATION PIPELINE

1. `generate-content` batches an entire unit at once (not word-by-word) — prompt includes level, theme, target word count, and explicit instruction to produce `contrastive_note_ar` for any grammar point touching case/gender/plural.
2. Output lands in `draft` status in `vocabulary_items` / `exercises`, tracked via `content_generation_jobs`.
3. Human review step flips `draft → reviewed`. **No automated promotion to `published` without this step** — this is a hard gate, not a configurable option.
4. `tts-audio` runs only after text is `reviewed`.
5. Recurring QA: any item with an aggregate `again`-rating rate above a set threshold across users gets flagged back to `draft` for re-authoring — the content isn't static after launch.

---

## 11. UI / DESIGN COMPLIANCE

- Use the existing **Play/teal** accent from SmartHub's four-domain color system. Do not introduce a new palette for this module.
- Match the existing technical-minimalism direction (cali.so-inspired) already in use across SmartHub. No cartoon mascots, no candy-bright gamified skin.
- RTL shell (Arabic UI chrome) with correctly-isolated LTR German text runs inline — reuse the bidi-handling approach already solved in Lissan; do not re-solve this from scratch.
- Microphone access for `speak_repeat` requires the Capacitor microphone plugin with a proper permission-request flow and a graceful denied-permission fallback state (never crash or silently disable the exercise without explanation).
- No manipulative gamification patterns: no punitive "hearts" system that locks users out, no fake urgency, no dark-pattern subscription prompts. XP/streaks are motivational, not punitive.

---

## 12. PHASED BUILD ORDER

1. **Phase 1 (MVP):** Full schema + RLS. A0+A1 content only (~700 words). Exercise types: `mcq`, `type_answer`, `listen_choose`, `matching_pairs`. FSRS engine + `session-builder` + `srs-review` fully working end-to-end. Basic XP/streak. No placeholder content — ship less content rather than fake content.
2. **Phase 2:** Content pipeline scaled to A2/B1. Add `speak_repeat`, `dictation`, `sentence_build`, `story_comprehension`, `fill_blank_grammar`. Weak-point remediation active in session composition.
3. **Phase 3:** B2/C1 content. Add `dialogue_simulation`, `error_correction`, `compound_word_decomposition`. Placement test live.
4. **Phase 4:** Offline lesson caching (full offline-first sync — treat as its own scoped effort, do not bolt on ad hoc).

## 13. DEFINITION OF DONE (Phase 1)

- [ ] All tables + RLS policies from §3 deployed and tested with a non-owner access attempt correctly rejected
- [ ] `session-builder` returns correctly interleaved new/review/weak-point mix per §5
- [ ] FSRS scheduling verified against a manual multi-day review simulation (not just "it returns a date")
- [ ] Every A0+A1 vocabulary item has audio, gender badge (where applicable), and passes the published-status gate in §2
- [ ] Zero hardcoded/mock content anywhere in shipped UI
- [ ] Design review confirms Play/teal + technical-minimalism compliance, not a generic template look
