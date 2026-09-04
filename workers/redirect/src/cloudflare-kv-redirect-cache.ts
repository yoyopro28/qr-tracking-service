export type CachedRedirect =
  | { version: number; status: "active"; destinationUrl: string; workspaceId: string; campaignId: string; flyerId: string; locationId: string | null }
  | { version: number; status: "disabled" };

function isRoute(value: unknown): value is CachedRedirect {
  if (!value || typeof value !== "object") return false;
  const route = value as Record<string, unknown>;
  return Number.isSafeInteger(route.version) && Number(route.version) > 0 &&
    (route.status === "disabled" || (route.status === "active" && typeof route.destinationUrl === "string" && typeof route.workspaceId === "string" && typeof route.campaignId === "string" && typeof route.flyerId === "string"));
}

export class CloudflareKvRedirectCache {
  constructor(private readonly namespace: KVNamespace) {}
  async get(slug: string): Promise<CachedRedirect | null> {
    const value = await this.namespace.get<unknown>(`redirect:${slug}`, "json");
    return isRoute(value) ? value : null;
  }
}
