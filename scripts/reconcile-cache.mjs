const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const supabaseUrl = required("SUPABASE_URL");
const secret = required("SUPABASE_SECRET_KEY");
const syncUrl = required("CACHE_SYNC_URL");
const webhookSecret = required("SYNC_WEBHOOK_SECRET");

const reconciliation = await fetch(`${supabaseUrl}/rest/v1/rpc/enqueue_redirect_cache_reconciliation`, {
  method: "POST",
  headers: { apikey: secret, "Content-Type": "application/json" },
  body: JSON.stringify({ p_limit: 5000 }),
});
if (!reconciliation.ok) throw new Error(`Could not enqueue reconciliation (${reconciliation.status})`);

let claimed = 1;
let total = 0;
while (claimed > 0) {
  const response = await fetch(`${syncUrl.replace(/\/$/, "")}/webhook`, {
    method: "POST",
    headers: { "x-sync-secret": webhookSecret },
  });
  if (!response.ok) throw new Error(`Cache-sync Worker failed (${response.status})`);
  const result = await response.json();
  claimed = Number(result.claimed ?? 0);
  total += Number(result.succeeded ?? 0);
}
console.log(JSON.stringify({ synchronizedRoutes: total }));
