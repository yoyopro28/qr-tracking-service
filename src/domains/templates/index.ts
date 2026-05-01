import { Buffer } from "node:buffer";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_TEMPLATE_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export type TemplateFormValues = {
  templateFile: File | null;
  qrPageNumber: string;
  qrX: string;
  qrY: string;
  qrWidth: string;
  qrHeight: string;
  qrPlacements: string;
  shortTextEnabled: boolean;
  shortTextOffsetX: string;
  shortTextOffsetY: string;
};

export type TemplateQrPlacement = {
  id: string;
  order: number;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TemplateFieldErrors = Partial<
  Record<
    | "templateFile"
    | "qrPageNumber"
    | "qrX"
    | "qrY"
    | "qrWidth"
    | "qrHeight"
    | "qrPlacements"
    | "shortTextOffsetX"
    | "shortTextOffsetY",
    string[]
  >
>;

type ValidTemplateInput = {
  templateFile: File;
  qrPageNumber: number;
  qrX: number;
  qrY: number;
  qrWidth: number;
  qrHeight: number;
  qrPlacements: TemplateQrPlacement[];
  shortTextEnabled: boolean;
  shortTextOffsetX: number | null;
  shortTextOffsetY: number | null;
};

type StoredTemplatePlacementSource = {
  qrPlacements?: Prisma.JsonValue | null;
  qrPageNumber: number | null;
  qrX: Prisma.Decimal | number | null;
  qrY: Prisma.Decimal | number | null;
  qrWidth: Prisma.Decimal | number | null;
  qrHeight: Prisma.Decimal | number | null;
};

function parsePositiveInteger(value: string, fieldName: keyof TemplateFieldErrors) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      value: null,
      error: `${humanizeTemplateField(fieldName)} is required.`,
    };
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return {
      value: null,
      error: `${humanizeTemplateField(fieldName)} must be a whole number greater than 0.`,
    };
  }

  return { value: parsed, error: null };
}

function parseNonNegativeDecimal(
  value: string,
  fieldName: keyof TemplateFieldErrors,
  { required }: { required: boolean },
) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      value: null,
      error: required ? `${humanizeTemplateField(fieldName)} is required.` : null,
    };
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return {
      value: null,
      error: `${humanizeTemplateField(fieldName)} must be 0 or greater.`,
    };
  }

  return { value: parsed, error: null };
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = typeof value === "number" ? value : value.toNumber();

  return Number.isFinite(numericValue) ? numericValue : null;
}

function readPlacementNumber(
  value: unknown,
  fieldName: keyof TemplateFieldErrors,
  placementIndex: number,
  { positive }: { positive: boolean },
) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  const isValid = Number.isFinite(parsed) && (positive ? parsed > 0 : parsed >= 0);

  if (!isValid) {
    return {
      value: null,
      error: `QR placeholder ${placementIndex + 1} ${humanizeTemplateField(fieldName).toLowerCase()} must be ${
        positive ? "greater than 0" : "0 or greater"
      }.`,
    };
  }

  return {
    value: parsed,
    error: null,
  };
}

function readPlacementPageNumber(value: unknown, placementIndex: number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? "").trim(), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return {
      value: null,
      error: `QR placeholder ${placementIndex + 1} page number must be a whole number greater than 0.`,
    };
  }

  return {
    value: parsed,
    error: null,
  };
}

function normalizeTemplateQrPlacements(placements: TemplateQrPlacement[]) {
  return placements.map((placement, index) => ({
    id: placement.id || `qr-${index + 1}`,
    order: index,
    pageNumber: placement.pageNumber,
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
  }));
}

function parseQrPlacementsJson(values: TemplateFormValues) {
  const rawPlacements = values.qrPlacements.trim();

  if (!rawPlacements) {
    return null;
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawPlacements);
  } catch {
    return {
      placements: null,
      error: "QR placeholders could not be read. Please draw the QR areas again.",
    };
  }

  if (!Array.isArray(parsedJson) || parsedJson.length === 0) {
    return {
      placements: null,
      error: "Add at least one QR placeholder before saving the template.",
    };
  }

  const placements: TemplateQrPlacement[] = [];

  for (const [index, item] of parsedJson.entries()) {
    if (!item || typeof item !== "object") {
      return {
        placements: null,
        error: `QR placeholder ${index + 1} is invalid.`,
      };
    }

    const rawItem = item as Record<string, unknown>;
    const pageNumber = readPlacementPageNumber(rawItem.pageNumber ?? values.qrPageNumber, index);
    const x = readPlacementNumber(rawItem.x ?? rawItem.qrX, "qrX", index, { positive: false });
    const y = readPlacementNumber(rawItem.y ?? rawItem.qrY, "qrY", index, { positive: false });
    const width = readPlacementNumber(rawItem.width ?? rawItem.qrWidth, "qrWidth", index, { positive: true });
    const height = readPlacementNumber(rawItem.height ?? rawItem.qrHeight, "qrHeight", index, { positive: true });
    const error = pageNumber.error ?? x.error ?? y.error ?? width.error ?? height.error;

    if (error) {
      return {
        placements: null,
        error,
      };
    }

    placements.push({
      id: typeof rawItem.id === "string" && rawItem.id.trim() ? rawItem.id.trim() : `qr-${index + 1}`,
      order: index,
      pageNumber: pageNumber.value as number,
      x: x.value as number,
      y: y.value as number,
      width: width.value as number,
      height: height.value as number,
    });
  }

  return {
    placements: normalizeTemplateQrPlacements(placements),
    error: null,
  };
}

function isStoredPlacementRecord(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getStoredTemplateQrPlacements(
  template: StoredTemplatePlacementSource,
): TemplateQrPlacement[] {
  if (Array.isArray(template.qrPlacements)) {
    const placements: TemplateQrPlacement[] = [];

    for (const [index, placement] of template.qrPlacements.entries()) {
      if (!isStoredPlacementRecord(placement)) {
        continue;
      }

      const pageNumber = Number(placement.pageNumber);
      const x = Number(placement.x);
      const y = Number(placement.y);
      const width = Number(placement.width);
      const height = Number(placement.height);

      if (
        Number.isInteger(pageNumber) &&
        pageNumber > 0 &&
        Number.isFinite(x) &&
        x >= 0 &&
        Number.isFinite(y) &&
        y >= 0 &&
        Number.isFinite(width) &&
        width > 0 &&
        Number.isFinite(height) &&
        height > 0
      ) {
        placements.push({
          id: typeof placement.id === "string" && placement.id ? placement.id : `qr-${index + 1}`,
          order: Number.isInteger(Number(placement.order)) ? Number(placement.order) : index,
          pageNumber,
          x,
          y,
          width,
          height,
        });
      }
    }

    if (placements.length > 0) {
      return placements.sort((a, b) => a.order - b.order);
    }
  }

  const pageNumber = template.qrPageNumber;
  const x = toNumber(template.qrX);
  const y = toNumber(template.qrY);
  const width = toNumber(template.qrWidth);
  const height = toNumber(template.qrHeight);

  if (
    pageNumber !== null &&
    x !== null &&
    y !== null &&
    width !== null &&
    height !== null &&
    width > 0 &&
    height > 0
  ) {
    return [
      {
        id: "qr-1",
        order: 0,
        pageNumber,
        x,
        y,
        width,
        height,
      },
    ];
  }

  return [];
}

function humanizeTemplateField(fieldName: keyof TemplateFieldErrors) {
  switch (fieldName) {
    case "templateFile":
      return "Template PDF";
    case "qrPageNumber":
      return "QR page number";
    case "qrX":
      return "QR X position";
    case "qrY":
      return "QR Y position";
    case "qrWidth":
      return "QR width";
    case "qrHeight":
      return "QR height";
    case "qrPlacements":
      return "QR placeholders";
    case "shortTextOffsetX":
      return "Short text X offset";
    case "shortTextOffsetY":
      return "Short text Y offset";
  }
}

export function validateTemplateInput(values: TemplateFormValues) {
  const fieldErrors: TemplateFieldErrors = {};
  const templateFile = values.templateFile;

  if (!templateFile || templateFile.size === 0) {
    fieldErrors.templateFile = ["A PDF file is required."];
  } else {
    const hasPdfMimeType = templateFile.type === "application/pdf";
    const hasPdfExtension = templateFile.name.toLowerCase().endsWith(".pdf");

    if (!hasPdfMimeType && !hasPdfExtension) {
      fieldErrors.templateFile = ["Only PDF uploads are supported for now."];
    } else if (templateFile.size > MAX_TEMPLATE_FILE_SIZE_BYTES) {
      fieldErrors.templateFile = [
        `Template PDF must be ${Math.floor(MAX_TEMPLATE_FILE_SIZE_BYTES / (1024 * 1024))}MB or smaller.`,
      ];
    }
  }

  const qrPageNumber = parsePositiveInteger(values.qrPageNumber, "qrPageNumber");
  const qrX = parseNonNegativeDecimal(values.qrX, "qrX", { required: true });
  const qrY = parseNonNegativeDecimal(values.qrY, "qrY", { required: true });
  const qrWidth = parseNonNegativeDecimal(values.qrWidth, "qrWidth", { required: true });
  const qrHeight = parseNonNegativeDecimal(values.qrHeight, "qrHeight", { required: true });
  const parsedQrPlacements = parseQrPlacementsJson(values);
  const shortTextOffsetX = parseNonNegativeDecimal(values.shortTextOffsetX, "shortTextOffsetX", {
    required: false,
  });
  const shortTextOffsetY = parseNonNegativeDecimal(values.shortTextOffsetY, "shortTextOffsetY", {
    required: false,
  });

  const qrPlacements =
    parsedQrPlacements?.placements ??
    (qrPageNumber.value !== null &&
    qrX.value !== null &&
    qrY.value !== null &&
    qrWidth.value !== null &&
    qrHeight.value !== null
      ? normalizeTemplateQrPlacements([
          {
            id: "qr-1",
            order: 0,
            pageNumber: qrPageNumber.value,
            x: qrX.value,
            y: qrY.value,
            width: qrWidth.value,
            height: qrHeight.value,
          },
        ])
      : null);

  const placementFieldResults =
    parsedQrPlacements === null
      ? {
          qrPageNumber,
          qrX,
          qrY,
          qrWidth,
          qrHeight,
        }
      : {
          qrPlacements: {
            error: parsedQrPlacements.error,
          },
        };

  for (const [key, result] of Object.entries({
    ...placementFieldResults,
    shortTextOffsetX,
    shortTextOffsetY,
  }) as Array<[keyof TemplateFieldErrors, { error: string | null }]>) {
    if (result.error) {
      fieldErrors[key] = [result.error];
    }
  }

  const normalizedValues = {
    qrPageNumber: values.qrPageNumber.trim(),
    qrX: values.qrX.trim(),
    qrY: values.qrY.trim(),
    qrWidth: values.qrWidth.trim(),
    qrHeight: values.qrHeight.trim(),
    qrPlacements: values.qrPlacements.trim(),
    shortTextEnabled: values.shortTextEnabled,
    shortTextOffsetX: values.shortTextOffsetX.trim(),
    shortTextOffsetY: values.shortTextOffsetY.trim(),
  };

  const isValid = Object.keys(fieldErrors).length === 0;
  const firstQrPlacement = qrPlacements?.[0] ?? null;

  return {
    fieldErrors,
    values: normalizedValues,
    isValid,
    parsedValues: isValid
      ? ({
          templateFile: templateFile as File,
          qrPageNumber: firstQrPlacement?.pageNumber as number,
          qrX: firstQrPlacement?.x as number,
          qrY: firstQrPlacement?.y as number,
          qrWidth: firstQrPlacement?.width as number,
          qrHeight: firstQrPlacement?.height as number,
          qrPlacements: qrPlacements as TemplateQrPlacement[],
          shortTextEnabled: values.shortTextEnabled,
          shortTextOffsetX: shortTextOffsetX.value,
          shortTextOffsetY: shortTextOffsetY.value,
        } satisfies ValidTemplateInput)
      : null,
  };
}

export async function createCampaignTemplate(params: {
  workspaceId: string;
  campaignId: string;
  originalFilename: string;
  storageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  pageCount: number;
  width: number | null;
  height: number | null;
  qrPageNumber: number;
  qrX: number;
  qrY: number;
  qrWidth: number;
  qrHeight: number;
  qrPlacements: TemplateQrPlacement[];
  shortTextEnabled: boolean;
  shortTextOffsetX: number | null;
  shortTextOffsetY: number | null;
}) {
  return prisma.template.create({
    data: {
      workspaceId: params.workspaceId,
      campaignId: params.campaignId,
      originalFilename: params.originalFilename,
      storageKey: params.storageKey,
      mimeType: params.mimeType,
      fileSizeBytes: params.fileSizeBytes,
      pageCount: params.pageCount,
      width: params.width,
      height: params.height,
      qrPageNumber: params.qrPageNumber,
      qrX: params.qrX,
      qrY: params.qrY,
      qrWidth: params.qrWidth,
      qrHeight: params.qrHeight,
      qrPlacements: params.qrPlacements as unknown as Prisma.InputJsonValue,
      shortTextEnabled: params.shortTextEnabled,
      shortTextOffsetX: params.shortTextOffsetX,
      shortTextOffsetY: params.shortTextOffsetY,
    },
    select: {
      id: true,
    },
  });
}

export async function updateCampaignTemplatePlacement(params: {
  workspaceId: string;
  campaignId: string;
  templateId: string;
  qrPageNumber: number;
  qrX: number;
  qrY: number;
  qrWidth: number;
  qrHeight: number;
  qrPlacements: TemplateQrPlacement[];
  shortTextEnabled: boolean;
  shortTextOffsetX: number | null;
  shortTextOffsetY: number | null;
}) {
  const template = await prisma.template.findFirst({
    where: {
      id: params.templateId,
      campaignId: params.campaignId,
      workspaceId: params.workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!template) {
    throw new Error("Template not found in the active workspace.");
  }

  return prisma.template.update({
    where: {
      id: template.id,
    },
    data: {
      qrPageNumber: params.qrPageNumber,
      qrX: params.qrX,
      qrY: params.qrY,
      qrWidth: params.qrWidth,
      qrHeight: params.qrHeight,
      qrPlacements: params.qrPlacements as unknown as Prisma.InputJsonValue,
      shortTextEnabled: params.shortTextEnabled,
      shortTextOffsetX: params.shortTextOffsetX,
      shortTextOffsetY: params.shortTextOffsetY,
    },
    select: {
      id: true,
    },
  });
}

export function estimatePdfPageCount(bytes: Uint8Array) {
  const pdfText = Buffer.from(bytes).toString("latin1");
  const matches = pdfText.match(/\/Type\s*\/Page\b/g);

  return Math.max(matches?.length ?? 0, 1);
}

export function estimatePdfPageDimensions(bytes: Uint8Array) {
  const pdfText = Buffer.from(bytes).toString("latin1");
  const mediaBoxMatch = pdfText.match(
    /\/MediaBox\s*\[\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]/,
  );

  if (!mediaBoxMatch) {
    return {
      width: null,
      height: null,
    };
  }

  const [, x1, y1, x2, y2] = mediaBoxMatch;
  const width = Number(x2) - Number(x1);
  const height = Number(y2) - Number(y1);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {
      width: null,
      height: null,
    };
  }

  return {
    width,
    height,
  };
}

export const templatesModule = {
  name: "templates",
  status: "upload-and-placement-enabled",
} as const;
