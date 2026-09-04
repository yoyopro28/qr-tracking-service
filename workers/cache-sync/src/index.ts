import { CloudflareKvRedirectCache } from "./cloudflare-kv-redirect-cache";
import { SupabaseCacheSyncRepository } from "./supabase-cache-sync-repository";

type RuntimeEnv = Env & { SUPABASE_SECRET_KEY: string; SYNC_WEBHOOK_SECRET: string };

async function secretsEqual(actual: string, expected: string) {
  if (!actual || !expected) return false;
  const encoder = new TextEncoder(); const a = encoder.encode(actual); const b = encoder.encode(expected);
  if (a.byteLength !== b.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < a.byteLength; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

const MAX_EVENTS_PER_INVOCATION = 15;

export async function drain(env: RuntimeEnv, limit = MAX_EVENTS_PER_INVOCATION) {
  const repository = new SupabaseCacheSyncRepository(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
  const cache = new CloudflareKvRedirectCache(env.REDIRECTS);
  const events = await repository.claimEvents(Math.min(Math.max(limit, 1), MAX_EVENTS_PER_INVOCATION));
  const results = await Promise.all(events.map(async (event) => {
    try { const route = await repository.getCurrentRoute(event); await cache.putCurrent(route); await repository.markSucceeded(event.id, route.slug, route.route.version); return true; }
    catch (error) { const message = error instanceof Error ? error.message : String(error); console.error(JSON.stringify({ event: "redirect_cache_sync_failed", eventId: event.id, message })); try { await repository.markFailed(event.id, message); } catch (markError) { console.error(JSON.stringify({ event: "redirect_cache_failure_mark_failed", eventId: event.id, message: String(markError) })); } return false; }
  }));
  return { claimed: events.length, succeeded: results.filter(Boolean).length };
}

export async function handleRequest(request: Request, env: RuntimeEnv): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  if (request.method !== "POST" || url.pathname !== "/webhook") return new Response("Not found", { status: 404 });
  if (!await secretsEqual(request.headers.get("x-sync-secret") ?? "", env.SYNC_WEBHOOK_SECRET)) return new Response("Unauthorized", { status: 401 });
  const result = await drain(env);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

export default {
  fetch: handleRequest,
  async scheduled(controller, env, ctx) {
    if (controller.cron === "0 3 * * *") {
      ctx.waitUntil(new SupabaseCacheSyncRepository(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY).enqueueReconciliation().then(() => drain(env)).then(() => undefined));
    } else ctx.waitUntil(drain(env).then(() => undefined));
  },
} satisfies ExportedHandler<RuntimeEnv>;
