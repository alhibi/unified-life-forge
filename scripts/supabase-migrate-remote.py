#!/usr/bin/env python3
"""
Remote Supabase migrator — applies pending SQL migrations via the Management
API (POST /projects/{ref}/database/query), needing ONLY a SUPABASE_ACCESS_TOKEN.
No database password, no local Postgres connection.

Why it exists: `supabase db push` demands the raw DB password, which forces a
manual step on every contributor/agent. This script keeps the whole shipping
path down to one secret. It mirrors `db push` semantics:

  - applies supabase/migrations/*.sql in filename order,
  - skips versions already recorded in supabase_migrations.schema_migrations,
  - records each applied version afterwards,
  - tolerates idempotent "already exists" outcomes, fails loudly otherwise.

Used by .github/workflows/supabase-deploy.yml and runnable locally:

  SUPABASE_ACCESS_TOKEN=sbp_... python3 scripts/supabase-migrate-remote.py [--project REF]

The project ref defaults to supabase/config.toml's project_id.
"""
from __future__ import annotations

import argparse
import configparser
import json
import os
import re
import subprocess
import sys
import time

API_BASE = "https://api.supabase.com/v1"
MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations")
# Transient server hiccups deserve a retry; SQL errors do not.
RETRYABLE_HTTP = {502, 503, 504}


def api_request(method: str, path: str, token: str, body: dict | None = None) -> tuple[int, str]:
    """
    Talks to the Management API through curl. urllib's Python TLS
    fingerprint is blocked by the API edge (Cloudflare 1010) on some
    networks — curl passes everywhere and ships with macOS and GitHub
    runners alike, so this stays dependency-free in practice.
    """
    cmd = [
        "curl", "-sS", "-X", method,
        "-H", f"Authorization: Bearer {token}",
        "-w", "\n%{http_code}",
        "--max-time", "120",
        f"{API_BASE}{path}",
    ]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "--data-binary", json.dumps(body)]

    last_err = ""
    for attempt in range(3):
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            last_err = f"curl فشل: {proc.stderr.strip()[:200]}"
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            return 0, last_err
        out = proc.stdout
        # Status code is the final line (from -w).
        payload, _, status_str = out.rpartition("\n")
        try:
            status = int(status_str.strip())
        except ValueError:
            last_err = f"رد غير متوقع: {out[:200]}"
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            return 0, last_err
        if status in RETRYABLE_HTTP and attempt < 2:
            time.sleep(2 * (attempt + 1))
            continue
        return status, payload

    return 0, last_err


def run_sql(sql: str, token: str, ref: str) -> tuple[bool, str]:
    """Runs one statement. Returns (ok, error_detail)."""
    status, body = api_request("POST", f"/projects/{ref}/database/query", token, {"query": sql})
    if 200 <= status < 300:
        return True, ""
    # Idempotent re-runs are successes for our purposes.
    lowered = body.lower()
    if "already exists" in lowered or "duplicate object" in lowered:
        return True, ""
    return False, f"HTTP {status}: {body}"


def split_statements(sql_text: str) -> list[str]:
    """
    Splits a migration into individual statements, honouring:
      - full-line `--` comments,
      - dollar-quoted bodies ($$ … $$, $tag$ … $tag$) so function bodies
        survive intact instead of being cut at their internal semicolons,
      - single-quoted strings.
    """
    statements: list[str] = []
    buf: list[str] = []
    i = 0
    n = len(sql_text)

    def flush() -> None:
        text = "".join(buf).strip()
        if text:
            statements.append(text)
        buf.clear()

    while i < n:
        ch = sql_text[i]

        # Line comment: skip to end of line.
        if ch == "-" and i + 1 < n and sql_text[i + 1] == "-":
            j = sql_text.find("\n", i)
            i = n if j == -1 else j
            continue

        # Dollar-quoted string: copy verbatim to its matching tag.
        if ch == "$":
            m = re.match(r"\$[A-Za-z_]*\$", sql_text[i:])
            if m:
                tag = m.group(0)
                end = sql_text.find(tag, i + len(tag))
                if end == -1:
                    buf.append(sql_text[i:])
                    i = n
                    break
                buf.append(sql_text[i : end + len(tag)])
                i = end + len(tag)
                continue

        # Single-quoted string (doubled quotes are escapes).
        if ch == "'":
            j = i + 1
            while j < n:
                if sql_text[j] == "'":
                    if j + 1 < n and sql_text[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            buf.append(sql_text[i : min(j + 1, n)])
            i = min(j + 1, n)
            continue

        if ch == ";":
            flush()
            i += 1
            continue

        buf.append(ch)
        i += 1

    flush()
    return statements


def load_project_ref() -> str:
    """
    Resolves the linked project. supabase/.temp/linked-project.json is what
    the CLI actually writes on `supabase link` and is authoritative;
    config.toml's project_id can go stale when a project is recreated.
    """
    here = os.path.dirname(__file__)
    linked = os.path.join(here, "..", "supabase", ".temp", "linked-project.json")
    try:
        with open(linked, encoding="utf-8") as fh:
            ref = json.load(fh).get("ref", "")
            if ref:
                return ref
    except (OSError, json.JSONDecodeError):
        pass
    # Fallback: bare top-level keys before any [section] in config.toml.
    path = os.path.join(here, "..", "supabase", "config.toml")
    try:
        with open(path, encoding="utf-8") as fh:
            m = re.search(r'^project_id\s*=\s*"([^"]+)"', fh.read(), re.MULTILINE)
        return m.group(1) if m else ""
    except OSError:
        return ""


def applied_versions(token: str, ref: str) -> set[str]:
    ok, body = run_sql(
        "SELECT version FROM supabase_migrations.schema_migrations", token, ref
    )
    if not ok:
        # Fresh projects may lack the bookkeeping schema until first push;
        # treat as "nothing applied yet".
        print(f"  ! تعذر قراءة سجل الترحيلات ({body[:120]}) — نفترض صفراً", file=sys.stderr)
        return set()
    try:
        rows = json.loads(body)
    except json.JSONDecodeError:
        print(f"  ! رد غير متوقع من سجل الترحيلات: {body[:120]}", file=sys.stderr)
        return set()
    return {row["version"] for row in rows} if isinstance(rows, list) else set()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default=None, help="Supabase project ref")
    args = parser.parse_args()

    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not token:
        print("خطأ: SUPABASE_ACCESS_TOKEN غير مضبوط في البيئة", file=sys.stderr)
        return 2

    ref = args.project or load_project_ref()
    if not ref:
        print("خطأ: لم أجد project_id في supabase/config.toml", file=sys.stderr)
        return 2

    migration_files = sorted(
        f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql") and re.match(r"^\d{8,}", f)
    )
    if not migration_files:
        print("لا توجد ترحيلات.")
        return 0

    done = applied_versions(token, ref)
    pending = [f for f in migration_files if os.path.splitext(f)[0].split("_")[0] not in done]
    print(f"{len(migration_files)} ترحيلاً، منها {len(pending)} قيد الانتظار.")

    failures = 0
    for fname in pending:
        version = os.path.splitext(fname)[0].split("_")[0]
        path = os.path.join(MIGRATIONS_DIR, fname)
        with open(path, encoding="utf-8") as fh:
            statements = split_statements(fh.read())
        print(f"→ {fname}: {len(statements)} عبارة…")
        stmt_failed = False
        for i, stmt in enumerate(statements, 1):
            ok, err = run_sql(stmt, token, ref)
            if not ok:
                print(f"  ✗ العبارة {i}/{len(statements)} فشلت:\n    {err[:300]}", file=sys.stderr)
                stmt_failed = True
                failures += 1
                break
        if stmt_failed:
            continue
        # Bookkeeping so future db push / runs skip this version.
        ok, err = run_sql(
            "INSERT INTO supabase_migrations.schema_migrations(version, name, statements) "
            f"VALUES ('{version}', '{fname}', {len(statements)}) "
            "ON CONFLICT (version) DO NOTHING",
            token,
            ref,
        )
        if ok:
            print(f"  ✓ طُبّق وسُجّل ({version})")
        else:
            print(f"  ! طُبّق لكن تعذر تسجيل الإصدار: {err[:120]}")
            failures += 1

    print("انتهى بلا أخطاء." if failures == 0 else f"فشل {failures} ترحيل.")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
