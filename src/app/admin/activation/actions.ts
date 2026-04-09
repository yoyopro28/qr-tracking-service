"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  activateFlyer,
  getFlyerForActivationByShortcode,
  getWorkspaceLocationForActivation,
  normalizeShortcode,
  type ActivationFieldErrors,
  type ActivationFormValues,
  validateActivationInput,
} from "@/domains/activations";
import { resolveDemoWorkspace } from "@/domains/workspaces";

export type ActivationActionState = {
  formError?: string;
  fieldErrors?: ActivationFieldErrors;
  values: ActivationFormValues;
};

function readActivationFormData(formData: FormData): ActivationFormValues {
  return {
    locationId: String(formData.get("locationId") ?? ""),
    newLocationName: String(formData.get("newLocationName") ?? ""),
  };
}

export async function activateFlyerAction(
  shortcode: string,
  _prevState: ActivationActionState,
  formData: FormData,
): Promise<ActivationActionState> {
  const rawValues = readActivationFormData(formData);
  const validation = validateActivationInput(rawValues);

  if (!validation.isValid) {
    return {
      values: validation.values,
      fieldErrors: validation.fieldErrors,
    };
  }

  const normalizedShortcode = normalizeShortcode(shortcode);

  try {
    const workspace = await resolveDemoWorkspace();
    const flyer = await getFlyerForActivationByShortcode(workspace.id, normalizedShortcode);

    if (!flyer) {
      return {
        values: validation.values,
        formError: "Flyer not found for the scanned shortcode.",
      };
    }

    if (validation.values.locationId) {
      const location = await getWorkspaceLocationForActivation({
        workspaceId: workspace.id,
        campaignId: flyer.campaign.id,
        locationId: validation.values.locationId,
      });

      if (!location) {
        return {
          values: validation.values,
          formError: "Choose a valid location from this campaign or the shared workspace list.",
        };
      }
    }

    await activateFlyer({
      workspaceId: workspace.id,
      flyerId: flyer.id,
      campaignId: flyer.campaign.id,
      locationId: validation.values.locationId || undefined,
      newLocationName: validation.values.newLocationName || undefined,
    });
  } catch (error) {
    console.error("Failed to activate flyer", error);

    return {
      values: validation.values,
      formError:
        error instanceof Error
          ? error.message
          : "Flyer activation could not be completed. Please try again.",
    };
  }

  revalidatePath("/admin/activation");
  revalidatePath("/campaigns");
  redirect(`/admin/activation?shortcode=${encodeURIComponent(normalizedShortcode)}&activated=1`);
}
