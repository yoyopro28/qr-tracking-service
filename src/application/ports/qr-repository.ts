import type {
  AnalyticsSummary,
  Campaign,
  CampaignStatus,
  FlyerBatch,
  FlyerBatchSummary,
  Flyer,
  Location,
  ReservedBatch,
  Template,
  Workspace,
  QrPlacement,
} from "../../domain/models";

export interface UpdateCampaignInput {
  id?: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  destinationUrl: string;
  status?: CampaignStatus;
}

export interface ReserveBatchInput {
  workspaceId: string;
  campaignId: string;
  templateId: string;
  sheetCount: number;
  trackingOrigin: string;
}

export interface FinalizeBatchInput {
  batchId: string;
  storagePath: string;
  sha256: string;
  fileSizeBytes: number;
}

export interface QrRepository {
  listWorkspaces(): Promise<Workspace[]>;
  listCampaigns(workspaceId: string): Promise<Campaign[]>;
  getCampaign(workspaceId: string, campaignId: string): Promise<Campaign | null>;
  updateCampaign(input: UpdateCampaignInput): Promise<Campaign>;
  archiveCampaign(workspaceId: string, campaignId: string): Promise<void>;
  deleteCampaign(workspaceId: string, campaignId: string): Promise<void>;
  listTemplates(workspaceId: string, campaignId?: string): Promise<Template[]>;
  reserveTemplate(input: {
    workspaceId: string;
    campaignId: string;
    filename: string;
    mimeType: string;
    fileSizeBytes: number;
    sha256: string;
    pageCount: number;
    width: number;
    height: number;
    placements: Omit<QrPlacement, "id">[];
  }): Promise<{ id: string; storagePath: string }>;
  finalizeTemplate(templateId: string): Promise<void>;
  archiveTemplate(workspaceId: string, templateId: string): Promise<void>;
  reserveFlyerBatch(input: ReserveBatchInput): Promise<ReservedBatch>;
  getFlyerBatch(batchId: string): Promise<FlyerBatch>;
  listFlyerBatches(workspaceId: string, campaignId: string): Promise<FlyerBatchSummary[]>;
  listFlyers(workspaceId: string, campaignId: string): Promise<Flyer[]>;
  getFlyerByShortcode(workspaceId: string, shortcode: string): Promise<Flyer | null>;
  retireFlyer(workspaceId: string, flyerId: string): Promise<void>;
  deleteFlyer(workspaceId: string, flyerId: string): Promise<void>;
  finalizeFlyerBatch(input: FinalizeBatchInput): Promise<FlyerBatch>;
  listLocations(workspaceId: string): Promise<Location[]>;
  saveLocation(input: {
    id?: string;
    workspaceId: string;
    name: string;
    description?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string | null;
  }): Promise<Location>;
  setLocationArchived(workspaceId: string, locationId: string, archived: boolean): Promise<void>;
  deleteLocation(workspaceId: string, locationId: string): Promise<void>;
  activateFlyer(input: {
    workspaceId: string;
    shortcode: string;
    locationId?: string;
    newLocationName?: string;
    latitude?: number;
    longitude?: number;
    source?: "ADMIN_SCAN" | "MANUAL_ADMIN_ENTRY";
  }): Promise<void>;
  getAnalytics(workspaceId: string, from: string, to: string, campaignId?: string): Promise<AnalyticsSummary>;
}
