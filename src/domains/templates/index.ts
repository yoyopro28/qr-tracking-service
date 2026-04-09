import { Buffer } from "node:buffer";
import { prisma } from "@/lib/prisma";

const MAX_TEMPLATE_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export type TemplateFormValues = {
  templateFile: File | null;
  qrPageNumber: string;
  qrX: string;
  qrY: string;
  qrWidth: string;
  qrHeight: string;
  shortTextEnabled: boolean;
  shortTextOffsetX: string;
  shortTextOffsetY: string;
};

export type TemplateFieldErrors = Partial<
  Record<
    | "templateFile"
    | "qrPageNumber"
    | "qrX"
    | "qrY"
    | "qrWidth"
    | "qrHeight"
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
  shortTextEnabled: boolean;
  shortTextOffsetX: number | null;
  shortTextOffsetY: number | null;
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
  const shortTextOffsetX = parseNonNegativeDecimal(values.shortTextOffsetX, "shortTextOffsetX", {
    required: false,
  });
  const shortTextOffsetY = parseNonNegativeDecimal(values.shortTextOffsetY, "shortTextOffsetY", {
    required: false,
  });

  for (const [key, result] of Object.entries({
    qrPageNumber,
    qrX,
    qrY,
    qrWidth,
    qrHeight,
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
    shortTextEnabled: values.shortTextEnabled,
    shortTextOffsetX: values.shortTextOffsetX.trim(),
    shortTextOffsetY: values.shortTextOffsetY.trim(),
  };

  const isValid = Object.keys(fieldErrors).length === 0;

  return {
    fieldErrors,
    values: normalizedValues,
    isValid,
    parsedValues: isValid
      ? ({
          templateFile: templateFile as File,
          qrPageNumber: qrPageNumber.value as number,
          qrX: qrX.value as number,
          qrY: qrY.value as number,
          qrWidth: qrWidth.value as number,
          qrHeight: qrHeight.value as number,
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
  qrPageNumber: number;
  qrX: number;
  qrY: number;
  qrWidth: number;
  qrHeight: number;
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
      qrPageNumber: params.qrPageNumber,
      qrX: params.qrX,
      qrY: params.qrY,
      qrWidth: params.qrWidth,
      qrHeight: params.qrHeight,
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

export const templatesModule = {
  name: "templates",
  status: "upload-and-placement-enabled",
} as const;
