"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCampaignTemplate,
  estimatePdfPageCount,
  type TemplateFieldErrors,
  type TemplateFormValues,
  validateTemplateInput,
} from "@/domains/templates";
import { getWorkspaceCampaignById } from "@/domains/campaigns";
import { resolveDemoWorkspace } from "@/domains/workspaces";
import { saveTemplateUpload } from "@/server/storage/template-storage";

export type TemplateActionState = {
  formError?: string;
  fieldErrors?: TemplateFieldErrors;
  values: Omit<TemplateFormValues, "templateFile">;
};

function readTemplateFormData(formData: FormData): TemplateFormValues {
  const templateFile = formData.get("templateFile");

  return {
    templateFile: templateFile instanceof File ? templateFile : null,
    qrPageNumber: String(formData.get("qrPageNumber") ?? ""),
    qrX: String(formData.get("qrX") ?? ""),
    qrY: String(formData.get("qrY") ?? ""),
    qrWidth: String(formData.get("qrWidth") ?? ""),
    qrHeight: String(formData.get("qrHeight") ?? ""),
    shortTextEnabled: String(formData.get("shortTextEnabled") ?? "") === "on",
    shortTextOffsetX: String(formData.get("shortTextOffsetX") ?? ""),
    shortTextOffsetY: String(formData.get("shortTextOffsetY") ?? ""),
  };
}

export async function createTemplateAction(
  campaignId: string,
  _prevState: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const rawValues = readTemplateFormData(formData);
  const validation = validateTemplateInput(rawValues);

  if (!validation.isValid || !validation.parsedValues) {
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

    const fileBytes = new Uint8Array(
      await validation.parsedValues.templateFile.arrayBuffer(),
    );
    const savedFile = await saveTemplateUpload({
      campaignId,
      originalFilename: validation.parsedValues.templateFile.name,
      bytes: fileBytes,
    });

    await createCampaignTemplate({
      workspaceId: workspace.id,
      campaignId,
      originalFilename: validation.parsedValues.templateFile.name,
      storageKey: savedFile.storageKey,
      mimeType: validation.parsedValues.templateFile.type || "application/pdf",
      fileSizeBytes: validation.parsedValues.templateFile.size,
      pageCount: estimatePdfPageCount(fileBytes),
      qrPageNumber: validation.parsedValues.qrPageNumber,
      qrX: validation.parsedValues.qrX,
      qrY: validation.parsedValues.qrY,
      qrWidth: validation.parsedValues.qrWidth,
      qrHeight: validation.parsedValues.qrHeight,
      shortTextEnabled: validation.parsedValues.shortTextEnabled,
      shortTextOffsetX: validation.parsedValues.shortTextOffsetX,
      shortTextOffsetY: validation.parsedValues.shortTextOffsetY,
    });
  } catch (error) {
    console.error("Failed to create template", error);

    return {
      values: validation.values,
      formError: "Template upload could not be saved. Please try again.",
    };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}?templateCreated=1`);
}
