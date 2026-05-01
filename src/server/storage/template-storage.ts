import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  buildStorageKey,
  buildUploadPath,
  resolveUploadStoragePath,
} from "./upload-storage";

export function resolveTemplateStoragePath(storageKey: string) {
  return resolveUploadStoragePath(storageKey);
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
  const directory = buildUploadPath("templates", params.campaignId);
  const absolutePath = path.join(directory, fileName);
  const storageKey = buildStorageKey(absolutePath);

  await mkdir(directory, { recursive: true });
  await writeFile(absolutePath, params.bytes);

  return {
    storageKey,
    absolutePath,
  };
}
