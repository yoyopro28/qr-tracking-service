export type AnalyticsRow = Record<string, string | number | null>;

type AnalyticsPayload<T> = { data?: T[] } | T[];

export type AnalyticsEngineConfig = {
  accountId: string;
  token: string;
};

export async function queryAnalytics<T>(
  config: AnalyticsEngineConfig,
  sql: string,
): Promise<T[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "text/plain",
      },
      body: sql,
    },
  );

  if (!response.ok) {
    throw new Error(`Analytics Engine query failed (${response.status})`);
  }

  const payload = await response.json() as AnalyticsPayload<T>;
  return Array.isArray(payload) ? payload : payload.data ?? [];
}

export async function analyticsDatasetExists(
  config: AnalyticsEngineConfig,
  dataset: string,
): Promise<boolean> {
  const tables = await queryAnalytics<AnalyticsRow>(config, "SHOW TABLES");
  return tables.some((table) => Object.values(table).some((value) => value === dataset));
}
