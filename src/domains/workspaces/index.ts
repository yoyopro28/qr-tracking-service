import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const DEMO_WORKSPACE_SLUG = "demo-workspace";
const DEMO_WORKSPACE_NAME = "Demo Workspace";

export async function resolveDemoWorkspace() {
  const existingWorkspace = await prisma.workspace.findUnique({
    where: { slug: DEMO_WORKSPACE_SLUG },
  });

  if (existingWorkspace) {
    return existingWorkspace;
  }

  try {
    return await prisma.workspace.create({
      data: {
        slug: DEMO_WORKSPACE_SLUG,
        name: DEMO_WORKSPACE_NAME,
      },
    });
  } catch (error) {
    // Another request may have created the same demo workspace concurrently.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentWorkspace = await prisma.workspace.findUnique({
        where: { slug: DEMO_WORKSPACE_SLUG },
      });

      if (concurrentWorkspace) {
        return concurrentWorkspace;
      }
    }

    throw error;
  }
}

export const workspacesModule = {
  name: "workspaces",
  status: "demo-workspace-enabled",
  demoWorkspaceSlug: DEMO_WORKSPACE_SLUG,
} as const;
