export interface ClaimedCacheEvent { id: string; slug: string; routeVersion: number }
export interface QrRouteProjection { slug: string; route: { version: number; status: "active"; destinationUrl: string; workspaceId: string; campaignId: string; flyerId: string; locationId: string | null } | { version: number; status: "disabled" } }

export class SupabaseCacheSyncRepository {
  constructor(private readonly url: string, private readonly secret: string) {}
  private async request(path: string, init?: RequestInit) {
    const response = await fetch(`${this.url}/rest/v1/${path}`, { ...init, headers: { apikey: this.secret, "Content-Type": "application/json", ...init?.headers } });
    if (!response.ok) throw new Error(`Supabase ${path} failed (${response.status})`);
    if (response.status === 204) return null;
    return response.json() as Promise<unknown>;
  }
  async claimEvents(limit: number): Promise<ClaimedCacheEvent[]> {
    const data = await this.request("rpc/claim_redirect_cache_events", { method: "POST", body: JSON.stringify({ p_limit: limit, p_lease_seconds: 60 }) }) as Array<{ id: string; slug: string; route_version: number }>;
    return data.map((row) => ({ id: row.id, slug: row.slug, routeVersion: row.route_version }));
  }
  async getCurrentRoute(event: ClaimedCacheEvent): Promise<QrRouteProjection> {
    const rows = await this.request(`qr_routes?slug=eq.${encodeURIComponent(event.slug)}&select=slug,destination_url,workspace_id,campaign_id,flyer_id,location_id,status,version&limit=1`) as Array<Record<string, unknown>>;
    const row = rows[0]; if (!row) return { slug: event.slug, route: { version: event.routeVersion, status: "disabled" } };
    const version = Number(row.version);
    return row.status === "ACTIVE" ? { slug: String(row.slug), route: { version, status: "active", destinationUrl: String(row.destination_url), workspaceId: String(row.workspace_id), campaignId: String(row.campaign_id), flyerId: String(row.flyer_id), locationId: row.location_id ? String(row.location_id) : null } } : { slug: String(row.slug), route: { version, status: "disabled" } };
  }
  async markSucceeded(eventId: string, slug: string, version: number) { await this.request("rpc/complete_redirect_cache_event", { method: "POST", body: JSON.stringify({ p_event_id: eventId, p_slug: slug, p_version: version }) }); }
  async markFailed(eventId: string, message: string) { await this.request("rpc/fail_redirect_cache_event", { method: "POST", body: JSON.stringify({ p_event_id: eventId, p_error: message, p_retryable: true }) }); }
  async enqueueReconciliation(limit = 1000) { return Number(await this.request("rpc/enqueue_redirect_cache_reconciliation", { method: "POST", body: JSON.stringify({ p_limit: limit }) }) ?? 0); }
}
