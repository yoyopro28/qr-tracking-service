import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsDatasetExists, queryAnalytics } from "./analytics-engine.ts";

const config = { accountId: "account-id", token: "read-token" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Analytics Engine client", () => {
  it("reads rows from Cloudflare's JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ scans: 3 }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryAnalytics(config, "SELECT 3 AS scans")).resolves.toEqual([{ scans: 3 }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/accounts/account-id/analytics_engine/sql",
      expect.objectContaining({ method: "POST", body: "SELECT 3 AS scans" }),
    );
  });

  it("treats an Analytics Engine dataset as absent until it receives its first event", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ name: "another_dataset" }] }), { status: 200 })));

    await expect(analyticsDatasetExists(config, "qr_scans")).resolves.toBe(false);
  });

  it("finds an initialized dataset returned by SHOW TABLES", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ name: "qr_scans" }] }), { status: 200 })));

    await expect(analyticsDatasetExists(config, "qr_scans")).resolves.toBe(true);
  });

  it("keeps actual Analytics Engine failures visible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid query", { status: 422 })));

    await expect(queryAnalytics(config, "SELECT invalid()", "broken-query"))
      .rejects.toThrow('Analytics Engine query "broken-query" failed (422): invalid query');
  });

  it("bounds and flattens error details before logging them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`first\n${"x".repeat(2_000)}`, { status: 422 })));

    await expect(queryAnalytics(config, "SELECT invalid()", "broken-query"))
      .rejects.toMatchObject({ status: 422, queryName: "broken-query", responseDetail: expect.stringMatching(/^first x{900}/) });
  });
});
