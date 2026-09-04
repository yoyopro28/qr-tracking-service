export type Id = string;
export type CampaignStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type TemplateStatus = "UPLOADING" | "READY" | "FAILED" | "ARCHIVED";
export type FlyerBatchStatus =
  | "RESERVED"
  | "GENERATED"
  | "STORED"
  | "FINALIZED"
  | "CANCELLED";
export type FlyerStatus = "RESERVED" | "GENERATED" | "PRINTED" | "ACTIVATED" | "RETIRED";
export type CacheSyncStatus = "PENDING" | "WRITE_ACCEPTED" | "SYNCED" | "ERROR";

export interface Workspace {
  id: Id;
  name: string;
  slug: string;
  role: "OWNER";
}

export interface Campaign {
  id: Id;
  workspaceId: Id;
  name: string;
  description: string | null;
  destinationUrl: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface QrPlacement {
  id: Id;
  pageNumber: number;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shortTextEnabled: boolean;
  shortTextOffsetX: number | null;
  shortTextOffsetY: number | null;
}

export interface Template {
  id: Id;
  workspaceId: Id;
  campaignId: Id;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string;
  pageCount: number;
  width: number | null;
  height: number | null;
  status: TemplateStatus;
  placements: QrPlacement[];
  createdAt: string;
}

export interface ReservedFlyer {
  id: Id;
  shortcode: string;
  trackingUrl: string;
  sheetIndex: number;
  placementIndex: number;
}

export interface ReservedBatch {
  id: Id;
  workspaceId: Id;
  campaignId: Id;
  templateId: Id;
  sheetCount: number;
  physicalFlyerCount: number;
  trackingOrigin: string;
  storagePath: string;
  status: FlyerBatchStatus;
  flyers: ReservedFlyer[];
}

export interface FlyerBatch extends ReservedBatch {
  sha256: string | null;
  status: FlyerBatchStatus;
  cacheStatus: CacheSyncStatus;
}

export interface FlyerBatchSummary {
  id: Id;
  workspaceId: Id;
  campaignId: Id;
  templateId: Id;
  sheetCount: number;
  physicalFlyerCount: number;
  storagePath: string;
  fileSizeBytes: number | null;
  sha256: string | null;
  trackingOrigin: string;
  status: FlyerBatchStatus;
  createdAt: string;
  finalizedAt: string | null;
  cacheStatus: CacheSyncStatus;
}

export interface Flyer {
  id: Id;
  workspaceId: Id;
  campaignId: Id;
  templateId: Id;
  batchId: Id;
  shortcode: string;
  trackingUrl: string;
  sheetIndex: number;
  placementIndex: number;
  status: FlyerStatus;
  generatedAt: string | null;
  activatedAt: string | null;
  retiredAt: string | null;
  createdAt: string;
  activation: {
    id: Id;
    locationId: Id;
    locationName: string;
    source: "ADMIN_SCAN" | "MANUAL_ADMIN_ENTRY";
    createdAt: string;
  } | null;
}

export interface Location {
  id: Id;
  workspaceId: Id;
  campaignId: Id | null;
  name: string;
  description: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  archivedAt: string | null;
  activeFlyerCount: number;
}

export type CachedRedirect =
  | {
      version: number;
      status: "active";
      destinationUrl: string;
      workspaceId: Id;
      campaignId: Id;
      flyerId: Id;
      locationId: Id | null;
    }
  | { version: number; status: "disabled" };

export interface AnalyticsSummary {
  totalScans: number;
  uniqueIpDays: number;
  series: Array<{ date: string; scans: number }>;
  campaigns: Array<{ campaignId: Id; scans: number }>;
  locations: Array<{ locationId: Id | null; scans: number }>;
}

export function validateDestinationUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Die Ziel-URL muss mit http:// oder https:// beginnen.");
  }
  return url.toString();
}

export function normalizeSlug(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(normalized) ? normalized : null;
}
