import type { AnalyticsSummary } from "../../domain/models";

export interface ScanAnalyticsEvent {
  workspaceId: string;
  campaignId: string;
  flyerId: string;
  locationId: string | null;
  country: string;
  httpStatus: number;
  userAgentCategory: string;
  dailyIpFingerprint: string;
}

export interface AnalyticsWriter {
  recordScan(event: ScanAnalyticsEvent): void;
}

export interface AnalyticsReader {
  querySummary(input: {
    workspaceId: string;
    from: string;
    to: string;
  }): Promise<AnalyticsSummary>;
}
