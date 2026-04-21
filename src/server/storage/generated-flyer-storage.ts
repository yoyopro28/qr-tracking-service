import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GENERATED_FLYER_ROOT = path.join(process.cwd(), "uploads", "generated-flyers");

export async function saveGeneratedFlyerPdf(params: {
  campaignId: string;
  shortcode: string;
  bytes: Uint8Array;
}) {
  const directory = path.join(GENERATED_FLYER_ROOT, params.campaignId);
  const fileName = `flyer-${params.shortcode}.pdf`;
  const absolutePath = path.join(directory, fileName);
  const storageKey = path.relative(process.cwd(), absolutePath);

  await mkdir(directory, { recursive: true });
  await writeFile(absolutePath, params.bytes);

  return {
    storageKey,
    absolutePath,
  };
}
