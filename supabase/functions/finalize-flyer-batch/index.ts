import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, requireBearer, supabasePublishableKey, supabaseSecretKey } from "../_shared/http.ts";

type Input = { batchId: string; storagePath: string; sha256: string; fileSizeBytes: number };

async function sha256Hex(blob: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  const authorization = requireBearer(request);
  if (!authorization) return json(request, { error: "Unauthorized" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const publishableKey = supabasePublishableKey();
    const secretKey = supabaseSecretKey();
    const userClient = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
    const service = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json(request, { error: "Unauthorized" }, 401);
    const input = await request.json() as Input;
    if (!/^[0-9a-f-]{36}$/i.test(input.batchId) || !/^[a-f0-9]{64}$/.test(input.sha256) || !Number.isSafeInteger(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
      return json(request, { error: "Invalid batch metadata" }, 400);
    }
    if (!input.storagePath.endsWith(`/${input.batchId}/flyer-batch.pdf`)) return json(request, { error: "Invalid storage path" }, 400);
    const { data: object, error: objectError } = await service.storage.from("generated-flyers").download(input.storagePath);
    if (objectError || !object) return json(request, { error: "Generated PDF is missing" }, 409);
    if (object.size !== input.fileSizeBytes) return json(request, { error: "Generated PDF size does not match" }, 409);
    if (await sha256Hex(object) !== input.sha256) return json(request, { error: "Generated PDF hash does not match" }, 409);
    const { data, error } = await service.rpc("finalize_flyer_batch", {
      p_batch_id: input.batchId, p_storage_path: input.storagePath, p_sha256: input.sha256,
      p_file_size_bytes: input.fileSizeBytes, p_user_id: userData.user.id,
    });
    if (error) throw error;
    return json(request, data);
  } catch (error) {
    console.error(JSON.stringify({ event: "finalize_batch_failed", error: error instanceof Error ? error.message : String(error) }));
    return json(request, { error: "Finalization failed" }, 500);
  }
});
