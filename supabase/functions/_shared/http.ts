const localOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

export function corsHeaders(request?: Request) {
  const configured = Deno.env.get("ALLOWED_ORIGINS")?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  const allowed = configured.length > 0 ? configured : localOrigins;
  const origin = request?.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function json(request: Request | undefined, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export function requireBearer(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ") || authorization.length < 32) return null;
  return authorization;
}

function namedKey(name: string) {
  const raw = Deno.env.get(name);
  if (!raw) return null;
  try {
    const keys = JSON.parse(raw) as Record<string, unknown>;
    return typeof keys.default === "string" ? keys.default : null;
  } catch { return null; }
}

export function supabasePublishableKey() {
  const value = namedKey("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!value) throw new Error("Supabase publishable key is not configured");
  return value;
}

export function supabaseSecretKey() {
  const value = namedKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!value) throw new Error("Supabase secret key is not configured");
  return value;
}
