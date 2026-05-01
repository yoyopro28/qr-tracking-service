import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStoredTemplateQrPlacements } from "@/domains/templates";
import { resolveDemoWorkspace } from "@/domains/workspaces";
import { appConfig } from "@/server/config/app-config";
import {
  QrPlacementRenderError,
  renderTemplatePdfWithQrPlacements,
} from "@/server/pdf/qr-placement-renderer";

type TemplatePrintPreviewRouteProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: TemplatePrintPreviewRouteProps,
) {
  try {
    const { templateId } = await params;
    const workspace = await resolveDemoWorkspace();
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
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

    if (!template) {
      return new NextResponse("Template not found", { status: 404 });
    }

    const qrPlacements = getStoredTemplateQrPlacements(template);
    const renderedPdf = await renderTemplatePdfWithQrPlacements({
      templateStorageKey: template.storageKey,
      sourceWidth: template.width,
      sourceHeight: template.height,
      items: qrPlacements.map((placement, index) => ({
        qrContent: new URL(
          `/r/TEMPLATE-${template.id.slice(0, 8).toUpperCase()}-${index + 1}`,
          appConfig.appUrl,
        ).toString(),
        qrPlacement: {
          pageNumber: placement.pageNumber,
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
        },
        shortText: {
          enabled: template.shortTextEnabled,
          label: `Preview ${index + 1}`,
          offsetX: template.shortTextOffsetX,
          offsetY: template.shortTextOffsetY,
        },
      })),
    });
    const printableFileName = template.originalFilename.replace(/\.pdf$/i, "") + "-print-preview.pdf";

    return new NextResponse(new Uint8Array(renderedPdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${printableFileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof QrPlacementRenderError) {
      if (error.code === "INCOMPLETE_PLACEMENT") {
        return new NextResponse("QR placement is not defined yet", { status: 400 });
      }

      if (error.code === "PAGE_NOT_FOUND") {
        return new NextResponse("Configured QR page could not be found in the PDF", {
          status: 400,
        });
      }

      if (error.code === "INVALID_SOURCE_SIZE") {
        return new NextResponse("Template PDF dimensions are invalid", { status: 400 });
      }
    }

    console.error("Failed to generate template print preview", error);
    return new NextResponse("Failed to generate print preview", { status: 500 });
  }
}
