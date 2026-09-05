const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value.replace(/\/$/, "");
};

const requestedScope = process.env.DEPLOY_SCOPE?.trim() || "all";
if (!new Set(["all", "admin", "backend", "bootstrap"]).has(requestedScope)) throw new Error("DEPLOY_SCOPE must be all, admin, backend or bootstrap");
const scope = requestedScope === "bootstrap" ? "all" : requestedScope;
const result = { scope: requestedScope };

if (scope === "all" || scope === "admin") {
  const admin = await fetch(required("ADMIN_URL"), { redirect: "manual" });
  if (!admin.ok || !(admin.headers.get("content-type") ?? "").includes("text/html")) throw new Error(`Admin SPA failed (${admin.status})`);
  for (const header of ["x-content-type-options", "x-frame-options", "content-security-policy"]) if (!admin.headers.get(header)) throw new Error(`Admin SPA is missing ${header}`);
  result.admin = admin.status;
}

if (scope === "all" || scope === "backend") {
  const redirectUrl = required("REDIRECT_URL");
  const syncUrl = required("CACHE_SYNC_URL");
  const syncSecret = required("SYNC_WEBHOOK_SECRET");
  const health = await fetch(`${syncUrl}/health`);
  if (!health.ok || !(await health.json()).ok) throw new Error(`Cache-sync health failed (${health.status})`);

  const denied = await fetch(`${syncUrl}/webhook`, { method: "POST" });
  if (denied.status !== 401) throw new Error(`Cache-sync unauthenticated check returned ${denied.status}`);
  const drain = await fetch(`${syncUrl}/webhook`, { method: "POST", headers: { "x-sync-secret": syncSecret } });
  if (!drain.ok) throw new Error(`Cache-sync drain failed (${drain.status})`);

  const missing = await fetch(`${redirectUrl}/r/ZZZZZZZZ`, { redirect: "manual" });
  if (missing.status !== 404 || missing.headers.get("cache-control") !== "no-store") throw new Error(`Redirect missing-route check failed (${missing.status})`);

  const smokeSlug = process.env.SMOKE_REDIRECT_SLUG?.trim();
  if (smokeSlug) {
    const redirect = await fetch(`${redirectUrl}/r/${smokeSlug}`, { redirect: "manual" });
    if (redirect.status !== 307 || !redirect.headers.get("location")) throw new Error(`Known redirect check failed (${redirect.status})`);
  }
  result.cacheSync = await drain.json();
  result.redirectMissing = missing.status;
  result.testedKnownRedirect = Boolean(smokeSlug);
}

console.log(JSON.stringify(result));
