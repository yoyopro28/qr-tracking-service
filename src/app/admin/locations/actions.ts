"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveWorkspaceLocation,
  deleteUnusedWorkspaceLocation,
  restoreWorkspaceLocation,
  type LocationCoordinateFieldErrors,
  type LocationCoordinateValues,
  updateWorkspaceLocationCoordinates,
  validateLocationCoordinates,
} from "@/domains/locations";
import { resolveDemoWorkspace } from "@/domains/workspaces";

export type LocationCoordinateActionState = {
  message?: string;
  formError?: string;
  fieldErrors?: LocationCoordinateFieldErrors;
  values: LocationCoordinateValues;
};

export async function updateLocationCoordinatesAction(
  locationId: string,
  _previousState: LocationCoordinateActionState,
  formData: FormData,
): Promise<LocationCoordinateActionState> {
  const validation = validateLocationCoordinates({
    latitude: String(formData.get("latitude") ?? ""),
    longitude: String(formData.get("longitude") ?? ""),
  });

  if (!validation.isValid) {
    return {
      values: validation.values,
      fieldErrors: validation.fieldErrors,
    };
  }

  try {
    const workspace = await resolveDemoWorkspace();
    await updateWorkspaceLocationCoordinates({
      workspaceId: workspace.id,
      locationId,
      latitude: validation.coordinates?.latitude ?? null,
      longitude: validation.coordinates?.longitude ?? null,
    });
  } catch (error) {
    console.error("Failed to update location coordinates", error);

    return {
      values: validation.values,
      formError:
        error instanceof Error ? error.message : "The location coordinates could not be saved.",
    };
  }

  revalidatePath("/admin/locations");
  revalidatePath("/admin/activation");
  revalidatePath("/analytics");

  return {
    values: validation.values,
    message: validation.coordinates ? "Map position saved." : "Map position removed.",
  };
}

function revalidateLocationViews() {
  revalidatePath("/admin/locations");
  revalidatePath("/admin/activation");
  revalidatePath("/analytics");
}

export async function deleteLocationAction(locationId: string, _formData: FormData) {
  try {
    const workspace = await resolveDemoWorkspace();
    await deleteUnusedWorkspaceLocation({ workspaceId: workspace.id, locationId });
  } catch (error) {
    console.error("Failed to delete location", error);
    redirect("/admin/locations?deleteBlocked=1");
  }

  revalidateLocationViews();
  redirect("/admin/locations?deleted=1");
}

export async function archiveLocationAction(locationId: string, _formData: FormData) {
  try {
    const workspace = await resolveDemoWorkspace();
    await archiveWorkspaceLocation({ workspaceId: workspace.id, locationId });
  } catch (error) {
    console.error("Failed to archive location", error);
    redirect("/admin/locations?operationFailed=1");
  }

  revalidateLocationViews();
  redirect("/admin/locations?archived=1");
}

export async function restoreLocationAction(locationId: string, _formData: FormData) {
  try {
    const workspace = await resolveDemoWorkspace();
    await restoreWorkspaceLocation({ workspaceId: workspace.id, locationId });
  } catch (error) {
    console.error("Failed to restore location", error);
    redirect("/admin/locations?operationFailed=1");
  }

  revalidateLocationViews();
  redirect("/admin/locations?restored=1");
}
