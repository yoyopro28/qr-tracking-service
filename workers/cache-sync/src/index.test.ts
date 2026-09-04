import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRequest } from "./index";

function environment() {
  const writes: Array<[string, string]> = [];
  return {
    writes,
    value: {
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SECRET_KEY: "secret",
      SYNC_WEBHOOK_SECRET: "webhook-secret",
      REDIRECTS: { async get() { return null; }, async put(key: string, value: string) { writes.push([key, value]); } },
    } as unknown as Parameters<typeof handleRequest>[1],
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("cache-sync worker", () => {
  it("rejects webhook calls without the shared secret", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const result = await handleRequest(new Request("https://sync.example/webhook", { method: "POST" }), environment().value);
    expect(result.status).toBe(401); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drains the outbox and writes the current route", async () => {
    const responses = [
      Response.json([{ id: "event-1", slug: "AB12CD34", route_version: 2 }]),
      Response.json([{ slug: "AB12CD34", destination_url: "https://example.com", workspace_id: "w", campaign_id: "c", flyer_id: "f", location_id: null, status: "ACTIVE", version: 2 }]),
      new Response(null, { status: 204 }),
    ];
    const requests: Array<{ input: Request | string | URL; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: Request | string | URL, init?: RequestInit) => { requests.push({ input, init }); return responses.shift()!; }); vi.stubGlobal("fetch", fetchMock);
    const env = environment();
    const result = await handleRequest(new Request("https://sync.example/webhook", { method: "POST", headers: { "x-sync-secret": "webhook-secret" } }), env.value);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ claimed: 1, succeeded: 1 });
    expect(env.writes).toEqual([["redirect:AB12CD34", JSON.stringify({ version: 2, status: "active", destinationUrl: "https://example.com", workspaceId: "w", campaignId: "c", flyerId: "f", locationId: null })]]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({ p_limit: 15 });
    expect(new Headers(requests[0].init?.headers).has("Authorization")).toBe(false);
  });
});
