import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDemoWorkspace } from "@/domains/workspaces";
import { resolveTemplateStoragePath } from "@/server/storage/template-storage";

type FlyerDocumentRouteProps = {
  params: Promise<{
    flyerId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: FlyerDocumentRouteProps,
) {
  try {
    const { flyerId } = await params;
    const workspace = await resolveDemoWorkspace();
    const flyer = await prisma.flyer.findFirst({
      where: {
        id: flyerId,
        workspaceId: workspace.id,
      },
      select: {
        shortcode: true,
        generatedPdfStorageKey: true,
      },
    });

    if (!flyer || !flyer.generatedPdfStorageKey) {
      return new NextResponse("Generated flyer PDF not found", { status: 404 });
    }

    const batchQrCount = await prisma.flyer.count({
      where: {
        workspaceId: workspace.id,
        generatedPdfStorageKey: flyer.generatedPdfStorageKey,
      },
    });
    const absolutePath = resolveTemplateStoragePath(flyer.generatedPdfStorageKey);
    const file = await readFile(absolutePath);
    const filePrefix = batchQrCount > 1 ? "batch" : "flyer";

    return new NextResponse(file, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filePrefix}-${flyer.shortcode}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Failed to load generated flyer PDF", error);
    return new NextResponse("Failed to load generated flyer PDF", { status: 500 });
  }
}
