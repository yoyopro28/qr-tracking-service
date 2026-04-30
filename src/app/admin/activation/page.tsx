import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { activateFlyerAction } from "@/app/admin/activation/actions";
import { emptyActivationActionState } from "@/app/admin/activation/form-state";
import { FlyerActivationForm } from "@/components/activations/flyer-activation-form";
import { ShortcodeLookupForm } from "@/components/activations/shortcode-lookup-form";
import { AppShell } from "@/components/layout/app-shell";
import {
  getFlyerForActivationByShortcode,
  listWorkspaceLocationsForCampaign,
  normalizeActivationInputSource,
  normalizeShortcode,
} from "@/domains/activations";
import { resolveDemoWorkspace } from "@/domains/workspaces";

type ActivationPageProps = {
  searchParams: Promise<{
    shortcode?: string;
    activated?: string;
    source?: string;
  }>;
};

export default async function AdminActivationPage({ searchParams }: ActivationPageProps) {
  noStore();

  const query = await searchParams;
  const rawShortcode = query.shortcode ?? "";
  const shortcode = normalizeShortcode(rawShortcode);
  const activationSource = normalizeActivationInputSource(query.source ?? "");

  const workspace = await resolveDemoWorkspace();
  const flyer = shortcode
    ? await getFlyerForActivationByShortcode(workspace.id, shortcode)
    : null;
  const locations = flyer
    ? await listWorkspaceLocationsForCampaign(workspace.id, flyer.campaign.id)
    : [];

  const activationAction = flyer
    ? activateFlyerAction.bind(null, flyer.shortcode)
    : undefined;
  const flashMessage = query.activated ? "Flyer activated successfully." : null;
  const latestActivation = flyer?.activations[0] ?? null;
  const isAlreadyActivated = flyer?.status === "ACTIVATED";
  const activationInitialState = {
    values: {
      ...emptyActivationActionState.values,
      source: activationSource,
    },
  };

  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Admin Activation</p>
        <h1>Activate flyers</h1>
        <p className="lede">
          This page is reserved for admin scans and maintenance. Public redirect
          tracking remains a separate workflow.
        </p>
        <div className="heroActions">
          <Link className="button" href="/admin/activation/scan">
            Open camera scanner
          </Link>
        </div>
      </section>

      {flashMessage ? <p className="noticeBanner">{flashMessage}</p> : null}

      <div className="splitLayout">
        <ShortcodeLookupForm initialShortcode={shortcode} />

        <section className="panel">
          <div className="sectionHeader">
            <div>
              <h2>Scan status</h2>
              <p className="sectionCopy">
                Resolve a shortcode first, then assign the location immediately after.
              </p>
            </div>
          </div>

          {!shortcode ? (
            <div className="emptyState">
              <h3>No flyer scanned yet</h3>
              <p>Enter or scan a shortcode to open the activation step.</p>
            </div>
          ) : !flyer ? (
            <div className="errorState">
              <h1>Shortcode not found</h1>
              <p className="sectionCopy">
                No flyer in the demo workspace matches <strong>{shortcode}</strong>.
              </p>
            </div>
          ) : (
            <div className="campaignCard">
              <div className="cardTopline">
                <span className="statusBadge">{flyer.status.toLowerCase()}</span>
                <span className="metaText">{flyer.campaign.name}</span>
              </div>
              <h3>{flyer.shortcode}</h3>
              <dl className="miniDetailList">
                <div>
                  <dt>Template</dt>
                  <dd>{flyer.template.originalFilename}</dd>
                </div>
                <div>
                  <dt>Tracking URL</dt>
                  <dd className="breakValue">{flyer.trackingUrl}</dd>
                </div>
                {latestActivation ? (
                  <div>
                    <dt>Latest activation</dt>
                    <dd>
                      {latestActivation.location.name} on{" "}
                      {latestActivation.createdAt.toLocaleString()}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          )}
        </section>
      </div>

      {flyer ? (
        <div className="splitLayout">
          <FlyerActivationForm
            action={activationAction!}
            initialState={activationInitialState}
            locations={locations}
            disabled={isAlreadyActivated}
          />

          <section className="panel">
            <div className="sectionHeader">
              <div>
                <h2>Activation guidance</h2>
                <p className="sectionCopy">
                  Choose a location right after the scan so attribution is tied to the
                  physical placement step.
                </p>
              </div>
            </div>

            {isAlreadyActivated ? (
              <div className="emptyState">
                <h3>Flyer already activated</h3>
                <p>
                  This flyer is already linked to{" "}
                  <strong>{latestActivation?.location.name ?? "a location"}</strong>.
                </p>
              </div>
            ) : (
              <div className="emptyState">
                <h3>Location comes next</h3>
                <p>
                  Select an existing location or create a new one. The system will then
                  store the activation event and move the flyer into the activated state.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
