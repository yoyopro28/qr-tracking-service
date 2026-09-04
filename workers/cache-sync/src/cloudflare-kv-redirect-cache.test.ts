import { describe, expect, it } from "vitest";
import { CloudflareKvRedirectCache } from "./cloudflare-kv-redirect-cache";

function namespace(existing: { version: number } | null) {
  const writes: Array<[string, string]> = [];
  const binding = {
    async get() { return existing; },
    async put(key: string, value: string) { writes.push([key, value]); },
  } as unknown as KVNamespace;
  return { binding, writes };
}

describe("KV version guard", () => {
  it("does not let an older event overwrite a newer cached route", async () => {
    const fake = namespace({ version: 9 });
    await new CloudflareKvRedirectCache(fake.binding).putCurrent({ slug: "AB12CD34", route: { version: 8, status: "disabled" } });
    expect(fake.writes).toHaveLength(0);
  });

  it("stores permanent tombstones without an expiration", async () => {
    const fake = namespace(null);
    await new CloudflareKvRedirectCache(fake.binding).putCurrent({ slug: "AB12CD34", route: { version: 2, status: "disabled" } });
    expect(fake.writes).toEqual([["redirect:AB12CD34", JSON.stringify({ version: 2, status: "disabled" })]]);
  });
});
