import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { generateQRCode } from "@/lib/qr-code";
import { resolveDemoWorkspace } from "@/domains/workspaces";
import { resolveTemplateStoragePath } from "@/server/storage/template-storage";
import { appConfig } from "@/server/config/app-config";

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
        shortTextEnabled: true,
        shortTextOffsetX: true,
        shortTextOffsetY: true,
      },
    });

    if (!template) {
      return new NextResponse("Template not found", { status: 404 });
    }

    if (
      template.qrPageNumber === null ||
      template.qrX === null ||
      template.qrY === null ||
      template.qrWidth === null ||
      template.qrHeight === null
    ) {
      return new NextResponse("QR placement is not defined yet", { status: 400 });
    }

    const templateBytes = await readFile(resolveTemplateStoragePath(template.storageKey));
    const pdfDocument = await PDFDocument.load(templateBytes);
    const pageIndex = Math.max(template.qrPageNumber - 1, 0);
    const page = pdfDocument.getPage(pageIndex);

    if (!page) {
      return new NextResponse("Configured QR page could not be found in the PDF", {
        status: 400,
      });
    }

    const qrContent = new URL(`/r/TEMPLATE-${template.id.slice(0, 8).toUpperCase()}`, appConfig.appUrl).toString();
    const qrImageBytes = await generateQRCode(qrContent, "image/png", {
      transparent: true,
    });
    const qrImage = await pdfDocument.embedPng(qrImageBytes);
    const pageSize = page.getSize();
    const sourceWidth = Number(template.width ?? pageSize.width);
    const sourceHeight = Number(template.height ?? pageSize.height);
    const scaleX = pageSize.width / sourceWidth;
    const scaleY = pageSize.height / sourceHeight;
    const qrX = Number(template.qrX) * scaleX;
    const qrWidth = Number(template.qrWidth) * scaleX;
    const qrHeight = Number(template.qrHeight) * scaleY;
    const qrY =
      pageSize.height - (Number(template.qrY) + Number(template.qrHeight)) * scaleY;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrWidth,
      height: qrHeight,
    });

    if (template.shortTextEnabled) {
      const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
      page.drawText("Preview", {
        x: qrX + Number(template.shortTextOffsetX ?? 0) * scaleX,
        y: qrY - 12 - Number(template.shortTextOffsetY ?? 0) * scaleY,
        size: 10,
        font,
        color: rgb(0.15, 0.17, 0.2),
      });
    }

    const renderedPdf = await pdfDocument.save();
    const printableFileName = template.originalFilename.replace(/\.pdf$/i, "") + "-print-preview.pdf";

    return new NextResponse(new Uint8Array(renderedPdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${printableFileName}"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate template print preview", error);
    return new NextResponse("Failed to generate print preview", { status: 500 });
  }
}
