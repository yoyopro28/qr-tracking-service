import type { CachedRedirect } from "../../domain/models";

export interface RedirectCache {
  get(slug: string): Promise<CachedRedirect | null>;
  put(slug: string, route: CachedRedirect): Promise<void>;
  putTombstone(slug: string, version: number): Promise<void>;
}
