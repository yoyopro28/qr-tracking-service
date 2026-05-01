import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import {
  type CampaignActionState,
  updateCampaignAction,
} from "@/app/campaigns/actions";
import {
  deleteFlyerAction,
  generateFlyersAction,
} from "@/app/campaigns/[campaignId]/flyer-actions";
import { emptyFlyerGenerationActionState } from "@/app/campaigns/[campaignId]/flyer-form-state";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { FlyerGenerationForm } from "@/components/flyers/flyer-generation-form";
import { FlyerCard } from "@/components/flyers/flyer-card";
import { AppShell } from "@/components/layout/app-shell";
import { TemplateUploadForm } from "@/components/templates/template-upload-form";
import { getWorkspaceCampaignById } from "@/domains/campaigns";
import { getStoredTemplateQrPlacements } from "@/domains/templates";
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
    flyerDeleted?: string;
    flyerDeleteFailed?: string;
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
  const sheetShortcodesByStorageKey = new Map<string, string[]>();

  for (const flyer of campaign.flyers) {
    const sheetKey = flyer.generatedPdfStorageKey ?? flyer.id;
    const sheetShortcodes = sheetShortcodesByStorageKey.get(sheetKey) ?? [];

    sheetShortcodes.push(flyer.shortcode);
    sheetShortcodesByStorageKey.set(sheetKey, sheetShortcodes);
  }

  const flashMessage = query.created
    ? "Campaign created successfully."
    : query.updated
      ? "Campaign updated successfully."
      : query.templateCreated
        ? "Template uploaded successfully."
        : query.flyersGenerated
          ? "Flyers generated successfully."
          : query.flyerDeleted
            ? "Flyer deleted."
            : query.flyerDeleteFailed
              ? "Flyer could not be deleted."
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
                One PDF upload can contain one or more QR placeholders for print layouts.
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
              {campaign.templates.map((template) => {
                const qrPlacements = getStoredTemplateQrPlacements(template);

                return (
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
                      <dt>QR placeholders</dt>
                      <dd>
                        {qrPlacements.length > 0
                          ? `${qrPlacements.length} ${qrPlacements.length === 1 ? "area" : "areas"} on page ${qrPlacements[0].pageNumber}`
                          : "Not set"}
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
                  <div className="cardActions">
                    <a
                      className="textLink"
                      href={`/api/templates/${template.id}/document`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open template PDF
                    </a>
                    {qrPlacements.length > 0 ? (
                      <a
                        className="textLink"
                        href={`/api/templates/${template.id}/print-preview`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open print preview
                      </a>
                    ) : null}
                  </div>
                </article>
                );
              })}
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
                <FlyerCard
                  key={flyer.id}
                  flyer={flyer}
                  sheetShortcodes={
                    sheetShortcodesByStorageKey.get(flyer.generatedPdfStorageKey ?? flyer.id)
                  }
                  deleteAction={deleteFlyerAction.bind(null, campaign.id, flyer.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
