import type { QrRouteProjection } from "./supabase-cache-sync-repository";

export class CloudflareKvRedirectCache {
  constructor(private readonly namespace: KVNamespace) {}
  async putCurrent(projection: QrRouteProjection) {
    const key = `redirect:${projection.slug}`;
    const existing = await this.namespace.get<{ version?: number }>(key, "json");
    if (typeof existing?.version === "number" && existing.version > projection.route.version) return;
    await this.namespace.put(key, JSON.stringify(projection.route));
  }
}
