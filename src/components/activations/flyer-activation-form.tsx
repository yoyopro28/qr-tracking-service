"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActivationActionState } from "@/app/admin/activation/actions";
import { LocationCoordinateFields } from "@/components/locations/location-coordinate-fields";

type FlyerActivationFormProps = {
  action: (
    state: ActivationActionState,
    formData: FormData,
  ) => Promise<ActivationActionState>;
  initialState: ActivationActionState;
  locations: Array<{
    id: string;
    name: string;
    campaignId: string | null;
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
  disabled?: boolean;
};

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? "Activating..." : "Activate flyer"}
    </button>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p id={id} className="fieldError">
      {errors[0]}
    </p>
  );
}

function locationLabel(location: FlyerActivationFormProps["locations"][number]) {
  const suffix = [location.city, location.country].filter(Boolean).join(", ");
  const scope = location.campaignId ? "campaign" : "shared";

  const mapping = location.latitude !== null && location.longitude !== null ? ", mapped" : "";

  return suffix
    ? `${location.name} (${suffix}) [${scope}${mapping}]`
    : `${location.name} [${scope}${mapping}]`;
}

export function FlyerActivationForm({
  action,
  initialState,
  locations,
  disabled = false,
}: FlyerActivationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [selectedLocationId, setSelectedLocationId] = useState(state.values.locationId);

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Choose location</h2>
          <p className="sectionCopy">
            Right after the scan, assign this flyer to an existing location or create a
            new one for this campaign.
          </p>
        </div>
      </div>

      <form action={formAction} className="stackForm">
        <input type="hidden" name="source" value={state.values.source} />

        <label className="field">
          <span className="fieldLabel">Existing location</span>
          <select
            className="input"
            name="locationId"
            value={selectedLocationId}
            onChange={(event) => setSelectedLocationId(event.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(state.fieldErrors?.locationId)}
            aria-describedby={
              state.fieldErrors?.locationId ? "activation-location-error" : undefined
            }
          >
            <option value="">Create a new location instead</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {locationLabel(location)}
              </option>
            ))}
          </select>
          <FieldError id="activation-location-error" errors={state.fieldErrors?.locationId} />
        </label>

        <div className="orDivider">or</div>

        <label className="field">
          <span className="fieldLabel">New location name</span>
          <input
            className="input"
            type="text"
            name="newLocationName"
            defaultValue={state.values.newLocationName}
            placeholder="Cafe Central noticeboard"
            disabled={disabled}
            aria-invalid={Boolean(state.fieldErrors?.newLocationName)}
            aria-describedby={
              state.fieldErrors?.newLocationName ? "activation-new-location-error" : undefined
            }
          />
          <FieldError
            id="activation-new-location-error"
            errors={state.fieldErrors?.newLocationName}
          />
        </label>

        <div className="field">
          <span className="fieldLabel">Map position for the new location (optional)</span>
          <LocationCoordinateFields
            latitudeName="newLocationLatitude"
            longitudeName="newLocationLongitude"
            defaultLatitude={state.values.newLocationLatitude}
            defaultLongitude={state.values.newLocationLongitude}
            latitudeErrors={state.fieldErrors?.newLocationLatitude}
            longitudeErrors={state.fieldErrors?.newLocationLongitude}
            disabled={disabled || Boolean(selectedLocationId)}
          />
          {selectedLocationId ? (
            <p className="fieldHint">
              Existing location coordinates can be changed on the Locations page.
            </p>
          ) : null}
        </div>

        {state.formError ? <p className="formError">{state.formError}</p> : null}

        <div className="formActions">
          <SubmitButton disabled={disabled} />
        </div>
      </form>
    </section>
  );
}
