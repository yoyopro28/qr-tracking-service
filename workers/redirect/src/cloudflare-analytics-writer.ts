export interface ScanEvent {
  workspaceId: string; campaignId: string; flyerId: string; locationId: string | null;
  country: string; httpStatus: number; userAgentCategory: string; dailyIpFingerprint: string;
}

export class CloudflareAnalyticsWriter {
  constructor(private readonly dataset: AnalyticsEngineDataset) {}
  recordScan(event: ScanEvent) {
    this.dataset.writeDataPoint({
      indexes: [event.workspaceId],
      blobs: [event.workspaceId, event.campaignId, event.flyerId, event.locationId ?? "", event.country, String(event.httpStatus), event.userAgentCategory, event.dailyIpFingerprint],
      doubles: [1],
    });
  }
}
