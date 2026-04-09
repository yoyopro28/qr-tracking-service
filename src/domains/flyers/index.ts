import { randomBytes } from "node:crypto";
import { FlyerStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/server/config/app-config";

const MIN_FLYER_QUANTITY = 1;
const MAX_FLYER_QUANTITY = 250;
const SHORTCODE_LENGTH = 8;

export type FlyerGenerationFormValues = {
  templateId: string;
  quantity: string;
};

export type FlyerGenerationFieldErrors = Partial<
  Record<keyof FlyerGenerationFormValues, string[]>
>;

export function validateFlyerGenerationInput(values: FlyerGenerationFormValues) {
  const templateId = values.templateId.trim();
  const quantity = values.quantity.trim();
  const fieldErrors: FlyerGenerationFieldErrors = {};

  if (!templateId) {
    fieldErrors.templateId = ["Choose a template before generating flyers."];
  }

  if (!quantity) {
    fieldErrors.quantity = ["Quantity is required."];
  } else {
    const parsedQuantity = Number.parseInt(quantity, 10);

    if (!Number.isInteger(parsedQuantity)) {
      fieldErrors.quantity = ["Quantity must be a whole number."];
    } else if (parsedQuantity < MIN_FLYER_QUANTITY || parsedQuantity > MAX_FLYER_QUANTITY) {
      fieldErrors.quantity = [
        `Quantity must be between ${MIN_FLYER_QUANTITY} and ${MAX_FLYER_QUANTITY}.`,
      ];
    }
  }

  return {
    values: {
      templateId,
      quantity,
    },
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
    parsedQuantity: Object.keys(fieldErrors).length === 0 ? Number.parseInt(quantity, 10) : null,
  };
}

function generateShortcode() {
  return randomBytes(6)
    .toString("base64url")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, SHORTCODE_LENGTH);
}

function buildTrackingUrl(shortcode: string) {
  return new URL(`/r/${shortcode}`, appConfig.appUrl).toString();
}

async function createSingleFlyer(params: {
  workspaceId: string;
  campaignId: string;
  templateId: string;
}) {
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const shortcode = generateShortcode();

    try {
      return await prisma.flyer.create({
        data: {
          workspaceId: params.workspaceId,
          campaignId: params.campaignId,
          templateId: params.templateId,
          shortcode,
          trackingUrl: buildTrackingUrl(shortcode),
          status: FlyerStatus.GENERATED,
          generatedAt: new Date(),
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not generate a unique shortcode for the flyer.");
}

export async function generateCampaignFlyers(params: {
  workspaceId: string;
  campaignId: string;
  templateId: string;
  quantity: number;
}) {
  const createdFlyers: Array<{ id: string }> = [];

  for (let index = 0; index < params.quantity; index += 1) {
    const flyer = await createSingleFlyer(params);
    createdFlyers.push(flyer);
  }

  return createdFlyers;
}

export async function getWorkspaceTemplateForCampaign(params: {
  workspaceId: string;
  campaignId: string;
  templateId: string;
}) {
  return prisma.template.findFirst({
    where: {
      id: params.templateId,
      workspaceId: params.workspaceId,
      campaignId: params.campaignId,
    },
    select: {
      id: true,
    },
  });
}

export const flyersModule = {
  name: "flyers",
  status: "generation-enabled",
} as const;
