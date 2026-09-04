import { createClient } from "npm:@supabase/supabase-js@2";
import { analyticsDatasetExists, queryAnalytics, type AnalyticsEngineConfig } from "../_shared/analytics-engine.ts";
import { json, supabaseSecretKey } from "../_shared/http.ts";

type Rollup = { day: string; workspace_id: string; campaign_id: string; flyer_id: string; location_id: string | null; country_code: string; scans: number; unique_ip_days: number };
type WorkspaceRollup = { day: string; workspace_id: string; scans: number; unique_ip_days: number };

Deno.serve(async (request) => {
  if (request.method !== "POST" || request.headers.get("x-cron-secret") !== Deno.env.get("ROLLUP_CRON_SECRET")) return json(undefined, { error: "Unauthorized" }, 401);
  try {
    const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!;
    const dataset = Deno.env.get("CLOUDFLARE_ANALYTICS_DATASET") ?? "";
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(dataset)) throw new Error("Analytics Engine dataset is not configured");
    const token = Deno.env.get("CLOUDFLARE_ANALYTICS_READ_TOKEN")!;
    const analyticsConfig: AnalyticsEngineConfig = { accountId, token };
    if (!(await analyticsDatasetExists(analyticsConfig, dataset))) {
      return json(undefined, { day, rows: 0, workspaceRows: 0 });
    }
    const nextDay = new Date(Date.parse(`${day}T00:00:00.000Z`) + 86400000).toISOString().slice(0, 10);
    const sql = `SELECT '${day}' AS day, blob1 AS workspace_id, blob2 AS campaign_id, blob3 AS flyer_id, blob4 AS location_id, blob5 AS country_code, sum(_sample_interval * double1) AS scans, count(DISTINCT blob8) AS unique_ip_days FROM ${dataset} WHERE timestamp >= toDateTime('${day} 00:00:00') AND timestamp < toDateTime('${nextDay} 00:00:00') GROUP BY workspace_id, campaign_id, flyer_id, location_id, country_code`;
    const workspaceSql = `SELECT '${day}' AS day, blob1 AS workspace_id, sum(_sample_interval * double1) AS scans, count(DISTINCT blob8) AS unique_ip_days FROM ${dataset} WHERE timestamp >= toDateTime('${day} 00:00:00') AND timestamp < toDateTime('${nextDay} 00:00:00') GROUP BY workspace_id`;
    const [rows, workspaceRows] = await Promise.all([
      queryAnalytics<Rollup>(analyticsConfig, sql, "daily-rollup"),
      queryAnalytics<WorkspaceRollup>(analyticsConfig, workspaceSql, "workspace-rollup"),
    ]);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, supabaseSecretKey(), { auth: { persistSession: false } });
    if (rows.length) {
      const { error } = await supabase.from("scan_rollups_daily").upsert(rows, { onConflict: "day,workspace_id,campaign_id,flyer_id,location_id,country_code" });
      if (error) throw error;
    }
    if (workspaceRows.length) {
      const { error } = await supabase.from("scan_workspace_rollups_daily").upsert(workspaceRows, { onConflict: "day,workspace_id" });
      if (error) throw error;
    }
    return json(undefined, { day, rows: rows.length, workspaceRows: workspaceRows.length });
  } catch (error) {
    console.error(JSON.stringify({ event: "analytics_rollup_failed", error: error instanceof Error ? error.message : String(error) }));
    return json(undefined, { error: "Rollup failed" }, 500);
  }
});
