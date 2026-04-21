import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { FlyerStatus, Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/server/config/app-config";
import { generateQRCode } from "@/lib/qr-code";
import { resolveTemplateStoragePath } from "@/server/storage/template-storage";
import { saveGeneratedFlyerPdf } from "@/server/storage/generated-flyer-storage";

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

function toNumber(value: Prisma.Decimal | number | null) {
  if (value === null) {
    return null;
  }

  return typeof value === "number" ? value : value.toNumber();
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
  shortcode: string;
  trackingUrl: string;
}) {
  const templateBytes = await readFile(resolveTemplateStoragePath(params.template.storageKey));
  const pdfDocument = await PDFDocument.load(templateBytes);
  const pageIndex = Math.max((params.template.qrPageNumber ?? 1) - 1, 0);
  const page = pdfDocument.getPage(pageIndex);

  if (!page) {
    throw new Error("Configured QR page could not be found in the PDF.");
  }

  const sourceWidth = toNumber(params.template.width) ?? page.getWidth();
  const sourceHeight = toNumber(params.template.height) ?? page.getHeight();
  const qrX = toNumber(params.template.qrX);
  const qrY = toNumber(params.template.qrY);
  const qrWidth = toNumber(params.template.qrWidth);
  const qrHeight = toNumber(params.template.qrHeight);

  if (
    qrX === null ||
    qrY === null ||
    qrWidth === null ||
    qrHeight === null ||
    params.template.qrPageNumber === null
  ) {
    throw new Error("Template QR placement is incomplete.");
  }

  const qrImageBytes = await generateQRCode(params.trackingUrl, "image/png", {
    transparent: true,
  });
  const qrImage = await pdfDocument.embedPng(qrImageBytes);
  const pageSize = page.getSize();
  const scaleX = pageSize.width / sourceWidth;
  const scaleY = pageSize.height / sourceHeight;
  const targetX = qrX * scaleX;
  const targetWidth = qrWidth * scaleX;
  const targetHeight = qrHeight * scaleY;
  const targetY = pageSize.height - (qrY + qrHeight) * scaleY;

  page.drawImage(qrImage, {
    x: targetX,
    y: targetY,
    width: targetWidth,
    height: targetHeight,
  });

  if (params.template.shortTextEnabled) {
    const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
    page.drawText(params.shortcode, {
      x: targetX + (toNumber(params.template.shortTextOffsetX) ?? 0) * scaleX,
      y: targetY - 12 - (toNumber(params.template.shortTextOffsetY) ?? 0) * scaleY,
      size: 10,
      font,
      color: rgb(0.15, 0.17, 0.2),
    });
  }

  return pdfDocument.save();
}

async function createSingleFlyer(params: {
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

      const renderedPdf = await renderPrintableFlyerPdf({
        template: params.template,
        shortcode: flyer.shortcode,
        trackingUrl: flyer.trackingUrl,
      });
      const savedPdf = await saveGeneratedFlyerPdf({
        campaignId: params.campaignId,
        shortcode: flyer.shortcode,
        bytes: new Uint8Array(renderedPdf),
      });

      return await prisma.flyer.update({
        where: {
          id: flyer.id,
        },
        data: {
          generatedPdfStorageKey: savedPdf.storageKey,
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

  throw new Error("Could not generate a unique flyer identifier. Please retry.");
}

export async function generateCampaignFlyers(params: {
  workspaceId: string;
  campaignId: string;
  template: FlyerTemplate;
  quantity: number;
}) {
  const createdFlyers: Array<{ id: string }> = [];

  for (let index = 0; index < params.quantity; index += 1) {
    const flyer = await createSingleFlyer({
      workspaceId: params.workspaceId,
      campaignId: params.campaignId,
      template: params.template,
    });
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
      shortTextEnabled: true,
      shortTextOffsetX: true,
      shortTextOffsetY: true,
    },
  });
}

export const flyersModule = {
  name: "flyers",
  status: "unique-id-generation-and-pdf-output-enabled",
} as const;
