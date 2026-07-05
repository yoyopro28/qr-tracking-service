import { unstable_noStore as noStore } from "next/cache";
import {
  archiveLocationAction,
  deleteLocationAction,
  restoreLocationAction,
  updateLocationCoordinatesAction,
} from "@/app/admin/locations/actions";
import { ConfirmActionForm } from "@/components/common/confirm-action-form";
import { LocationCoordinateForm } from "@/components/locations/location-coordinate-form";
import { AppShell } from "@/components/layout/app-shell";
import { listWorkspaceLocations } from "@/domains/locations";
import { resolveDemoWorkspace } from "@/domains/workspaces";

type AdminLocationsPageProps = {
  searchParams: Promise<{
    archived?: string;
    deleted?: string;
    restored?: string;
    deleteBlocked?: string;
    operationFailed?: string;
  }>;
};

export default async function AdminLocationsPage({ searchParams }: AdminLocationsPageProps) {
  noStore();

  const query = await searchParams;
  const workspace = await resolveDemoWorkspace();
  const locations = await listWorkspaceLocations(workspace.id);
  const flashMessage = query.deleted
    ? "Unused location deleted permanently."
    : query.archived
      ? "Location archived. Historical analytics remain intact."
      : query.restored
        ? "Location restored and available for activation again."
        : query.deleteBlocked
          ? "This location is already in use and cannot be deleted. Archive it instead."
          : query.operationFailed
            ? "The location operation could not be completed."
            : null;

  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Location management</p>
        <h1>Map your locations</h1>
        <p className="lede">
          Add provider-independent coordinates to existing activation locations. The
          analytics map uses these positions without collecting visitor GPS data.
        </p>
      </section>

      {flashMessage ? <p className="noticeBanner">{flashMessage}</p> : null}

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <h2>Workspace locations</h2>
            <p className="sectionCopy">
              Capture the position on site or enter latitude and longitude manually.
            </p>
          </div>
        </div>

        {locations.length === 0 ? (
          <div className="emptyState">
            <h3>No locations yet</h3>
            <p>Locations are created during flyer activation.</p>
          </div>
        ) : (
          <div className="locationManagementGrid">
            {locations.map((location) => {
              const action = updateLocationCoordinatesAction.bind(null, location.id);
              const subtitle = [location.city, location.country].filter(Boolean).join(", ");

              return (
                <article key={location.id} className="locationManagementCard">
                  <div className="cardTopline">
                    <span className="statusBadge">
                      {location.archivedAt
                        ? "Archived"
                        : location.latitude !== null
                          ? "Mapped"
                          : "Not mapped"}
                    </span>
                    <span className="metaText">
                      {location.campaign?.name ?? "Shared location"}
                    </span>
                  </div>
                  <h3>{location.name}</h3>
                  {subtitle ? <p className="metaText">{subtitle}</p> : null}
                  <p className="locationUsage">
                    {location._count.scanEvents} scans · {location._count.activations} activations
                  </p>

                  <LocationCoordinateForm
                    action={action}
                    initialState={{
                      values: {
                        latitude: location.latitude?.toString() ?? "",
                        longitude: location.longitude?.toString() ?? "",
                      },
                    }}
                  />

                  <div className="locationCardActions">
                    {location.archivedAt ? (
                      <ConfirmActionForm
                        action={restoreLocationAction.bind(null, location.id)}
                        confirmMessage={`Restore location "${location.name}" for future activations?`}
                        label="Restore location"
                        pendingLabel="Restoring..."
                      />
                    ) : location._count.activations === 0 && location._count.scanEvents === 0 ? (
                      <ConfirmActionForm
                        action={deleteLocationAction.bind(null, location.id)}
                        confirmMessage={`Delete unused location "${location.name}" permanently?`}
                        label="Delete location"
                        pendingLabel="Deleting..."
                        danger
                      />
                    ) : (
                      <ConfirmActionForm
                        action={archiveLocationAction.bind(null, location.id)}
                        confirmMessage={`Archive location "${location.name}"? Existing scan analytics will be preserved.`}
                        label="Archive location"
                        pendingLabel="Archiving..."
                        danger
                      />
                    )}
                    {!location.archivedAt &&
                    (location._count.activations > 0 || location._count.scanEvents > 0) ? (
                      <span className="fieldHint">Used locations are archived, not deleted.</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
