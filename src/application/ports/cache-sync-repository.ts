import type { CachedRedirect } from "../../domain/models";

export interface ClaimedCacheEvent {
  id: string;
  slug: string;
  routeVersion: number;
}

export interface QrRouteProjection {
  slug: string;
  route: CachedRedirect;
}

export interface CacheSyncRepository {
  claimEvents(limit: number): Promise<ClaimedCacheEvent[]>;
  getCurrentRoutes(event: ClaimedCacheEvent): Promise<QrRouteProjection[]>;
  markSucceeded(eventId: string, versions: Array<{ slug: string; version: number }>): Promise<void>;
  markFailed(eventId: string, error: { message: string; retryable: boolean }): Promise<void>;
  enqueueReconciliation(limit: number): Promise<number>;
}
