const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
const response = await fetch(`${supabaseUrl}/rest/v1/rpc/configure_runtime_integrations`, {
  method: "POST",
  headers: {
    apikey: required("SUPABASE_SECRET_KEY"),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    p_project_url: supabaseUrl,
    p_publishable_key: required("VITE_SUPABASE_PUBLISHABLE_KEY"),
    p_cache_sync_url: required("CACHE_SYNC_URL").replace(/\/$/, ""),
    p_sync_secret: required("SYNC_WEBHOOK_SECRET"),
    p_rollup_secret: required("ROLLUP_CRON_SECRET"),
    p_maintenance_secret: required("MAINTENANCE_CRON_SECRET"),
  }),
});

if (!response.ok) {
  const message = await response.text();
  throw new Error(`Runtime integration setup failed (${response.status}): ${message.slice(0, 500)}`);
}

console.log(JSON.stringify({ configured: true, supabaseUrl, cacheSyncUrl: process.env.CACHE_SYNC_URL }));
