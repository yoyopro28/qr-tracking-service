import { readFile } from "node:fs/promises";

const environment = process.env.DEPLOY_ENV;
if (!environment || !["preview", "production"].includes(environment)) throw new Error("DEPLOY_ENV must be preview or production");
const scope = process.env.DEPLOY_SCOPE;
if (!scope || !["admin", "backend", "all", "bootstrap"].includes(scope)) throw new Error("DEPLOY_SCOPE must be admin, backend, all or bootstrap");

const deploysAdmin = scope === "admin" || scope === "all" || scope === "bootstrap";
const deploysBackend = scope === "backend" || scope === "all" || scope === "bootstrap";

const values = {};
const requireValues = (names) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (!value || value.includes("example") || value.includes("replace")) throw new Error(`${name} is missing or still a placeholder`);
    values[name] = value;
  }
};

requireValues(["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"]);

if (deploysAdmin) {
  requireValues(["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_TRACKING_ORIGIN", "ADMIN_URL"]);
  for (const name of ["VITE_SUPABASE_URL", "VITE_TRACKING_ORIGIN", "ADMIN_URL"]) {
    const url = new URL(values[name]);
    if (url.protocol !== "https:" || url.origin !== values[name].replace(/\/$/, "")) throw new Error(`${name} must be an HTTPS origin without a path`);
  }
  if (!/^(sb_publishable_|eyJ)/.test(values.VITE_SUPABASE_PUBLISHABLE_KEY)) throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY has an unexpected format");
}

const read = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));

let backend;
if (deploysBackend) {
  requireValues([
    "SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF", "SUPABASE_DB_PASSWORD", "VITE_SUPABASE_URL",
    "VITE_TRACKING_ORIGIN", "CACHE_SYNC_URL", "SYNC_WEBHOOK_SECRET",
  ]);

  const redirect = await read("workers/redirect/wrangler.jsonc");
  const sync = await read("workers/cache-sync/wrangler.jsonc");
  const redirectId = redirect.env[environment].kv_namespaces[0].id;
  const syncId = sync.env[environment].kv_namespaces[0].id;
  const supabaseUrl = sync.env[environment].vars.SUPABASE_URL;
  const analyticsDataset = redirect.env[environment].analytics_engine_datasets[0].dataset;
  const expectedDataset = environment === "preview" ? "qr_scans_preview_20260905" : "qr_scans_20260905";

  if (!/^[0-9a-f]{32}$/i.test(redirectId) || /^([012])\1{31}$/.test(redirectId)) throw new Error(`Invalid ${environment} redirect KV namespace ID`);
  if (redirectId !== syncId) throw new Error(`Redirect and cache-sync Workers must use the same ${environment} KV namespace`);
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl) || supabaseUrl.includes("replace")) throw new Error(`Invalid ${environment} Supabase URL in cache-sync config`);
  if (analyticsDataset !== expectedDataset) throw new Error(`Redirect dataset must be ${expectedDataset} for ${environment}`);
  if (new URL(values.VITE_SUPABASE_URL).origin !== supabaseUrl) throw new Error("Browser and cache-sync Supabase URLs differ");

  for (const name of ["VITE_SUPABASE_URL", "VITE_TRACKING_ORIGIN", "CACHE_SYNC_URL"]) {
    const url = new URL(values[name]);
    if (url.protocol !== "https:" || url.origin !== values[name].replace(/\/$/, "")) throw new Error(`${name} must be an HTTPS origin without a path`);
  }
  backend = { supabaseUrl, kvNamespace: redirectId };
}

if (scope === "bootstrap") {
  requireValues([
    "SUPABASE_SECRET_KEY", "CLOUDFLARE_ANALYTICS_READ_TOKEN", "CLOUDFLARE_ANALYTICS_DATASET",
    "VITE_SUPABASE_PUBLISHABLE_KEY", "ALLOWED_ORIGINS", "HMAC_SECRET", "ROLLUP_CRON_SECRET", "MAINTENANCE_CRON_SECRET",
  ]);
  if (!values.ALLOWED_ORIGINS.split(",").map((value) => value.trim().replace(/\/$/, "")).includes(values.ADMIN_URL.replace(/\/$/, ""))) {
    throw new Error("ALLOWED_ORIGINS must include ADMIN_URL");
  }
  if (!/^(sb_secret_|eyJ)/.test(values.SUPABASE_SECRET_KEY)) throw new Error("SUPABASE_SECRET_KEY has an unexpected format");
  for (const name of ["SYNC_WEBHOOK_SECRET", "HMAC_SECRET", "ROLLUP_CRON_SECRET", "MAINTENANCE_CRON_SECRET"]) {
    if (values[name].length < 32) throw new Error(`${name} must contain at least 32 characters`);
  }
  const expectedDataset = environment === "preview" ? "qr_scans_preview_20260905" : "qr_scans_20260905";
  if (values.CLOUDFLARE_ANALYTICS_DATASET !== expectedDataset) throw new Error(`CLOUDFLARE_ANALYTICS_DATASET must be ${expectedDataset} for ${environment}`);
}

console.log(JSON.stringify({ environment, scope, admin: deploysAdmin ? values.ADMIN_URL : undefined, backend }));
