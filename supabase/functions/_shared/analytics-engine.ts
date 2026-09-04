export type AnalyticsRow = Record<string, string | number | null>;

type AnalyticsPayload<T> = { data?: T[] } | T[];

export type AnalyticsEngineConfig = {
  accountId: string;
  token: string;
};

export class AnalyticsEngineQueryError extends Error {
  constructor(
    public readonly status: number,
    public readonly queryName: string,
    public readonly responseDetail: string,
  ) {
    super(`Analytics Engine query "${queryName}" failed (${status}): ${responseDetail}`);
    this.name = "AnalyticsEngineQueryError";
  }
}

function safeResponseDetail(value: string) {
  const detail = value.replace(/\s+/g, " ").trim().slice(0, 1_000);
  return detail || "empty response";
}

export async function queryAnalytics<T>(
  config: AnalyticsEngineConfig,
  sql: string,
  queryName = "unnamed",
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
    throw new AnalyticsEngineQueryError(response.status, queryName, safeResponseDetail(await response.text()));
  }

  const payload = await response.json() as AnalyticsPayload<T>;
  return Array.isArray(payload) ? payload : payload.data ?? [];
}

export async function analyticsDatasetExists(
  config: AnalyticsEngineConfig,
  dataset: string,
): Promise<boolean> {
  const tables = await queryAnalytics<AnalyticsRow>(config, "SHOW TABLES", "list-datasets");
  return tables.some((table) => Object.values(table).some((value) => value === dataset));
}
