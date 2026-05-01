import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildStorageKey, buildUploadPath } from "./upload-storage";

export async function saveGeneratedFlyerPdf(params: {
  campaignId: string;
  shortcode: string;
  bytes: Uint8Array;
}) {
  const directory = buildUploadPath("generated-flyers", params.campaignId);
  const fileName = `flyer-${params.shortcode}.pdf`;
  const absolutePath = path.join(directory, fileName);
  const storageKey = buildStorageKey(absolutePath);

  await mkdir(directory, { recursive: true });
  await writeFile(absolutePath, params.bytes);

  return {
    storageKey,
    absolutePath,
  };
}
