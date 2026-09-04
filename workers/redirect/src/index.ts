import { CloudflareAnalyticsWriter } from "./cloudflare-analytics-writer";
import { CloudflareKvRedirectCache } from "./cloudflare-kv-redirect-cache";

function normalizeSlug(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(normalized) ? normalized : null;
}

function userAgentCategory(value: string | null) {
  const agent = value?.toLowerCase() ?? "";
  if (/bot|crawler|spider|slurp/.test(agent)) return "bot";
  if (/ipad|tablet/.test(agent)) return "tablet";
  if (/mobile|android|iphone/.test(agent)) return "mobile";
  return agent ? "desktop" : "unknown";
}

async function dailyFingerprint(secret: string, ip: string) {
  const date = new Date().toISOString().slice(0, 10);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${date}|${ip}`));
  return Array.from(new Uint8Array(signature), (value) => value.toString(16).padStart(2, "0")).join("");
}

function response(status: number, message: string) {
  return new Response(message, { status, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}

type RuntimeEnv = Env & { HMAC_SECRET: string };

export async function handleRequest(request: Request, env: RuntimeEnv, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "GET") return response(405, "Method not allowed");
  const match = new URL(request.url).pathname.match(/^\/r\/([^/]+)\/?$/);
  let slug: string | null = null;
  try { slug = match ? normalizeSlug(decodeURIComponent(match[1])) : null; } catch { slug = null; }
  if (!slug) return response(404, "Not found");
  const route = await new CloudflareKvRedirectCache(env.REDIRECTS).get(slug);
  if (!route) return response(404, "Not found");
  if (route.status === "disabled") return response(410, "Gone");
  const location = new URL(route.destinationUrl);
  if (location.protocol !== "http:" && location.protocol !== "https:") return response(502, "Route unavailable");
  ctx.waitUntil((async () => {
    try {
      const fingerprint = await dailyFingerprint(env.HMAC_SECRET, request.headers.get("CF-Connecting-IP") ?? "");
      new CloudflareAnalyticsWriter(env.SCANS).recordScan({
        workspaceId: route.workspaceId, campaignId: route.campaignId, flyerId: route.flyerId, locationId: route.locationId,
        country: request.headers.get("CF-IPCountry") ?? "", httpStatus: 307,
        userAgentCategory: userAgentCategory(request.headers.get("User-Agent")), dailyIpFingerprint: fingerprint,
      });
    } catch (error) {
      console.error(JSON.stringify({ event: "scan_analytics_write_failed", message: error instanceof Error ? error.message : String(error) }));
    }
  })());
  return new Response(null, { status: 307, headers: { Location: location.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}

export default { fetch: handleRequest } satisfies ExportedHandler<RuntimeEnv>;
