import { describe, expect, it } from "vitest";
import { handleRequest } from "./index";

function context() { const promises: Promise<unknown>[] = []; return { value: { waitUntil(promise: Promise<unknown>) { promises.push(promise); }, passThroughOnException() {}, props: {} } as unknown as ExecutionContext, promises }; }
function environment(value: unknown, writeDataPoint: () => void = () => {}) {
  return {
    HMAC_SECRET: "test-secret", SCANS: { writeDataPoint },
    REDIRECTS: { async get() { return value; } },
  } as unknown as Parameters<typeof handleRequest>[1];
}

describe("redirect worker", () => {
  it("returns a temporary redirect for active routes", async () => {
    const execution = context();
    const result = await handleRequest(new Request("https://q.example/r/ab12cd34"), environment({ version: 1, status: "active", destinationUrl: "https://example.com/landing", workspaceId: "w", campaignId: "c", flyerId: "f", locationId: null }), execution.value);
    await Promise.all(execution.promises);
    expect(result.status).toBe(307); expect(result.headers.get("location")).toBe("https://example.com/landing"); expect(result.headers.get("cache-control")).toBe("no-store");
  });
  it("returns 410 for a tombstone", async () => { expect((await handleRequest(new Request("https://q.example/r/AB12CD34"), environment({ version: 2, status: "disabled" }), context().value)).status).toBe(410); });
  it("returns 404 for missing routes", async () => { expect((await handleRequest(new Request("https://q.example/r/AB12CD34"), environment(null), context().value)).status).toBe(404); });
  it("does not accept malformed paths", async () => { expect((await handleRequest(new Request("https://q.example/r/..%2Fsecret"), environment(null), context().value)).status).toBe(404); });
  it("does not let analytics failures block the redirect", async () => {
    const execution = context();
    const result = await handleRequest(new Request("https://q.example/r/AB12CD34", { headers: { "CF-Connecting-IP": "192.0.2.4" } }), environment({ version: 1, status: "active", destinationUrl: "https://example.com", workspaceId: "w", campaignId: "c", flyerId: "f", locationId: null }, () => { throw new Error("dataset unavailable"); }), execution.value);
    await Promise.all(execution.promises);
    expect(result.status).toBe(307);
  });
  it("rejects non-GET requests", async () => { expect((await handleRequest(new Request("https://q.example/r/AB12CD34", { method: "POST" }), environment(null), context().value)).status).toBe(405); });
});
