import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { AnalyticsSummary, Campaign, Location } from "../../domain/models";
import { ErrorBanner, LoadingState, Notice, PageHeader } from "../components/Page";
import { errorMessage, qrRepository } from "../services";

export function CampaignAnalyticsPage({ workspaceId }: { workspaceId: string }) {
  const { campaignId = "" } = useParams(); const [campaign, setCampaign] = useState<Campaign | null>(); const [summary, setSummary] = useState<AnalyticsSummary>(); const [locations, setLocations] = useState<Location[]>([]); const [error, setError] = useState("");
  useEffect(() => { const to = new Date(); const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - 29)); setError(""); void Promise.all([qrRepository.getCampaign(workspaceId, campaignId), qrRepository.getAnalytics(workspaceId, from.toISOString(), to.toISOString(), campaignId), qrRepository.listLocations(workspaceId)]).then(([value, analytics, locationValues]) => { setCampaign(value); setSummary(analytics); setLocations(locationValues); }).catch((cause) => setError(errorMessage(cause))); }, [campaignId, workspaceId]);
  if (campaign === undefined || !summary) return error ? <ErrorBanner message={error} /> : <LoadingState label="Kampagnen-Analytics werden geladen…" />;
  if (!campaign) return <ErrorBanner message="Kampagne wurde nicht gefunden." />;
  const locationNames = new Map(locations.map((location) => [location.id, location.name]));
  return <><PageHeader eyebrow="Campaign Performance" title={`Analytics · ${campaign.name}`} description="Die letzten 30 Tage, ausschließlich für diese Kampagne." actions={<Link className="button secondary" to={`/campaigns/${campaign.id}`}>Zur Kampagne</Link>} />{error && <ErrorBanner message={error} />}<section className="metric-grid"><article className="metric-card"><span>Scans</span><strong>{format(summary.totalScans)}</strong><small>Sampling-korrigiert</small></article><article className="metric-card"><span>Unique-IP-Tage</span><strong>{format(summary.uniqueIpDays)}</strong><small>Täglich rotierender Fingerprint</small></article><article className="metric-card"><span>Standorte</span><strong>{summary.locations.filter((item) => item.locationId && item.scans > 0).length}</strong><small>Mit Scans im Zeitraum</small></article></section><section className="panel section-block"><h2>Scans nach Standort</h2>{summary.locations.length === 0 ? <Notice>Noch keine Scans für diese Kampagne.</Notice> : <ol className="ranking">{summary.locations.map((item) => <li key={item.locationId ?? "none"}><div><strong>{item.locationId ? locationNames.get(item.locationId) ?? "Unbekannter Standort" : "Ohne Standort"}</strong><span>{format(item.scans)}</span></div></li>)}</ol>}</section></>;
}
function format(value: number) { return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value); }
