#!/usr/bin/env node
/**
 * Run prisma migrate deploy over a direct (non-pooler) Neon connection.
 * PgBouncer / Neon pooler cannot hold session advisory locks → P1002.
 *
 * Prefer DIRECT_URL. If missing, strip "-pooler" from DATABASE_URL.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function loadEnvFile() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

function withoutPooler(url) {
  return url.replace("-pooler.", ".");
}

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

if (!databaseUrl && !directUrl) {
  console.error("Missing DATABASE_URL (and DIRECT_URL). Cannot migrate.");
  process.exit(1);
}

let migrateUrl = directUrl || databaseUrl;
if (migrateUrl.includes("-pooler.")) {
  const fixed = withoutPooler(migrateUrl);
  console.warn(
    "[migrate] Connection string contains '-pooler'. Using direct host for migrations:\n  ",
    fixed.replace(/:[^:@/]+@/, ":****@"),
  );
  migrateUrl = fixed;
}

if (!directUrl) {
  console.warn(
    "[migrate] DIRECT_URL is not set on this environment. Add it on Vercel (Neon → Connect → Direct).",
  );
}

try {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      // Force both so schema url + directUrl never hit the pooler during migrate
      DATABASE_URL: migrateUrl,
      DIRECT_URL: migrateUrl,
      // A cancelled Vercel build can leave pg_advisory_lock held → P1002 forever.
      // Safe for a single-app deploy; avoid running two migrates at once.
      PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1",
    },
  });
} catch (err) {
  console.error("\n[migrate] prisma migrate deploy failed.");
  console.error(
    "If this is P1002 (advisory lock): wait 1–2 min and redeploy, or in Neon SQL Editor run:\n" +
      "  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query ILIKE '%pg_advisory_lock%';\n",
  );
  process.exit(err.status ?? 1);
}
