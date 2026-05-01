import { randomBytes } from "node:crypto";
import { FlyerStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/server/config/app-config";
import { saveGeneratedFlyerPdf } from "@/server/storage/generated-flyer-storage";
import { renderTemplatePdfWithQrPlacements } from "@/server/pdf/qr-placement-renderer";
import {
  getStoredTemplateQrPlacements,
  type TemplateQrPlacement,
} from "@/domains/templates";

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

type FlyerTemplate = {
  id: string;
  campaignId: string;
  originalFilename: string;
  storageKey: string;
  width: Prisma.Decimal | number | null;
  height: Prisma.Decimal | number | null;
  qrPageNumber: number | null;
  qrX: Prisma.Decimal | number | null;
  qrY: Prisma.Decimal | number | null;
  qrWidth: Prisma.Decimal | number | null;
  qrHeight: Prisma.Decimal | number | null;
  qrPlacements: Prisma.JsonValue | null;
  shortTextEnabled: boolean;
  shortTextOffsetX: Prisma.Decimal | number | null;
  shortTextOffsetY: Prisma.Decimal | number | null;
};

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

function buildTrackingUrl(shortcode: string) {
  return new URL(`/r/${shortcode}`, appConfig.appUrl).toString();
}

function generateShortcode() {
  return randomBytes(6)
    .toString("base64url")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, SHORTCODE_LENGTH);
}

async function renderPrintableFlyerPdf(params: {
  template: FlyerTemplate;
  flyerPlacements: Array<{
    flyer: {
      shortcode: string;
      trackingUrl: string;
    };
    placement: TemplateQrPlacement;
  }>;
}) {
  return renderTemplatePdfWithQrPlacements({
    templateStorageKey: params.template.storageKey,
    sourceWidth: params.template.width,
    sourceHeight: params.template.height,
    items: params.flyerPlacements.map(({ flyer, placement }) => ({
      qrContent: flyer.trackingUrl,
      qrPlacement: {
        pageNumber: placement.pageNumber,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      },
      shortText: {
        enabled: params.template.shortTextEnabled,
        label: flyer.shortcode,
        offsetX: params.template.shortTextOffsetX,
        offsetY: params.template.shortTextOffsetY,
      },
    })),
  });
}

async function createFlyerRecordWithUniqueShortcode(params: {
  workspaceId: string;
  campaignId: string;
  template: FlyerTemplate;
}) {
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const shortcode = generateShortcode();
    const trackingUrl = buildTrackingUrl(shortcode);

    try {
      const flyer = await prisma.flyer.create({
        data: {
          workspaceId: params.workspaceId,
          campaignId: params.campaignId,
          templateId: params.template.id,
          shortcode,
          trackingUrl,
          status: FlyerStatus.GENERATED,
          generatedAt: new Date(),
        },
        select: {
          id: true,
          shortcode: true,
          trackingUrl: true,
        },
      });

      return flyer;
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

  throw new Error("Could not generate a unique flyer identifier. Please retry.");
}

async function createFlyerSheet(params: {
  workspaceId: string;
  campaignId: string;
  template: FlyerTemplate;
  placements: TemplateQrPlacement[];
  quantity: number;
}) {
  const flyers: Array<{
    id: string;
    shortcode: string;
    trackingUrl: string;
  }> = [];

  for (let index = 0; index < params.quantity; index += 1) {
    flyers.push(
      await createFlyerRecordWithUniqueShortcode({
        workspaceId: params.workspaceId,
        campaignId: params.campaignId,
        template: params.template,
      }),
    );
  }

  const renderedPdf = await renderPrintableFlyerPdf({
    template: params.template,
    flyerPlacements: flyers.map((flyer, index) => ({
      flyer,
      placement: params.placements[index],
    })),
  });
  const savedPdf = await saveGeneratedFlyerPdf({
    campaignId: params.campaignId,
    shortcode: flyers[0].shortcode,
    bytes: new Uint8Array(renderedPdf),
  });

  await prisma.flyer.updateMany({
    where: {
      id: {
        in: flyers.map((flyer) => flyer.id),
      },
    },
    data: {
      generatedPdfStorageKey: savedPdf.storageKey,
    },
  });

  return flyers.map((flyer) => ({
    id: flyer.id,
  }));
}

export async function generateCampaignFlyers(params: {
  workspaceId: string;
  campaignId: string;
  template: FlyerTemplate;
  quantity: number;
}) {
  const createdFlyers: Array<{ id: string }> = [];
  const placements = getStoredTemplateQrPlacements(params.template);

  if (placements.length === 0) {
    throw new Error("Template QR placement is incomplete.");
  }

  for (let index = 0; index < params.quantity; index += placements.length) {
    const sheetQuantity = Math.min(placements.length, params.quantity - index);
    const flyers = await createFlyerSheet({
      workspaceId: params.workspaceId,
      campaignId: params.campaignId,
      template: params.template,
      placements: placements.slice(0, sheetQuantity),
      quantity: sheetQuantity,
    });
    createdFlyers.push(...flyers);
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
      campaignId: true,
      originalFilename: true,
      storageKey: true,
      width: true,
      height: true,
      qrPageNumber: true,
      qrX: true,
      qrY: true,
      qrWidth: true,
      qrHeight: true,
      qrPlacements: true,
      shortTextEnabled: true,
      shortTextOffsetX: true,
      shortTextOffsetY: true,
    },
  });
}

export async function deleteWorkspaceFlyer(params: {
  workspaceId: string;
  campaignId: string;
  flyerId: string;
}) {
  const flyer = await prisma.flyer.findFirst({
    where: {
      id: params.flyerId,
      workspaceId: params.workspaceId,
      campaignId: params.campaignId,
    },
    select: {
      id: true,
    },
  });

  if (!flyer) {
    throw new Error("Flyer not found in the active workspace.");
  }

  await prisma.flyer.delete({
    where: {
      id: flyer.id,
    },
  });
}

export const flyersModule = {
  name: "flyers",
  status: "unique-id-generation-and-pdf-output-enabled",
} as const;
