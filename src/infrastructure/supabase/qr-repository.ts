import type { QrRepository, ReserveBatchInput, UpdateCampaignInput } from "../../application/ports/qr-repository";
import type { Campaign, Flyer, FlyerBatch, FlyerBatchSummary, Location, ReservedBatch, Template, Workspace } from "../../domain/models";
import { validateDestinationUrl } from "../../domain/models";
import { supabase } from "./client";

type RecordValue = Record<string, unknown>;

function string(value: unknown) { return String(value ?? ""); }
function nullableString(value: unknown) { return value == null ? null : String(value); }
function number(value: unknown) { return Number(value); }
function object(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Supabase returned an invalid object");
  return value as RecordValue;
}

function mapReservedBatch(value: unknown): ReservedBatch {
  const row = object(value);
  if (!Array.isArray(row.flyers)) throw new Error("Supabase returned an invalid flyer batch");
  return {
    id: string(row.id), workspaceId: string(row.workspaceId), campaignId: string(row.campaignId), templateId: string(row.templateId),
    sheetCount: number(row.sheetCount), physicalFlyerCount: number(row.physicalFlyerCount), trackingOrigin: string(row.trackingOrigin),
    storagePath: string(row.storagePath), status: "RESERVED",
    flyers: row.flyers.map((value) => { const flyer = object(value); return { id: string(flyer.id), shortcode: string(flyer.shortcode), trackingUrl: string(flyer.trackingUrl), sheetIndex: number(flyer.sheetIndex), placementIndex: number(flyer.placementIndex) }; }),
  };
}

function mapFlyerBatch(value: unknown): FlyerBatch {
  const row = object(value);
  const reserved = mapReservedBatch({ ...row, flyers: row.flyers ?? [] });
  const status = string(row.status);
  const cacheStatus = string(row.cacheStatus);
  if (!(["RESERVED", "GENERATED", "STORED", "FINALIZED", "CANCELLED"] as string[]).includes(status)) throw new Error("Supabase returned an invalid batch status");
  if (!(["PENDING", "WRITE_ACCEPTED", "SYNCED", "ERROR"] as string[]).includes(cacheStatus)) throw new Error("Supabase returned an invalid cache status");
  return { ...reserved, status: status as FlyerBatch["status"], cacheStatus: cacheStatus as FlyerBatch["cacheStatus"], sha256: nullableString(row.sha256) };
}

function mapCampaign(row: RecordValue): Campaign {
  return {
    id: string(row.id), workspaceId: string(row.workspace_id), name: string(row.name),
    description: nullableString(row.description), destinationUrl: string(row.destination_url),
    status: string(row.status) as Campaign["status"], createdAt: string(row.created_at), updatedAt: string(row.updated_at),
  };
}

function mapLocation(row: RecordValue): Location {
  const activations = Array.isArray(row.activations) ? row.activations as RecordValue[] : [];
  return {
    id: string(row.id), workspaceId: string(row.workspace_id), campaignId: nullableString(row.campaign_id),
    name: string(row.name), description: nullableString(row.description), addressLine1: nullableString(row.address_line_1),
    addressLine2: nullableString(row.address_line_2), postalCode: nullableString(row.postal_code),
    city: nullableString(row.city), country: nullableString(row.country),
    latitude: row.latitude == null ? null : number(row.latitude), longitude: row.longitude == null ? null : number(row.longitude),
    notes: nullableString(row.notes), archivedAt: nullableString(row.archived_at),
    activeFlyerCount: activations.filter((activation) => activation.ended_at == null).length,
  };
}

function mapFlyer(row: RecordValue): Flyer {
  const activations = Array.isArray(row.activations) ? row.activations as RecordValue[] : [];
  const current = activations.find((activation) => activation.ended_at == null);
  const locationValue = current?.locations;
  const location = locationValue && typeof locationValue === "object" && !Array.isArray(locationValue) ? locationValue as RecordValue : null;
  return {
    id: string(row.id), workspaceId: string(row.workspace_id), campaignId: string(row.campaign_id),
    templateId: string(row.template_id), batchId: string(row.batch_id), shortcode: string(row.shortcode),
    trackingUrl: string(row.tracking_url), sheetIndex: number(row.sheet_index), placementIndex: number(row.placement_index),
    status: string(row.status) as Flyer["status"], generatedAt: nullableString(row.generated_at),
    activatedAt: nullableString(row.activated_at), retiredAt: nullableString(row.retired_at), createdAt: string(row.created_at),
    activation: current ? {
      id: string(current.id), locationId: string(current.location_id), locationName: string(location?.name),
      source: string(current.source) as "ADMIN_SCAN" | "MANUAL_ADMIN_ENTRY",
      createdAt: string(current.created_at),
    } : null,
  };
}

export class SupabaseQrRepository implements QrRepository {
  async listWorkspaces(): Promise<Workspace[]> {
    const { data, error } = await supabase.from("workspace_members").select("role, workspaces(id,name,slug)");
    if (error) throw error;
    return (data ?? []).flatMap((row) => {
      const workspace = row.workspaces as unknown as RecordValue | null;
      return workspace ? [{ id: string(workspace.id), name: string(workspace.name), slug: string(workspace.slug), role: "OWNER" as const }] : [];
    });
  }

  async listCampaigns(workspaceId: string): Promise<Campaign[]> {
    const { data, error } = await supabase.from("campaigns").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapCampaign(row));
  }

  async getCampaign(workspaceId: string, campaignId: string): Promise<Campaign | null> {
    const { data, error } = await supabase.from("campaigns").select("*").eq("workspace_id", workspaceId).eq("id", campaignId).maybeSingle();
    if (error) throw error;
    return data ? mapCampaign(data) : null;
  }

  async updateCampaign(input: UpdateCampaignInput): Promise<Campaign> {
    const values = {
      workspace_id: input.workspaceId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      destination_url: validateDestinationUrl(input.destinationUrl),
      ...(input.status ? { status: input.status } : {}),
    };
    const query = input.id
      ? supabase.from("campaigns").update(values).eq("id", input.id).eq("workspace_id", input.workspaceId)
      : supabase.from("campaigns").insert(values);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return mapCampaign(data);
  }

  async archiveCampaign(workspaceId: string, campaignId: string) {
    const { error } = await supabase.from("campaigns").update({ status: "ARCHIVED" }).eq("id", campaignId).eq("workspace_id", workspaceId);
    if (error) throw error;
  }

  async listTemplates(workspaceId: string, campaignId?: string): Promise<Template[]> {
    let query = supabase.from("templates").select("*, template_qr_placements(*)").eq("workspace_id", workspaceId).eq("status", "READY");
    if (campaignId) query = query.eq("campaign_id", campaignId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: string(row.id), workspaceId: string(row.workspace_id), campaignId: string(row.campaign_id),
      storagePath: string(row.storage_path), originalFilename: string(row.original_filename),
      mimeType: string(row.mime_type), fileSizeBytes: number(row.file_size_bytes), sha256: string(row.sha256),
      pageCount: number(row.page_count), width: row.width == null ? null : number(row.width),
      height: row.height == null ? null : number(row.height), status: string(row.status) as Template["status"],
      createdAt: string(row.created_at),
      placements: ((row.template_qr_placements ?? []) as RecordValue[]).map((placement) => ({
        id: string(placement.id), pageNumber: number(placement.page_number), order: number(placement.placement_order),
        x: number(placement.x), y: number(placement.y), width: number(placement.width), height: number(placement.height),
        shortTextEnabled: Boolean(placement.short_text_enabled),
        shortTextOffsetX: placement.short_text_offset_x == null ? null : number(placement.short_text_offset_x),
        shortTextOffsetY: placement.short_text_offset_y == null ? null : number(placement.short_text_offset_y),
      })).sort((a, b) => a.order - b.order),
    }));
  }

  async reserveTemplate(input: Parameters<QrRepository["reserveTemplate"]>[0]) {
    const { data, error } = await supabase.rpc("reserve_template", {
      p_workspace_id: input.workspaceId, p_campaign_id: input.campaignId,
      p_filename: input.filename, p_mime_type: input.mimeType, p_file_size_bytes: input.fileSizeBytes,
      p_sha256: input.sha256, p_page_count: input.pageCount, p_width: input.width, p_height: input.height,
      p_placements: input.placements,
    });
    if (error) throw error;
    return data as { id: string; storagePath: string };
  }

  async finalizeTemplate(templateId: string) {
    const { error } = await supabase.rpc("finalize_template", { p_template_id: templateId });
    if (error) throw error;
  }

  async archiveTemplate(workspaceId: string, templateId: string) {
    const { error } = await supabase.rpc("archive_template", { p_workspace_id: workspaceId, p_template_id: templateId });
    if (error) throw error;
  }

  async reserveFlyerBatch(input: ReserveBatchInput): Promise<ReservedBatch> {
    const { data, error } = await supabase.rpc("reserve_flyer_batch", {
      p_workspace_id: input.workspaceId, p_campaign_id: input.campaignId, p_template_id: input.templateId,
      p_sheet_count: input.sheetCount, p_tracking_origin: input.trackingOrigin,
    });
    if (error) throw error;
    return mapReservedBatch(data);
  }

  async getFlyerBatch(batchId: string): Promise<FlyerBatch> {
    const { data, error } = await supabase.rpc("get_flyer_batch", { p_batch_id: batchId });
    if (error) throw error;
    return mapFlyerBatch(data);
  }

  async listFlyerBatches(workspaceId: string, campaignId: string): Promise<FlyerBatchSummary[]> {
    const { data, error } = await supabase.rpc("get_campaign_flyer_batches", { p_workspace_id: workspaceId, p_campaign_id: campaignId });
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Supabase returned invalid batch summaries");
    return data.map((value) => {
      const row = object(value);
      return {
        id: string(row.id), workspaceId: string(row.workspaceId), campaignId: string(row.campaignId), templateId: string(row.templateId),
        sheetCount: number(row.sheetCount), physicalFlyerCount: number(row.physicalFlyerCount), storagePath: string(row.storagePath),
        fileSizeBytes: row.fileSizeBytes == null ? null : number(row.fileSizeBytes), sha256: nullableString(row.sha256), trackingOrigin: string(row.trackingOrigin),
        status: string(row.status) as FlyerBatchSummary["status"], createdAt: string(row.createdAt), finalizedAt: nullableString(row.finalizedAt),
        cacheStatus: string(row.cacheStatus) as FlyerBatchSummary["cacheStatus"],
      };
    });
  }

  async listFlyers(workspaceId: string, campaignId: string): Promise<Flyer[]> {
    const { data, error } = await supabase.from("flyers").select("*, activations(id,location_id,source,created_at,ended_at,locations(name))").eq("workspace_id", workspaceId).eq("campaign_id", campaignId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapFlyer(row as unknown as RecordValue));
  }

  async getFlyerByShortcode(workspaceId: string, shortcode: string): Promise<Flyer | null> {
    const { data, error } = await supabase.from("flyers").select("*, activations(id,location_id,source,created_at,ended_at,locations(name))").eq("workspace_id", workspaceId).eq("shortcode", shortcode.trim().toUpperCase()).maybeSingle();
    if (error) throw error;
    return data ? mapFlyer(data as unknown as RecordValue) : null;
  }

  async retireFlyer(workspaceId: string, flyerId: string) {
    const { error } = await supabase.rpc("retire_flyer", { p_workspace_id: workspaceId, p_flyer_id: flyerId });
    if (error) throw error;
  }

  async finalizeFlyerBatch(input: Parameters<QrRepository["finalizeFlyerBatch"]>[0]): Promise<FlyerBatch> {
    const { data, error } = await supabase.functions.invoke("finalize-flyer-batch", { body: input });
    if (error) throw error;
    return data as FlyerBatch;
  }

  async listLocations(workspaceId: string): Promise<Location[]> {
    const { data, error } = await supabase.from("locations").select("*, activations(id,ended_at)").eq("workspace_id", workspaceId).order("name");
    if (error) throw error;
    return (data ?? []).map((row) => mapLocation(row as unknown as RecordValue));
  }

  async saveLocation(input: Parameters<QrRepository["saveLocation"]>[0]): Promise<Location> {
    const values = { workspace_id: input.workspaceId, name: input.name.trim(), description: input.description?.trim() || null, address_line_1: input.addressLine1?.trim() || null, address_line_2: input.addressLine2?.trim() || null, postal_code: input.postalCode?.trim() || null, city: input.city?.trim() || null, country: input.country?.trim() || null, latitude: input.latitude ?? null, longitude: input.longitude ?? null, notes: input.notes?.trim() || null };
    const query = input.id ? supabase.from("locations").update(values).eq("id", input.id).eq("workspace_id", input.workspaceId) : supabase.from("locations").insert(values);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return mapLocation(data as unknown as RecordValue);
  }

  async setLocationArchived(workspaceId: string, locationId: string, archived: boolean) {
    const { error } = await supabase.from("locations").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", locationId).eq("workspace_id", workspaceId);
    if (error) throw error;
  }

  async deleteLocation(workspaceId: string, locationId: string) {
    const { error } = await supabase.rpc("delete_unused_location", { p_workspace_id: workspaceId, p_location_id: locationId });
    if (error) throw error;
  }

  async activateFlyer(input: Parameters<QrRepository["activateFlyer"]>[0]) {
    const { error } = await supabase.rpc("activate_flyer", {
      p_workspace_id: input.workspaceId, p_shortcode: input.shortcode.trim().toUpperCase(),
      p_location_id: input.locationId, p_new_location_name: input.newLocationName,
      p_latitude: input.latitude, p_longitude: input.longitude,
      p_source: input.source ?? "MANUAL_ADMIN_ENTRY",
    });
    if (error) throw error;
  }

  async getAnalytics(workspaceId: string, from: string, to: string) {
    const { data, error } = await supabase.functions.invoke("analytics-query", { body: { workspaceId, from, to } });
    if (error) throw error;
    return data;
  }
}
