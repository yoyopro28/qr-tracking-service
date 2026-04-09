import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AppShell } from "@/components/layout/app-shell";
import { getWorkspaceAnalytics } from "@/domains/analytics";
import { resolveDemoWorkspace } from "@/domains/workspaces";

export default async function AnalyticsPage() {
  noStore();

  const workspace = await resolveDemoWorkspace();
  const analytics = await getWorkspaceAnalytics(workspace.id);

  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Analytics</p>
        <h1>Scan dashboard</h1>
        <p className="lede">
          Basic internal analytics for the demo workspace. This MVP view focuses on
          practical counts, attribution, and recent activity rather than advanced
          modeling.
        </p>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <h2>Workspace summary</h2>
            <p className="sectionCopy">
              Metrics for <strong>{workspace.name}</strong>.
            </p>
          </div>
        </div>

        <div className="metricGrid">
          <article className="metricCard">
            <span className="metricLabel">Total scans</span>
            <strong>{analytics.summary.totalScans}</strong>
          </article>
          <article className="metricCard">
            <span className="metricLabel">Campaigns</span>
            <strong>{analytics.summary.totalCampaigns}</strong>
          </article>
          <article className="metricCard">
            <span className="metricLabel">Generated flyers</span>
            <strong>{analytics.summary.totalFlyers}</strong>
          </article>
          <article className="metricCard">
            <span className="metricLabel">Activated flyers</span>
            <strong>{analytics.summary.totalActivatedFlyers}</strong>
          </article>
        </div>
      </section>

      <div className="splitLayout">
        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Scans by campaign</h2>
              <p className="sectionCopy">Basic campaign-level scan and flyer counts.</p>
            </div>
          </div>

          {analytics.campaignStats.length === 0 ? (
            <div className="emptyState">
              <h3>No campaigns yet</h3>
              <p>Create a campaign and drive a few scans to populate the dashboard.</p>
            </div>
          ) : (
            <div className="campaignList">
              {analytics.campaignStats.map((campaign) => (
                <article key={campaign.id} className="campaignCard">
                  <div className="cardTopline">
                    <span className="statusBadge">{campaign.scanCount} scans</span>
                    <Link className="textLink" href={`/campaigns/${campaign.id}`}>
                      Open campaign
                    </Link>
                  </div>
                  <h3>{campaign.name}</h3>
                  <dl className="miniDetailList">
                    <div>
                      <dt>Flyers</dt>
                      <dd>{campaign.flyerCount}</dd>
                    </div>
                    <div>
                      <dt>Scans</dt>
                      <dd>{campaign.scanCount}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Top flyers</h2>
              <p className="sectionCopy">The flyers with the most recorded scans so far.</p>
            </div>
          </div>

          {analytics.topFlyers.length === 0 ? (
            <div className="emptyState">
              <h3>No scans yet</h3>
              <p>Open a generated flyer’s tracking URL to create the first scan events.</p>
            </div>
          ) : (
            <div className="campaignList">
              {analytics.topFlyers.map((flyer) => (
                <article key={flyer.flyerId} className="campaignCard">
                  <div className="cardTopline">
                    <span className="statusBadge">{flyer.scanCount} scans</span>
                    <span className="metaText">{flyer.campaignName}</span>
                  </div>
                  <h3>{flyer.shortcode}</h3>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="splitLayout">
        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Top locations</h2>
              <p className="sectionCopy">
                Scan attribution based on the latest flyer activation at scan time.
              </p>
            </div>
          </div>

          {analytics.topLocations.length === 0 ? (
            <div className="emptyState">
              <h3>No location scans yet</h3>
              <p>Activate flyers and open their tracking URLs to build location stats.</p>
            </div>
          ) : (
            <div className="campaignList">
              {analytics.topLocations.map((location) => (
                <article key={location.locationId ?? location.name} className="campaignCard">
                  <div className="cardTopline">
                    <span className="statusBadge">{location.scanCount} scans</span>
                    <span className="metaText">{location.campaignName ?? "Shared location"}</span>
                  </div>
                  <h3>{location.name}</h3>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Recent scan events</h2>
              <p className="sectionCopy">A plain event feed for quick manual verification.</p>
            </div>
          </div>

          {analytics.recentScanEvents.length === 0 ? (
            <div className="emptyState">
              <h3>No recent events</h3>
              <p>Recent scan activity will show up here once people hit flyer links.</p>
            </div>
          ) : (
            <div className="campaignList">
              {analytics.recentScanEvents.map((event) => (
                <article key={event.id} className="campaignCard">
                  <div className="cardTopline">
                    <span className="statusBadge">{event.flyer.shortcode}</span>
                    <span className="metaText">{event.occurredAt.toLocaleString()}</span>
                  </div>
                  <h3>{event.campaign.name}</h3>
                  <dl className="miniDetailList">
                    <div>
                      <dt>Location</dt>
                      <dd>{event.location?.name ?? "Unassigned"}</dd>
                    </div>
                    <div>
                      <dt>Referer</dt>
                      <dd className="breakValue">{event.referer ?? "Direct / unknown"}</dd>
                    </div>
                    <div>
                      <dt>User agent</dt>
                      <dd className="breakValue">{event.userAgent ?? "Unavailable"}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
