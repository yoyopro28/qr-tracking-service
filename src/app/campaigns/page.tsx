import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { createCampaignAction, deleteCampaignAction } from "@/app/campaigns/actions";
import { emptyCampaignActionState } from "@/app/campaigns/form-state";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { ConfirmDeleteForm } from "@/components/common/confirm-delete-form";
import { AppShell } from "@/components/layout/app-shell";
import { listWorkspaceCampaigns } from "@/domains/campaigns";
import { resolveDemoWorkspace } from "@/domains/workspaces";

type CampaignListPageProps = {
  searchParams: Promise<{
    deleted?: string;
    deleteFailed?: string;
  }>;
};

export default async function CampaignListPage({ searchParams }: CampaignListPageProps) {
  noStore();

  const query = await searchParams;
  const workspace = await resolveDemoWorkspace();
  const campaigns = await listWorkspaceCampaigns(workspace.id);
  const flashMessage = query.deleted
    ? "Campaign deleted."
    : query.deleteFailed
      ? "Campaign could not be deleted."
      : null;

  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Campaign Management</p>
        <h1>Campaigns</h1>
        <p className="lede">
          Create and manage campaigns inside the temporary demo workspace. This flow
          is intentionally auth-free for now and is designed to be replaced by real
          workspace resolution later.
        </p>
      </section>

      {flashMessage ? <p className="noticeBanner">{flashMessage}</p> : null}

      <div className="splitLayout">
        <CampaignForm
          action={createCampaignAction}
          initialState={emptyCampaignActionState}
          submitLabel="Create campaign"
          title="New campaign"
          description="Start with the MVP essentials: a name and the destination URL behind the QR redirect."
        />

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Workspace campaigns</h2>
              <p className="sectionCopy">
                Scoped to <strong>{workspace.name}</strong>.
              </p>
            </div>
            <span className="metricPill">
              {campaigns.length} {campaigns.length === 1 ? "campaign" : "campaigns"}
            </span>
          </div>

          {campaigns.length === 0 ? (
            <div className="emptyState">
              <h3>No campaigns yet</h3>
              <p>
                Create the first campaign to unlock template upload, flyer generation,
                and tracking work in later MVP steps.
              </p>
            </div>
          ) : (
            <div className="campaignList">
              {campaigns.map((campaign) => (
                <article key={campaign.id} className="campaignCard">
                  <div className="cardTopline">
                    <span className="statusBadge">{campaign.status.toLowerCase()}</span>
                    <span className="metaText">
                      Updated {campaign.updatedAt.toLocaleDateString()}
                    </span>
                  </div>
                  <h3>{campaign.name}</h3>
                  <p className="cardUrl">{campaign.destinationUrl}</p>
                  <div className="cardActions">
                    <Link className="textLink" href={`/campaigns/${campaign.id}`}>
                      Open details
                    </Link>
                    <ConfirmDeleteForm
                      action={deleteCampaignAction.bind(null, campaign.id)}
                      confirmMessage={`Delete campaign "${campaign.name}" and all related flyers, activations, and scans?`}
                      label="Delete campaign"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
