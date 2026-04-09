import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import {
  type CampaignActionState,
  updateCampaignAction,
} from "@/app/campaigns/actions";
import { generateFlyersAction } from "@/app/campaigns/[campaignId]/flyer-actions";
import { emptyFlyerGenerationActionState } from "@/app/campaigns/[campaignId]/flyer-form-state";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { FlyerGenerationForm } from "@/components/flyers/flyer-generation-form";
import { AppShell } from "@/components/layout/app-shell";
import { TemplateUploadForm } from "@/components/templates/template-upload-form";
import { getWorkspaceCampaignById } from "@/domains/campaigns";
import { resolveDemoWorkspace } from "@/domains/workspaces";
import { createTemplateAction } from "@/app/campaigns/[campaignId]/template-actions";
import { emptyTemplateActionState } from "@/app/campaigns/[campaignId]/template-form-state";

type CampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    templateCreated?: string;
    flyersGenerated?: string;
  }>;
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: CampaignDetailPageProps) {
  noStore();

  const { campaignId } = await params;
  const query = await searchParams;
  const workspace = await resolveDemoWorkspace();
  const campaign = await getWorkspaceCampaignById(workspace.id, campaignId);

  if (!campaign) {
    notFound();
  }

  const initialState: CampaignActionState = {
    values: {
      name: campaign.name,
      destinationUrl: campaign.destinationUrl,
    },
  };

  const updateAction = updateCampaignAction.bind(null, campaign.id);
  const templateAction = createTemplateAction.bind(null, campaign.id);
  const flyerAction = generateFlyersAction.bind(null, campaign.id);
  const flashMessage = query.created
    ? "Campaign created successfully."
    : query.updated
      ? "Campaign updated successfully."
      : query.templateCreated
        ? "Template uploaded successfully."
        : query.flyersGenerated
          ? "Flyers generated successfully."
      : null;

  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Campaign Detail</p>
        <h1>{campaign.name}</h1>
        <p className="lede">
          View the stored campaign record and update the fields the MVP uses today.
        </p>
      </section>

      {flashMessage ? <p className="noticeBanner">{flashMessage}</p> : null}

      <div className="splitLayout">
        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Overview</h2>
              <p className="sectionCopy">
                Stored in <strong>{workspace.name}</strong>.
              </p>
            </div>
            <span className="statusBadge">{campaign.status.toLowerCase()}</span>
          </div>

          <dl className="detailList">
            <div>
              <dt>Campaign ID</dt>
              <dd>{campaign.id}</dd>
            </div>
            <div>
              <dt>Target URL</dt>
              <dd className="breakValue">{campaign.destinationUrl}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{campaign.createdAt.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{campaign.updatedAt.toLocaleString()}</dd>
            </div>
          </dl>

          <Link className="textLink" href="/campaigns">
            Back to campaign list
          </Link>
        </section>

        <CampaignForm
          action={updateAction}
          initialState={initialState}
          submitLabel="Save changes"
          title="Edit campaign"
          description="Update the campaign name and target URL. Status and advanced campaign behavior stay unchanged in this MVP slice."
        />
      </div>

      <div className="splitLayout">
        <TemplateUploadForm
          action={templateAction}
          initialState={emptyTemplateActionState}
        />

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Templates</h2>
              <p className="sectionCopy">
                One PDF upload with one QR placement definition per template for this MVP.
              </p>
            </div>
            <span className="metricPill">
              {campaign.templates.length}{" "}
              {campaign.templates.length === 1 ? "template" : "templates"}
            </span>
          </div>

          {campaign.templates.length === 0 ? (
            <div className="emptyState">
              <h3>No templates yet</h3>
              <p>
                Upload the first PDF template to attach printable source material and
                store QR placement coordinates for later flyer generation.
              </p>
            </div>
          ) : (
            <div className="campaignList">
              {campaign.templates.map((template) => (
                <article key={template.id} className="campaignCard">
                  <div className="cardTopline">
                    <span className="statusBadge">pdf template</span>
                    <span className="metaText">
                      Added {template.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <h3>{template.originalFilename}</h3>
                  <dl className="miniDetailList">
                    <div>
                      <dt>Storage key</dt>
                      <dd className="breakValue">{template.storageKey}</dd>
                    </div>
                    <div>
                      <dt>Pages</dt>
                      <dd>{template.pageCount}</dd>
                    </div>
                    <div>
                      <dt>QR placement</dt>
                      <dd>
                        Page {template.qrPageNumber ?? "?"}, x {template.qrX?.toString() ?? "-"},
                        y {template.qrY?.toString() ?? "-"}, w {template.qrWidth?.toString() ?? "-"},
                        h {template.qrHeight?.toString() ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt>Short text</dt>
                      <dd>
                        {template.shortTextEnabled
                          ? `Enabled (${template.shortTextOffsetX?.toString() ?? "0"}, ${template.shortTextOffsetY?.toString() ?? "0"})`
                          : "Disabled"}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="splitLayout">
        <FlyerGenerationForm
          action={flyerAction}
          initialState={emptyFlyerGenerationActionState}
          templates={campaign.templates.map((template) => ({
            id: template.id,
            originalFilename: template.originalFilename,
          }))}
        />

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Generated flyers</h2>
              <p className="sectionCopy">
                Flyer records are stored now. QR embedding, printable PDFs, and
                activation are still separate MVP steps.
              </p>
            </div>
            <span className="metricPill">
              {campaign.flyers.length} {campaign.flyers.length === 1 ? "flyer" : "flyers"}
            </span>
          </div>

          {campaign.flyers.length === 0 ? (
            <div className="emptyState">
              <h3>No flyers yet</h3>
              <p>
                Generate the first batch to create stable shortcodes and tracking URLs
                for this campaign.
              </p>
            </div>
          ) : (
            <div className="campaignList">
              {campaign.flyers.map((flyer) => (
                <article key={flyer.id} className="campaignCard">
                  <div className="cardTopline">
                    <span className="statusBadge">{flyer.status.toLowerCase()}</span>
                    <span className="metaText">
                      {flyer.template.originalFilename}
                    </span>
                  </div>
                  <h3>{flyer.shortcode}</h3>
                  <dl className="miniDetailList">
                    <div>
                      <dt>Tracking URL</dt>
                      <dd className="breakValue">{flyer.trackingUrl}</dd>
                    </div>
                    <div>
                      <dt>Generated</dt>
                      <dd>{(flyer.generatedAt ?? flyer.createdAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Flyer ID</dt>
                      <dd className="breakValue">{flyer.id}</dd>
                    </div>
                    <div>
                      <dt>Activation</dt>
                      <dd>
                        <Link
                          className="textLink"
                          href={`/admin/activation?shortcode=${encodeURIComponent(flyer.shortcode)}`}
                        >
                          Open admin activation
                        </Link>
                      </dd>
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
