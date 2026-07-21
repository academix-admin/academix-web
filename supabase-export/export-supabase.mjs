/*
 * export-supabase.mjs
 * Mirrors a Supabase/Postgres database to local .sql files using the Supabase
 * Management API (no DB password / Docker needed — just the PAT).
 *
 *   - functions/<schema>/<name>.sql  : each function/procedure as its own script
 *   - schema/<schema>.sql            : full DDL (types, tables, constraints, indexes,
 *                                      views, matviews, triggers, RLS policies)
 *
 * Reads SUPABASE_ACCESS_KEY (sbp_...) and the project ref (from SUPABASE_URL) out of
 * ../.env.local. Read-only: uses only SELECT / catalog functions.
 *
 * Usage:
 *   node export-supabase.mjs           # your schemas (skips supabase-managed)
 *   node export-supabase.mjs --all     # include auth/storage/realtime/etc. too
 */
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const INCLUDE_ALL = process.argv.includes("--all");

// Supabase-managed schemas excluded by default.
const MANAGED = [
  "auth", "storage", "realtime", "_realtime", "graphql", "graphql_public",
  "extensions", "vault", "pgbouncer", "supabase_functions", "supabase_migrations",
  "pgsodium", "pgsodium_masks", "cron", "net", "_analytics", "pgtle",
];
const SYSTEM = ["pg_catalog", "information_schema", "pg_toast"];

// ---- load creds from .env.local ----
function loadEnv() {
  const txt = readFileSync(join(ROOT, "..", ".env.local"), "utf8");
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const env = loadEnv();
const TOKEN = env.SUPABASE_ACCESS_KEY;
const REF = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!TOKEN || !REF) { console.error("Missing SUPABASE_ACCESS_KEY or project ref in .env.local"); process.exit(1); }

// ---- SQL runner over the Management API ----
async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SQL failed (${res.status}): ${body}\n--- query ---\n${query.slice(0, 400)}`);
  }
  return res.json();
}

const excluded = [...SYSTEM, ...(INCLUDE_ALL ? [] : MANAGED)];
const notIn = excluded.map((s) => `'${s}'`).join(", ");

// filename-safe
const safe = (s) => s.replace(/[^a-zA-Z0-9_.-]/g, "_");
function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

async function exportFunctions() {
  console.log("Exporting functions...");
  const rows = await runSQL(`
    select n.nspname as schema,
           p.proname as name,
           pg_get_function_identity_arguments(p.oid) as args,
           pg_get_functiondef(p.oid) as ddl
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in (${notIn})
      and p.prokind in ('f','p')                       -- functions + procedures (skip aggregates/window)
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')  -- skip extension-owned
    order by n.nspname, p.proname;
  `);
  const seen = new Map();
  for (const r of rows) {
    let base = safe(r.name);
    const key = `${r.schema}/${base}`;
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    const fname = n > 1 ? `${base}__${n}` : base;   // disambiguate overloads
    const header = `-- schema:   ${r.schema}\n-- function: ${r.name}(${r.args})\n-- generated from Supabase project ${REF} (read-only mirror)\n\n`;
    write(join(ROOT, "functions", safe(r.schema), `${fname}.sql`), header + r.ddl + "\n");
  }
  console.log(`  ${rows.length} function(s) written`);
  return rows;
}

async function schemaList() {
  const rows = await runSQL(`select nspname from pg_namespace where nspname not in (${notIn}) and nspname !~ '^pg_temp' and nspname !~ '^pg_toast_temp' order by 1;`);
  return rows.map((r) => r.nspname);
}

async function q(sql) { try { return await runSQL(sql); } catch (e) { console.warn("  (section skipped) " + e.message.split("\n")[0]); return []; } }

async function exportSchemaDDL(schemas) {
  console.log("Exporting schema DDL...");
  // Pull everything once, grouped by schema in JS.
  const enums = await q(`
    select n.nspname as schema,
      'CREATE TYPE '||quote_ident(n.nspname)||'.'||quote_ident(t.typname)||' AS ENUM ('||
      string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder)||');' as ddl
    from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace
    where n.nspname not in (${notIn}) group by n.nspname, t.typname order by 1,2;`);

  const seqs = await q(`
    select schemaname as schema,
      'CREATE SEQUENCE IF NOT EXISTS '||quote_ident(schemaname)||'.'||quote_ident(sequencename)||';' as ddl
    from pg_sequences where schemaname not in (${notIn}) order by 1,2;`);

  const tables = await q(`
    select n.nspname as schema, c.relname as name,
      'CREATE TABLE '||quote_ident(n.nspname)||'.'||quote_ident(c.relname)||' ('||chr(10)||
      string_agg('  '||quote_ident(a.attname)||' '||pg_catalog.format_type(a.atttypid,a.atttypmod)||
        case when a.attnotnull then ' NOT NULL' else '' end||
        case when ad.adbin is not null then ' DEFAULT '||pg_get_expr(ad.adbin, ad.adrelid) else '' end,
        ','||chr(10) order by a.attnum)||chr(10)||');' as ddl
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
    left join pg_attrdef ad on ad.adrelid=c.oid and ad.adnum=a.attnum
    where c.relkind='r' and n.nspname not in (${notIn})
    group by n.nspname, c.relname order by 1,2;`);

  const constraints = await q(`
    select n.nspname as schema,
      'ALTER TABLE '||quote_ident(n.nspname)||'.'||quote_ident(c.relname)||
      ' ADD CONSTRAINT '||quote_ident(con.conname)||' '||pg_get_constraintdef(con.oid)||';' as ddl,
      case con.contype when 'p' then 0 when 'u' then 1 when 'c' then 2 else 3 end as ord
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname not in (${notIn}) order by 1, ord;`);

  const indexes = await q(`
    select schemaname as schema, indexdef||';' as ddl
    from pg_indexes i
    where schemaname not in (${notIn})
      and not exists (
        select 1 from pg_constraint con
        join pg_class ic on ic.oid=con.conindid
        join pg_namespace icn on icn.oid=ic.relnamespace
        where ic.relname=i.indexname and icn.nspname=i.schemaname)
    order by 1,2;`);

  const views = await q(`
    select schemaname as schema,
      'CREATE OR REPLACE VIEW '||quote_ident(schemaname)||'.'||quote_ident(viewname)||' AS'||chr(10)||definition as ddl
    from pg_views where schemaname not in (${notIn}) order by 1,2;`);

  const matviews = await q(`
    select schemaname as schema,
      'CREATE MATERIALIZED VIEW '||quote_ident(schemaname)||'.'||quote_ident(matviewname)||' AS'||chr(10)||definition as ddl
    from pg_matviews where schemaname not in (${notIn}) order by 1,2;`);

  const triggers = await q(`
    select n.nspname as schema, pg_get_triggerdef(t.oid)||';' as ddl
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and n.nspname not in (${notIn}) order by 1,2;`);

  const rlsEnable = await q(`
    select n.nspname as schema,
      'ALTER TABLE '||quote_ident(n.nspname)||'.'||quote_ident(c.relname)||' ENABLE ROW LEVEL SECURITY;' as ddl
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r' and c.relrowsecurity and n.nspname not in (${notIn}) order by 1,2;`);

  const policies = await q(`
    select schemaname as schema,
      'CREATE POLICY '||quote_ident(policyname)||' ON '||quote_ident(schemaname)||'.'||quote_ident(tablename)||
      ' AS '||case when permissive='PERMISSIVE' then 'PERMISSIVE' else 'RESTRICTIVE' end||
      ' FOR '||cmd||' TO '||array_to_string(roles, ', ')||
      coalesce(' USING ('||qual||')','')||
      coalesce(' WITH CHECK ('||with_check||')','')||';' as ddl
    from pg_policies where schemaname not in (${notIn}) order by 1,2;`);

  const byschema = (rows) => rows.reduce((m, r) => ((m[r.schema] ??= []).push(r.ddl), m), {});
  const g = { enums: byschema(enums), seqs: byschema(seqs), tables: byschema(tables),
    constraints: byschema(constraints), indexes: byschema(indexes), views: byschema(views),
    matviews: byschema(matviews), triggers: byschema(triggers), rlsEnable: byschema(rlsEnable),
    policies: byschema(policies) };

  const section = (title, arr) => (arr && arr.length) ? `\n-- ============================================================\n-- ${title}\n-- ============================================================\n\n${arr.join("\n\n")}\n` : "";

  for (const s of schemas) {
    let out = `-- Schema: ${s}\n-- Project: ${REF}  (read-only mirror via Management API)\n-- NOTE: functions live in ../functions/${s}/*.sql\n\nCREATE SCHEMA IF NOT EXISTS ${JSON.stringify(s).replace(/"/g,'')};\n`;
    out += section("ENUM TYPES", g.enums[s]);
    out += section("SEQUENCES", g.seqs[s]);
    out += section("TABLES", g.tables[s]);
    out += section("CONSTRAINTS (PK, UNIQUE, CHECK, FK)", g.constraints[s]);
    out += section("INDEXES", g.indexes[s]);
    out += section("VIEWS", g.views[s]);
    out += section("MATERIALIZED VIEWS", g.matviews[s]);
    out += section("TRIGGERS", g.triggers[s]);
    out += section("ROW LEVEL SECURITY", [...(g.rlsEnable[s]||[]), ...(g.policies[s]||[])]);
    write(join(ROOT, "schema", `${safe(s)}.sql`), out);
    console.log(`  schema/${s}.sql`);
  }
}

(async () => {
  console.log(`Project ${REF} | schemas: ${INCLUDE_ALL ? "ALL" : "user only"}`);
  // fresh output
  for (const d of ["functions", "schema"]) { try { rmSync(join(ROOT, d), { recursive: true, force: true }); } catch {} }
  const schemas = await schemaList();
  console.log("Schemas:", schemas.join(", ") || "(none)");
  await exportFunctions();
  await exportSchemaDDL(schemas);
  console.log("\nDone. Output in", ROOT);
})().catch((e) => { console.error(e); process.exit(1); });
