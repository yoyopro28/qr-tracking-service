import { createClient } from "npm:@supabase/supabase-js@2";
import { json, supabaseSecretKey } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST" || request.headers.get("x-cron-secret") !== Deno.env.get("MAINTENANCE_CRON_SECRET")) return json(undefined, { error: "Unauthorized" }, 401);
  try {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, supabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ data: templates, error: templateError }, { data: batches, error: batchError }] = await Promise.all([
      client.from("templates").select("storage_path").eq("status", "UPLOADING").lt("created_at", cutoff),
      client.from("flyer_batches").select("storage_path").eq("status", "RESERVED").lt("created_at", cutoff),
    ]);
    if (templateError || batchError) throw templateError ?? batchError;
    const templatePaths = (templates ?? []).map((item) => item.storage_path);
    const batchPaths = (batches ?? []).map((item) => item.storage_path);
    if (templatePaths.length) { const { error } = await client.storage.from("templates").remove(templatePaths); if (error) throw error; }
    if (batchPaths.length) { const { error } = await client.storage.from("generated-flyers").remove(batchPaths); if (error) throw error; }
    const { data, error } = await client.rpc("expire_stale_uploads");
    if (error) throw error;
    const result = data && typeof data === "object" ? data : {};
    return json(undefined, { ...result, deletedTemplateObjects: templatePaths.length, deletedBatchObjects: batchPaths.length });
  } catch (error) {
    console.error(JSON.stringify({ event: "stale_reservation_cleanup_failed", error: error instanceof Error ? error.message : String(error) }));
    return json(undefined, { error: "Cleanup failed" }, 500);
  }
});
