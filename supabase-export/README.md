# supabase-export — local mirror of the Supabase database

Local copy of the Postgres database behind Supabase project **`iewqfmkngcgayxbbnpiz`**.
Pulled read-only through the Supabase **Management API** using the personal access token
(`SUPABASE_ACCESS_KEY`) in `../.env.local` — no DB password, psql, or Docker required.

## Layout

```
supabase-export/
  functions/<schema>/<name>.sql   each DB function/procedure as its own script
  schema/<schema>.sql             full DDL per schema:
                                    enum types, sequences, tables, constraints
                                    (PK/UNIQUE/CHECK/FK), indexes, views,
                                    materialized views, triggers, RLS policies
  export-supabase.mjs             the exporter
```

Current contents: schemas **`public`** (201 functions) and **`personal`** (1).

## Refresh from the database

```powershell
node ./export-supabase.mjs           # your schemas only (skips auth/storage/realtime/etc.)
node ./export-supabase.mjs --all     # include Supabase-managed schemas too
```

Re-running wipes and rewrites `functions/` and `schema/`.

## Notes & limitations

- **Read-only.** This mirrors the DB down; it does not push changes up. To apply a
  changed function, run its `CREATE OR REPLACE FUNCTION ...` in the Supabase SQL editor,
  or use the deploy path below.
- **Schema DDL is reconstructed** from the catalog (very faithful for understanding and
  re-creation), but it is not a byte-perfect `pg_dump`. For a canonical dump (ownership,
  grants, exact ordering, extensions), install the Supabase CLI and run
  `supabase db dump --schema-only` with a database connection string — ask and I'll set
  that up.
- **Secrets:** function bodies are code and generally safe to commit, but skim them for
  any hardcoded keys before committing (some functions may reference secrets).

## Optional: deploy a changed function back

Functions can be pushed back through the same Management API. Not enabled by default —
ask and I'll add a `deploy-function.ps1` that runs a chosen `functions/**/*.sql` against
the database.
