import { CampaignStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CampaignFormValues = {
  name: string;
  destinationUrl: string;
};

export type CampaignFieldErrors = Partial<Record<keyof CampaignFormValues, string[]>>;

const MAX_NAME_LENGTH = 120;

export function validateCampaignInput(values: CampaignFormValues) {
  const name = values.name.trim();
  const destinationUrl = values.destinationUrl.trim();
  const fieldErrors: CampaignFieldErrors = {};

  if (!name) {
    fieldErrors.name = ["Campaign name is required."];
  } else if (name.length > MAX_NAME_LENGTH) {
    fieldErrors.name = [`Campaign name must be ${MAX_NAME_LENGTH} characters or fewer.`];
  }

  if (!destinationUrl) {
    fieldErrors.destinationUrl = ["Target URL is required."];
  } else {
    try {
      const parsedUrl = new URL(destinationUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        fieldErrors.destinationUrl = ["Target URL must start with http:// or https://."];
      }
    } catch {
      fieldErrors.destinationUrl = ["Enter a valid target URL."];
    }
  }

  return {
    values: {
      name,
      destinationUrl,
    },
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}

export async function listWorkspaceCampaigns(workspaceId: string) {
  return prisma.campaign.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      destinationUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getWorkspaceCampaignById(workspaceId: string, campaignId: string) {
  return prisma.campaign.findFirst({
    where: {
      id: campaignId,
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      destinationUrl: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      templates: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          originalFilename: true,
          storageKey: true,
          mimeType: true,
          fileSizeBytes: true,
          pageCount: true,
          width: true,
          height: true,
          qrPageNumber: true,
          qrX: true,
          qrY: true,
          qrWidth: true,
          qrHeight: true,
          shortTextEnabled: true,
          shortTextOffsetX: true,
          shortTextOffsetY: true,
          createdAt: true,
        },
      },
      flyers: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          shortcode: true,
          trackingUrl: true,
          generatedPdfStorageKey: true,
          status: true,
          createdAt: true,
          generatedAt: true,
          template: {
            select: {
              id: true,
              originalFilename: true,
            },
          },
        },
      },
    },
  });
}

export async function createWorkspaceCampaign(
  workspaceId: string,
  values: CampaignFormValues,
) {
  return prisma.campaign.create({
    data: {
      workspaceId,
      name: values.name,
      destinationUrl: values.destinationUrl,
      status: CampaignStatus.DRAFT,
    },
    select: {
      id: true,
    },
  });
}

export async function updateWorkspaceCampaign(
  workspaceId: string,
  campaignId: string,
  values: CampaignFormValues,
) {
  const existingCampaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!existingCampaign) {
    throw new Error("Campaign not found in the active workspace.");
  }

  return prisma.campaign.update({
    where: {
      id: existingCampaign.id,
    },
    data: {
      name: values.name,
      destinationUrl: values.destinationUrl,
    },
    select: {
      id: true,
    },
  });
}

export const campaignsModule = {
  name: "campaigns",
  status: "crud-enabled",
} as const;
