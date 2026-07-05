"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { LocationCoordinateActionState } from "@/app/admin/locations/actions";
import { LocationCoordinateFields } from "@/components/locations/location-coordinate-fields";

type LocationCoordinateFormProps = {
  action: (
    state: LocationCoordinateActionState,
    formData: FormData,
  ) => Promise<LocationCoordinateActionState>;
  initialState: LocationCoordinateActionState;
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save map position"}
    </button>
  );
}

export function LocationCoordinateForm({
  action,
  initialState,
}: LocationCoordinateFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="stackForm">
      <LocationCoordinateFields
        defaultLatitude={state.values.latitude}
        defaultLongitude={state.values.longitude}
        latitudeErrors={state.fieldErrors?.latitude}
        longitudeErrors={state.fieldErrors?.longitude}
      />

      {state.formError ? <p className="formError">{state.formError}</p> : null}
      {state.message ? <p className="successMessage">{state.message}</p> : null}

      <div className="formActions">
        <SaveButton />
      </div>
    </form>
  );
}
