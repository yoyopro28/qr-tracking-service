import { readFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generateQRCode } from "@/lib/qr-code";
import { resolveTemplateStoragePath } from "@/server/storage/template-storage";

type NumericPdfValue = number | { toNumber(): number } | null | undefined;

export type QrPlacement = {
  pageNumber: number | null;
  x: NumericPdfValue;
  y: NumericPdfValue;
  width: NumericPdfValue;
  height: NumericPdfValue;
};

export type ShortTextPlacement = {
  enabled: boolean;
  label: string;
  offsetX: NumericPdfValue;
  offsetY: NumericPdfValue;
};

export type QrPlacementRenderItem = {
  qrContent: string;
  qrPlacement: QrPlacement;
  shortText: ShortTextPlacement;
};

export type QrPlacementRenderErrorCode =
  | "INCOMPLETE_PLACEMENT"
  | "INVALID_SOURCE_SIZE"
  | "PAGE_NOT_FOUND";

export class QrPlacementRenderError extends Error {
  constructor(
    message: string,
    public readonly code: QrPlacementRenderErrorCode,
  ) {
    super(message);
    this.name = "QrPlacementRenderError";
  }
}

function toNumber(value: NumericPdfValue) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = typeof value === "number" ? value : value.toNumber();

  return Number.isFinite(numericValue) ? numericValue : null;
}

function requirePlacementValue(value: NumericPdfValue, fieldName: string) {
  const numericValue = toNumber(value);

  if (numericValue === null) {
    throw new QrPlacementRenderError(
      `Template QR placement is incomplete: ${fieldName} is missing.`,
      "INCOMPLETE_PLACEMENT",
    );
  }

  return numericValue;
}

export function mapQrPlacementToPdfPage(params: {
  pageWidth: number;
  pageHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  placement: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}) {
  if (
    params.sourceWidth <= 0 ||
    params.sourceHeight <= 0 ||
    !Number.isFinite(params.sourceWidth) ||
    !Number.isFinite(params.sourceHeight)
  ) {
    throw new QrPlacementRenderError(
      "Template source dimensions are invalid.",
      "INVALID_SOURCE_SIZE",
    );
  }

  const scaleX = params.pageWidth / params.sourceWidth;
  const scaleY = params.pageHeight / params.sourceHeight;

  return {
    x: params.placement.x * scaleX,
    y: params.pageHeight - (params.placement.y + params.placement.height) * scaleY,
    width: params.placement.width * scaleX,
    height: params.placement.height * scaleY,
    scaleX,
    scaleY,
  };
}

export async function renderTemplatePdfWithQrPlacement(params: {
  templateStorageKey: string;
  sourceWidth: NumericPdfValue;
  sourceHeight: NumericPdfValue;
  qrContent: string;
  qrPlacement: QrPlacement;
  shortText: ShortTextPlacement;
}) {
  return renderTemplatePdfWithQrPlacements({
    templateStorageKey: params.templateStorageKey,
    sourceWidth: params.sourceWidth,
    sourceHeight: params.sourceHeight,
    items: [
      {
        qrContent: params.qrContent,
        qrPlacement: params.qrPlacement,
        shortText: params.shortText,
      },
    ],
  });
}

export async function renderTemplatePdfWithQrPlacements(params: {
  templateStorageKey: string;
  sourceWidth: NumericPdfValue;
  sourceHeight: NumericPdfValue;
  items: QrPlacementRenderItem[];
}) {
  if (params.items.length === 0) {
    throw new QrPlacementRenderError(
      "Template QR placement is incomplete: no QR placeholders are defined.",
      "INCOMPLETE_PLACEMENT",
    );
  }

  const normalizedItems = params.items.map((item) => {
    if (item.qrPlacement.pageNumber === null) {
      throw new QrPlacementRenderError(
        "Template QR placement is incomplete: page number is missing.",
        "INCOMPLETE_PLACEMENT",
      );
    }

    return {
      ...item,
      pageIndex: Math.max(item.qrPlacement.pageNumber - 1, 0),
      placement: {
        x: requirePlacementValue(item.qrPlacement.x, "x"),
        y: requirePlacementValue(item.qrPlacement.y, "y"),
        width: requirePlacementValue(item.qrPlacement.width, "width"),
        height: requirePlacementValue(item.qrPlacement.height, "height"),
      },
    };
  });

  const templateBytes = await readFile(resolveTemplateStoragePath(params.templateStorageKey));
  const pdfDocument = await PDFDocument.load(templateBytes);
  const pageCount = pdfDocument.getPageCount();
  const font = normalizedItems.some((item) => item.shortText.enabled)
    ? await pdfDocument.embedFont(StandardFonts.Helvetica)
    : null;

  for (const item of normalizedItems) {
    if (item.pageIndex >= pageCount) {
      throw new QrPlacementRenderError(
        "Configured QR page could not be found in the PDF.",
        "PAGE_NOT_FOUND",
      );
    }

    const page = pdfDocument.getPage(item.pageIndex);
    const pageSize = page.getSize();
    const sourceWidth = toNumber(params.sourceWidth) ?? pageSize.width;
    const sourceHeight = toNumber(params.sourceHeight) ?? pageSize.height;
    const target = mapQrPlacementToPdfPage({
      pageWidth: pageSize.width,
      pageHeight: pageSize.height,
      sourceWidth,
      sourceHeight,
      placement: item.placement,
    });
    const qrImageBytes = await generateQRCode(item.qrContent, "image/png", {
      transparent: true,
    });
    const qrImage = await pdfDocument.embedPng(qrImageBytes);

    page.drawImage(qrImage, {
      x: target.x,
      y: target.y,
      width: target.width,
      height: target.height,
    });

    if (item.shortText.enabled && font) {
      page.drawText(item.shortText.label, {
        x: target.x + (toNumber(item.shortText.offsetX) ?? 0) * target.scaleX,
        y: target.y - 12 - (toNumber(item.shortText.offsetY) ?? 0) * target.scaleY,
        size: 10,
        font,
        color: rgb(0.15, 0.17, 0.2),
      });
    }
  }

  return pdfDocument.save();
}
