"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createWorkspaceCampaign,
  type CampaignFieldErrors,
  type CampaignFormValues,
  updateWorkspaceCampaign,
  validateCampaignInput,
} from "@/domains/campaigns";
import { resolveDemoWorkspace } from "@/domains/workspaces";

export type CampaignActionState = {
  formError?: string;
  fieldErrors?: CampaignFieldErrors;
  values: CampaignFormValues;
};

function readCampaignFormData(formData: FormData): CampaignFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    destinationUrl: String(formData.get("destinationUrl") ?? ""),
  };
}

export async function createCampaignAction(
  _prevState: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const rawValues = readCampaignFormData(formData);
  const validation = validateCampaignInput(rawValues);

  if (!validation.isValid) {
    return {
      values: rawValues,
      fieldErrors: validation.fieldErrors,
    };
  }

  let campaignId: string;

  try {
    const workspace = await resolveDemoWorkspace();
    const campaign = await createWorkspaceCampaign(workspace.id, validation.values);
    campaignId = campaign.id;
  } catch (error) {
    console.error("Failed to create campaign", error);

    return {
      values: rawValues,
      formError: "Campaign could not be created. Please try again.",
    };
  }

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaignId}?created=1`);
}

export async function updateCampaignAction(
  campaignId: string,
  _prevState: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const rawValues = readCampaignFormData(formData);
  const validation = validateCampaignInput(rawValues);

  if (!validation.isValid) {
    return {
      values: rawValues,
      fieldErrors: validation.fieldErrors,
    };
  }

  try {
    const workspace = await resolveDemoWorkspace();

    await updateWorkspaceCampaign(workspace.id, campaignId, validation.values);
  } catch (error) {
    console.error("Failed to update campaign", error);

    return {
      values: rawValues,
      formError: "Campaign could not be updated. Please try again.",
    };
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}?updated=1`);
}
