import { ActivationSource, FlyerStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivationFormValues = {
  locationId: string;
  newLocationName: string;
};

export type ActivationFieldErrors = Partial<Record<keyof ActivationFormValues, string[]>>;

export function normalizeShortcode(value: string) {
  return value.trim().toUpperCase();
}

export function validateActivationInput(values: ActivationFormValues) {
  const locationId = values.locationId.trim();
  const newLocationName = values.newLocationName.trim();
  const fieldErrors: ActivationFieldErrors = {};

  if (!locationId && !newLocationName) {
    fieldErrors.locationId = ["Select an existing location or enter a new one."];
  }

  if (locationId && newLocationName) {
    fieldErrors.locationId = ["Choose either an existing location or a new location name."];
    fieldErrors.newLocationName = ["Choose either an existing location or a new location name."];
  }

  return {
    values: {
      locationId,
      newLocationName,
    },
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}

export async function getFlyerForActivationByShortcode(workspaceId: string, shortcode: string) {
  return prisma.flyer.findFirst({
    where: {
      workspaceId,
      shortcode,
    },
    select: {
      id: true,
      shortcode: true,
      status: true,
      trackingUrl: true,
      activatedAt: true,
      createdAt: true,
      campaign: {
        select: {
          id: true,
          name: true,
        },
      },
      template: {
        select: {
          id: true,
          originalFilename: true,
        },
      },
      activations: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          createdAt: true,
          source: true,
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function listWorkspaceLocationsForCampaign(workspaceId: string, campaignId: string) {
  return prisma.location.findMany({
    where: {
      workspaceId,
      OR: [{ campaignId }, { campaignId: null }],
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      campaignId: true,
      city: true,
      country: true,
      createdAt: true,
    },
  });
}

export async function getWorkspaceLocationForActivation(params: {
  workspaceId: string;
  campaignId: string;
  locationId: string;
}) {
  return prisma.location.findFirst({
    where: {
      id: params.locationId,
      workspaceId: params.workspaceId,
      OR: [{ campaignId: params.campaignId }, { campaignId: null }],
    },
    select: {
      id: true,
    },
  });
}

export async function activateFlyer(params: {
  workspaceId: string;
  flyerId: string;
  campaignId: string;
  locationId?: string;
  newLocationName?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const flyer = await tx.flyer.findFirst({
      where: {
        id: params.flyerId,
        workspaceId: params.workspaceId,
        campaignId: params.campaignId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!flyer) {
      throw new Error("Flyer not found in the active workspace.");
    }

    if (flyer.status === FlyerStatus.ACTIVATED) {
      throw new Error("This flyer is already activated.");
    }

    let locationId = params.locationId;

    if (!locationId && params.newLocationName) {
      const createdLocation = await tx.location.create({
        data: {
          workspaceId: params.workspaceId,
          campaignId: params.campaignId,
          name: params.newLocationName,
        },
        select: {
          id: true,
        },
      });

      locationId = createdLocation.id;
    }

    if (!locationId) {
      throw new Error("A location is required for activation.");
    }

    try {
      await tx.activation.create({
        data: {
          workspaceId: params.workspaceId,
          flyerId: params.flyerId,
          locationId,
          source: ActivationSource.MANUAL_ADMIN_ENTRY,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new Error("The selected location could not be used for activation.");
      }

      throw error;
    }

    await tx.flyer.update({
      where: {
        id: params.flyerId,
      },
      data: {
        status: FlyerStatus.ACTIVATED,
        activatedAt: new Date(),
      },
    });
  });
}

export const activationsModule = {
  name: "activations",
  status: "admin-activation-enabled",
} as const;
