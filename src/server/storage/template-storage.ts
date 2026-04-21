import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const TEMPLATE_UPLOAD_ROOT = path.join(process.cwd(), "uploads", "templates");

export function resolveTemplateStoragePath(storageKey: string) {
  const absolutePath = path.resolve(process.cwd(), storageKey);
  const uploadsRoot = path.resolve(process.cwd(), "uploads");

  if (!absolutePath.startsWith(uploadsRoot)) {
    throw new Error("Invalid template path.");
  }

  return absolutePath;
}

export async function saveTemplateUpload(params: {
  campaignId: string;
  originalFilename: string;
  bytes: Uint8Array;
}) {
  const sanitizedBaseName = path
    .basename(params.originalFilename, path.extname(params.originalFilename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const fileName = `${sanitizedBaseName || "template"}-${randomUUID()}.pdf`;
  const directory = path.join(TEMPLATE_UPLOAD_ROOT, params.campaignId);
  const absolutePath = path.join(directory, fileName);
  const storageKey = path.relative(process.cwd(), absolutePath);

  await mkdir(directory, { recursive: true });
  await writeFile(absolutePath, params.bytes);

  return {
    storageKey,
    absolutePath,
  };
}
