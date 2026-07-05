import { ActivationSource, FlyerStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateLocationCoordinates } from "@/domains/locations";

export type ActivationFormValues = {
  locationId: string;
  newLocationName: string;
  newLocationLatitude: string;
  newLocationLongitude: string;
  source: ActivationInputSource;
};

export type ActivationFieldErrors = Partial<Record<keyof ActivationFormValues, string[]>>;
export type ActivationInputSource = "manual_admin_entry" | "admin_scan";

export function normalizeShortcode(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeActivationInputSource(value: string): ActivationInputSource {
  return value === "admin_scan" ? "admin_scan" : "manual_admin_entry";
}

function toActivationSource(source: ActivationInputSource) {
  return source === "admin_scan"
    ? ActivationSource.ADMIN_SCAN
    : ActivationSource.MANUAL_ADMIN_ENTRY;
}

export function validateActivationInput(values: ActivationFormValues) {
  const locationId = values.locationId.trim();
  const newLocationName = values.newLocationName.trim();
  const coordinateValidation = validateLocationCoordinates({
    latitude: values.newLocationLatitude,
    longitude: values.newLocationLongitude,
  });
  const source = normalizeActivationInputSource(values.source);
  const fieldErrors: ActivationFieldErrors = {};

  if (!locationId && !newLocationName) {
    fieldErrors.locationId = ["Select an existing location or enter a new one."];
  }

  if (locationId && newLocationName) {
    fieldErrors.locationId = ["Choose either an existing location or a new location name."];
    fieldErrors.newLocationName = ["Choose either an existing location or a new location name."];
  }

  if (locationId && (coordinateValidation.values.latitude || coordinateValidation.values.longitude)) {
    const message = "Coordinates can only be entered when creating a new location.";
    fieldErrors.newLocationLatitude = [message];
    fieldErrors.newLocationLongitude = [message];
  } else {
    if (coordinateValidation.fieldErrors.latitude) {
      fieldErrors.newLocationLatitude = coordinateValidation.fieldErrors.latitude;
    }
    if (coordinateValidation.fieldErrors.longitude) {
      fieldErrors.newLocationLongitude = coordinateValidation.fieldErrors.longitude;
    }
  }

  return {
    values: {
      locationId,
      newLocationName,
      newLocationLatitude: coordinateValidation.values.latitude,
      newLocationLongitude: coordinateValidation.values.longitude,
      source,
    },
    coordinates: coordinateValidation.coordinates,
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
      archivedAt: null,
      OR: [{ campaignId }, { campaignId: null }],
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      campaignId: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
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
      archivedAt: null,
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
  newLocationLatitude?: number;
  newLocationLongitude?: number;
  source?: ActivationInputSource;
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
          latitude: params.newLocationLatitude,
          longitude: params.newLocationLongitude,
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
          source: toActivationSource(params.source ?? "manual_admin_entry"),
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
