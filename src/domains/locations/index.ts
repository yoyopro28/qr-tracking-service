import { prisma } from "@/lib/prisma";

export type LocationCoordinateValues = {
  latitude: string;
  longitude: string;
};

export type LocationCoordinateFieldErrors = Partial<
  Record<keyof LocationCoordinateValues, string[]>
>;

export function validateLocationCoordinates(values: LocationCoordinateValues) {
  const latitude = values.latitude.trim();
  const longitude = values.longitude.trim();
  const fieldErrors: LocationCoordinateFieldErrors = {};

  if (Boolean(latitude) !== Boolean(longitude)) {
    const message = "Enter both latitude and longitude, or leave both empty.";
    fieldErrors.latitude = [message];
    fieldErrors.longitude = [message];
  }

  const latitudeNumber = latitude ? Number(latitude) : null;
  const longitudeNumber = longitude ? Number(longitude) : null;

  if (
    latitude &&
    (latitudeNumber === null ||
      !Number.isFinite(latitudeNumber) ||
      latitudeNumber < -90 ||
      latitudeNumber > 90)
  ) {
    fieldErrors.latitude = ["Latitude must be a number between -90 and 90."];
  }

  if (
    longitude &&
    (longitudeNumber === null ||
      !Number.isFinite(longitudeNumber) ||
      longitudeNumber < -180 ||
      longitudeNumber > 180)
  ) {
    fieldErrors.longitude = ["Longitude must be a number between -180 and 180."];
  }

  return {
    values: {
      latitude,
      longitude,
    },
    coordinates:
      Object.keys(fieldErrors).length === 0 && latitudeNumber !== null && longitudeNumber !== null
        ? { latitude: latitudeNumber, longitude: longitudeNumber }
        : null,
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}

export async function listWorkspaceLocations(workspaceId: string) {
  return prisma.location.findMany({
    where: { workspaceId },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      archivedAt: true,
      campaign: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          activations: true,
          scanEvents: true,
        },
      },
    },
  });
}

export async function deleteUnusedWorkspaceLocation(params: {
  workspaceId: string;
  locationId: string;
}) {
  const result = await prisma.location.deleteMany({
    where: {
      id: params.locationId,
      workspaceId: params.workspaceId,
      activations: { none: {} },
      scanEvents: { none: {} },
    },
  });

  if (result.count !== 1) {
    throw new Error("Only locations without activations or scans can be deleted.");
  }
}

export async function archiveWorkspaceLocation(params: {
  workspaceId: string;
  locationId: string;
}) {
  const result = await prisma.location.updateMany({
    where: {
      id: params.locationId,
      workspaceId: params.workspaceId,
      archivedAt: null,
    },
    data: {
      archivedAt: new Date(),
    },
  });

  if (result.count !== 1) {
    throw new Error("The location could not be archived.");
  }
}

export async function restoreWorkspaceLocation(params: {
  workspaceId: string;
  locationId: string;
}) {
  const result = await prisma.location.updateMany({
    where: {
      id: params.locationId,
      workspaceId: params.workspaceId,
      archivedAt: { not: null },
    },
    data: {
      archivedAt: null,
    },
  });

  if (result.count !== 1) {
    throw new Error("The location could not be restored.");
  }
}

export async function updateWorkspaceLocationCoordinates(params: {
  workspaceId: string;
  locationId: string;
  latitude: number | null;
  longitude: number | null;
}) {
  const result = await prisma.location.updateMany({
    where: {
      id: params.locationId,
      workspaceId: params.workspaceId,
    },
    data: {
      latitude: params.latitude,
      longitude: params.longitude,
    },
  });

  if (result.count !== 1) {
    throw new Error("Location not found in the active workspace.");
  }
}

export const locationsModule = {
  name: "locations",
  status: "coordinate-management-enabled",
} as const;
