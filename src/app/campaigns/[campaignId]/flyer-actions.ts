"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspaceCampaignById } from "@/domains/campaigns";
import {
  deleteWorkspaceFlyer,
  generateCampaignFlyers,
  getWorkspaceTemplateForCampaign,
  type FlyerGenerationFieldErrors,
  type FlyerGenerationFormValues,
  validateFlyerGenerationInput,
} from "@/domains/flyers";
import { resolveDemoWorkspace } from "@/domains/workspaces";

export type FlyerGenerationActionState = {
  formError?: string;
  fieldErrors?: FlyerGenerationFieldErrors;
  values: FlyerGenerationFormValues;
};

function readFlyerGenerationFormData(formData: FormData): FlyerGenerationFormValues {
  return {
    templateId: String(formData.get("templateId") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
  };
}

export async function generateFlyersAction(
  campaignId: string,
  _prevState: FlyerGenerationActionState,
  formData: FormData,
): Promise<FlyerGenerationActionState> {
  const rawValues = readFlyerGenerationFormData(formData);
  const validation = validateFlyerGenerationInput(rawValues);

  if (!validation.isValid || validation.parsedQuantity === null) {
    return {
      values: validation.values,
      fieldErrors: validation.fieldErrors,
    };
  }

  try {
    const workspace = await resolveDemoWorkspace();
    const campaign = await getWorkspaceCampaignById(workspace.id, campaignId);

    if (!campaign) {
      return {
        values: validation.values,
        formError: "Campaign not found in the demo workspace.",
      };
    }

    const template = await getWorkspaceTemplateForCampaign({
      workspaceId: workspace.id,
      campaignId,
      templateId: validation.values.templateId,
    });

    if (!template) {
      return {
        values: validation.values,
        formError: "Choose a valid template from this campaign.",
      };
    }

    if (
      template.qrPageNumber === null ||
      template.qrX === null ||
      template.qrY === null ||
      template.qrWidth === null ||
      template.qrHeight === null
    ) {
      return {
        values: validation.values,
        formError: "The selected template needs a saved QR placement before flyers can be generated.",
      };
    }

    await generateCampaignFlyers({
      workspaceId: workspace.id,
      campaignId,
      template,
      quantity: validation.parsedQuantity,
    });
  } catch (error) {
    console.error("Failed to generate flyers", error);

    return {
      values: validation.values,
      formError: "Flyers could not be generated. Please try again.",
    };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}?flyersGenerated=1`);
}

export async function deleteFlyerAction(
  campaignId: string,
  flyerId: string,
  _formData: FormData,
) {
  try {
    const workspace = await resolveDemoWorkspace();

    await deleteWorkspaceFlyer({
      workspaceId: workspace.id,
      campaignId,
      flyerId,
    });
  } catch (error) {
    console.error("Failed to delete flyer", error);
    redirect(`/campaigns/${campaignId}?flyerDeleteFailed=1`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaignId}?flyerDeleted=1`);
}
