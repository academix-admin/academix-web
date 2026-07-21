/*
 * deploy-function.mjs
 * Push a Supabase DB function back UP to the database by running its .sql
 * (CREATE OR REPLACE FUNCTION ...) through the Management API.
 *
 * Reads SUPABASE_ACCESS_KEY + project ref from ../.env.local (same as the exporter).
 *
 * Usage:
 *   node deploy-function.mjs public/activate_user_account        # dry run (prints SQL)
 *   node deploy-function.mjs public/activate_user_account --run  # actually apply
 *   node deploy-function.mjs functions/public/foo.sql --run      # path also works
 *   node deploy-function.mjs --all --run                         # deploy every function file
 *
 * Safety: does nothing without --run. --all asks for confirmation.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const FN_DIR = join(ROOT, "functions");

const args = process.argv.slice(2);
const RUN = args.includes("--run");
const ALL = args.includes("--all");
const target = args.find((a) => !a.startsWith("--"));

// ---- creds ----
function loadEnv() {
  const txt = readFileSync(join(ROOT, "..", ".env.local"), "utf8");
  const env = {};
  for (const line of txt.split(/\r?\n/)) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim(); }
  return env;
}
const env = loadEnv();
const TOKEN = env.SUPABASE_ACCESS_KEY;
const REF = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!TOKEN || !REF) { console.error("Missing SUPABASE_ACCESS_KEY / project ref in .env.local"); process.exit(1); }

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`(${res.status}) ${await res.text()}`);
  return res.json();
}

// resolve a target like "public/foo", "public/foo.sql", or a path, to an absolute .sql file
function resolveFile(t) {
  const candidates = [
    resolve(t),
    join(FN_DIR, t.endsWith(".sql") ? t : `${t}.sql`),
    join(ROOT, t),
  ];
  return candidates.find((p) => existsSync(p) && statSync(p).isFile());
}

function allFiles() {
  const out = [];
  for (const schema of readdirSync(FN_DIR)) {
    const dir = join(FN_DIR, schema);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) if (f.endsWith(".sql")) out.push(join(dir, f));
  }
  return out;
}

async function deployFile(path) {
  const sql = readFileSync(path, "utf8");
  if (!RUN) { console.log(`\n----- ${path} (DRY RUN) -----\n${sql}`); return; }
  process.stdout.write(`Deploying ${path} ... `);
  await runSQL(sql);
  console.log("OK");
}

(async () => {
  console.log(`Project ${REF} | mode: ${RUN ? "APPLY" : "DRY RUN"}`);
  let files;
  if (ALL) {
    files = allFiles();
    if (RUN) {
      const rl = createInterface({ input: stdin, output: stdout });
      const ans = await rl.question(`About to deploy ${files.length} functions to project ${REF}. Type YES: `);
      rl.close();
      if (ans !== "YES") { console.log("Aborted."); process.exit(0); }
    }
  } else {
    if (!target) { console.error("Give a function (e.g. public/activate_user_account) or --all"); process.exit(1); }
    const f = resolveFile(target);
    if (!f) { console.error(`Not found: ${target}`); process.exit(1); }
    files = [f];
  }
  for (const f of files) await deployFile(f);
  console.log(RUN ? "\nDone." : "\nDry run complete. Add --run to apply.");
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
