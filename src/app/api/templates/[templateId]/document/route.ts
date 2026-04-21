import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDemoWorkspace } from "@/domains/workspaces";
import { resolveTemplateStoragePath } from "@/server/storage/template-storage";

type TemplateDocumentRouteProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: TemplateDocumentRouteProps,
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
        originalFilename: true,
        mimeType: true,
        storageKey: true,
      },
    });

    if (!template) {
      return new NextResponse("Template not found", { status: 404 });
    }

    const absolutePath = resolveTemplateStoragePath(template.storageKey);
    const file = await readFile(absolutePath);

    return new NextResponse(file, {
      headers: {
        "content-type": template.mimeType || "application/pdf",
        "content-disposition": `inline; filename="${template.originalFilename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to load template document", error);
    return new NextResponse("Failed to load template document", { status: 500 });
  }
}
