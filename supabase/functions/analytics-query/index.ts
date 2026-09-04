import { createClient } from "npm:@supabase/supabase-js@2";
import { analyticsDatasetExists, queryAnalytics, type AnalyticsEngineConfig, type AnalyticsRow } from "../_shared/analytics-engine.ts";
import { corsHeaders, json, requireBearer, supabasePublishableKey } from "../_shared/http.ts";

type Input = { workspaceId: string; from: string; to: string };
type Summary = {
  totalScans: number;
  uniqueIpDays: number;
  series: Array<{ date: string; scans: number }>;
  campaigns: Array<{ campaignId: string; scans: number }>;
  locations: Array<{ locationId: string | null; scans: number }>;
};

function iso(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid date range");
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function analyticsDataset() {
  const value = Deno.env.get("CLOUDFLARE_ANALYTICS_DATASET") ?? "";
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(value)) throw new Error("Analytics Engine dataset is not configured");
  return value;
}

const emptySummary = (): Summary => ({ totalScans: 0, uniqueIpDays: 0, series: [], campaigns: [], locations: [] });

function mergeSummaries(left: Summary, right: Summary): Summary {
  const merge = <T extends { scans: number }>(items: T[], key: (item: T) => string) => {
    const values = new Map<string, T>();
    for (const item of items) {
      const id = key(item);
      const current = values.get(id);
      values.set(id, current ? { ...current, scans: current.scans + item.scans } : item);
    }
    return [...values.values()];
  };
  return {
    totalScans: left.totalScans + right.totalScans,
    uniqueIpDays: left.uniqueIpDays + right.uniqueIpDays,
    series: merge([...left.series, ...right.series], (item) => item.date).sort((a, b) => a.date.localeCompare(b.date)),
    campaigns: merge([...left.campaigns, ...right.campaigns], (item) => item.campaignId).sort((a, b) => b.scans - a.scans).slice(0, 100),
    locations: merge([...left.locations, ...right.locations], (item) => item.locationId ?? "").sort((a, b) => b.scans - a.scans).slice(0, 100),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);
  const authorization = requireBearer(request);
  if (!authorization) return json(request, { error: "Unauthorized" }, 401);
  try {
    const input = await request.json() as Input;
    if (!/^[0-9a-f-]{36}$/i.test(input.workspaceId)) return json(request, { error: "Invalid workspace" }, 400);
    const fromDate = new Date(input.from); const toDate = new Date(input.to);
    const fromMs = fromDate.getTime(); const toMs = toDate.getTime();
    if (toMs <= fromMs || toMs - fromMs > 3660 * 86400000 || toMs > Date.now() + 300000) return json(request, { error: "Invalid date range" }, 400);
    const user = createClient(Deno.env.get("SUPABASE_URL")!, supabasePublishableKey(), { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await user.auth.getUser();
    if (userError || !userData.user) return json(request, { error: "Unauthorized" }, 401);
    const { data: membership, error } = await user.from("workspace_members").select("workspace_id").eq("workspace_id", input.workspaceId).maybeSingle();
    if (error || !membership) return json(request, { error: "Forbidden" }, 403);
    const todayMs = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const liveCutoffMs = todayMs - 86400000;
    if (fromMs < liveCutoffMs && fromDate.toISOString().slice(11) !== "00:00:00.000Z") return json(request, { error: "Historical date ranges must begin at UTC midnight" }, 400);
    let rollups = emptySummary();
    if (fromMs < Math.min(toMs, liveCutoffMs)) {
      const { data, error: rollupError } = await user.rpc("get_scan_rollup_summary", {
        p_workspace_id: input.workspaceId,
        p_from: fromDate.toISOString().slice(0, 10),
        p_to: new Date(Math.min(toMs, liveCutoffMs)).toISOString().slice(0, 10),
      });
      if (rollupError) throw rollupError;
      rollups = data as unknown as Summary;
    }

    let live = emptySummary();
    if (toMs > Math.max(fromMs, liveCutoffMs)) {
      const dataset = analyticsDataset();
      const analyticsConfig: AnalyticsEngineConfig = {
        accountId: Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!,
        token: Deno.env.get("CLOUDFLARE_ANALYTICS_READ_TOKEN")!,
      };
      if (await analyticsDatasetExists(analyticsConfig, dataset)) {
        const liveFrom = iso(new Date(Math.max(fromMs, liveCutoffMs)).toISOString());
        const liveTo = iso(toDate.toISOString());
        const where = `blob1 = '${input.workspaceId}' AND timestamp >= toDateTime('${liveFrom}') AND timestamp < toDateTime('${liveTo}')`;
        const [totals, series, campaigns, locations] = await Promise.all([
          queryAnalytics<AnalyticsRow>(analyticsConfig, `SELECT sum(_sample_interval * double1) AS scans, count(DISTINCT blob8) AS unique_ip_days FROM ${dataset} WHERE ${where}`),
          queryAnalytics<AnalyticsRow>(analyticsConfig, `SELECT formatDateTime(timestamp, '%Y-%m-%d', 'Etc/UTC') AS date, sum(_sample_interval * double1) AS scans FROM ${dataset} WHERE ${where} GROUP BY date ORDER BY date`),
          queryAnalytics<AnalyticsRow>(analyticsConfig, `SELECT blob2 AS campaign_id, sum(_sample_interval * double1) AS scans FROM ${dataset} WHERE ${where} GROUP BY campaign_id ORDER BY scans DESC LIMIT 100`),
          queryAnalytics<AnalyticsRow>(analyticsConfig, `SELECT blob4 AS location_id, sum(_sample_interval * double1) AS scans FROM ${dataset} WHERE ${where} GROUP BY location_id ORDER BY scans DESC LIMIT 100`),
        ]);
        live = {
          totalScans: Number(totals[0]?.scans ?? 0), uniqueIpDays: Number(totals[0]?.unique_ip_days ?? 0),
          series: series.map((row) => ({ date: String(row.date), scans: Number(row.scans) })),
          campaigns: campaigns.map((row) => ({ campaignId: String(row.campaign_id), scans: Number(row.scans) })),
          locations: locations.map((row) => ({ locationId: row.location_id ? String(row.location_id) : null, scans: Number(row.scans) })),
        };
      }
    }
    return json(request, mergeSummaries(rollups, live));
  } catch (error) {
    console.error(JSON.stringify({ event: "analytics_query_failed", error: error instanceof Error ? error.message : String(error) }));
    return json(request, { error: "Analytics query failed" }, 500);
  }
});
