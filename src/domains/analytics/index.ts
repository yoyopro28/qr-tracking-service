import { prisma } from "@/lib/prisma";

const ANALYTICS_TIME_ZONE = "Europe/Berlin";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

type LocationPerformanceLevel = "leader" | "hot" | "today" | "active" | "quiet" | "archived";

function getZonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second")),
  };
}

function startOfTodayInTimeZone(date: Date, timeZone: string) {
  const today = getZonedDateParts(date, timeZone);
  const utcMidnight = Date.UTC(today.year, today.month - 1, today.day);
  const partsAtUtcMidnight = getZonedDateParts(new Date(utcMidnight), timeZone);
  const zonedUtcEquivalent = Date.UTC(
    partsAtUtcMidnight.year,
    partsAtUtcMidnight.month - 1,
    partsAtUtcMidnight.day,
    partsAtUtcMidnight.hour,
    partsAtUtcMidnight.minute,
    partsAtUtcMidnight.second,
  );
  const offset = zonedUtcEquivalent - utcMidnight;

  return new Date(utcMidnight - offset);
}

function getLocationPerformance(params: {
  archived: boolean;
  totalScans: number;
  todayScans: number;
  sevenDayScans: number;
  highestSevenDayScans: number;
}): { level: LocationPerformanceLevel; emoji: string; label: string } {
  if (params.archived) {
    return { level: "archived", emoji: "📦", label: "Archived" };
  }

  if (params.highestSevenDayScans > 0 && params.sevenDayScans === params.highestSevenDayScans) {
    return { level: "leader", emoji: "🏆", label: "Top location this week" };
  }

  if (
    params.highestSevenDayScans > 0 &&
    params.sevenDayScans >= Math.max(2, Math.ceil(params.highestSevenDayScans * 0.6))
  ) {
    return { level: "hot", emoji: "🔥", label: "Strong this week" };
  }

  if (params.todayScans > 0) {
    return { level: "today", emoji: "⚡", label: "Active today" };
  }

  if (params.sevenDayScans > 0) {
    return { level: "active", emoji: "✨", label: "Active this week" };
  }

  return params.totalScans > 0
    ? { level: "quiet", emoji: "💤", label: "Quiet this week" }
    : { level: "quiet", emoji: "🌱", label: "Waiting for first scan" };
}

export async function getWorkspaceAnalytics(workspaceId: string) {
  const now = new Date();
  const todayStart = startOfTodayInTimeZone(now, ANALYTICS_TIME_ZONE);
  const sevenDayStart = new Date(now.getTime() - 7 * DAY_IN_MILLISECONDS);
  const [totalScans, totalFlyers, totalActivatedFlyers, campaignStats, recentScanEvents] =
    await Promise.all([
      prisma.scanEvent.count({
        where: { workspaceId },
      }),
      prisma.flyer.count({
        where: { workspaceId },
      }),
      prisma.flyer.count({
        where: {
          workspaceId,
          status: "ACTIVATED",
        },
      }),
      prisma.campaign.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              scanEvents: true,
              flyers: true,
            },
          },
        },
      }),
      prisma.scanEvent.findMany({
        where: { workspaceId },
        orderBy: { occurredAt: "desc" },
        take: 12,
        select: {
          id: true,
          occurredAt: true,
          userAgent: true,
          referer: true,
          flyer: {
            select: {
              id: true,
              shortcode: true,
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

  const [
    scanCountsByFlyer,
    scanCountsByLocation,
    workspaceLocations,
    todayScanCountsByLocation,
    sevenDayScanCountsByLocation,
    recentLocationScanEvents,
  ] = await Promise.all([
    prisma.scanEvent.groupBy({
      by: ["flyerId"],
      where: { workspaceId },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          flyerId: "desc",
        },
      },
      take: 8,
    }),
    prisma.scanEvent.groupBy({
      by: ["locationId"],
      where: {
        workspaceId,
        locationId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          locationId: "desc",
        },
      },
    }),
    prisma.location.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        archivedAt: true,
        campaign: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.scanEvent.groupBy({
      by: ["locationId"],
      where: {
        workspaceId,
        locationId: { not: null },
        occurredAt: { gte: todayStart },
      },
      _count: { _all: true },
    }),
    prisma.scanEvent.groupBy({
      by: ["locationId"],
      where: {
        workspaceId,
        locationId: { not: null },
        occurredAt: { gte: sevenDayStart },
      },
      _count: { _all: true },
    }),
    prisma.scanEvent.findMany({
      where: {
        workspaceId,
        locationId: { not: null },
      },
      orderBy: { occurredAt: "desc" },
      take: 300,
      select: {
        locationId: true,
        occurredAt: true,
        flyer: {
          select: {
            shortcode: true,
          },
        },
        campaign: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const flyerIds = scanCountsByFlyer.map((item) => item.flyerId);
  const locationIds = scanCountsByLocation
    .map((item) => item.locationId)
    .filter((id): id is string => Boolean(id));

  const [flyers, locations] = await Promise.all([
    flyerIds.length
      ? prisma.flyer.findMany({
          where: {
            id: {
              in: flyerIds,
            },
          },
          select: {
            id: true,
            shortcode: true,
            campaign: {
              select: {
                name: true,
              },
            },
          },
        })
      : [],
    locationIds.length
      ? prisma.location.findMany({
          where: {
            id: {
              in: locationIds,
            },
          },
          select: {
            id: true,
            name: true,
            archivedAt: true,
            campaign: {
              select: {
                name: true,
              },
            },
          },
        })
      : [],
  ]);

  const flyerMap = new Map(flyers.map((flyer) => [flyer.id, flyer]));
  const locationMap = new Map(locations.map((location) => [location.id, location]));
  const scanCountByLocationId = new Map(
    scanCountsByLocation.flatMap((item) =>
      item.locationId ? [[item.locationId, item._count._all] as const] : [],
    ),
  );
  const todayScanCountByLocationId = new Map(
    todayScanCountsByLocation.flatMap((item) =>
      item.locationId ? [[item.locationId, item._count._all] as const] : [],
    ),
  );
  const sevenDayScanCountByLocationId = new Map(
    sevenDayScanCountsByLocation.flatMap((item) =>
      item.locationId ? [[item.locationId, item._count._all] as const] : [],
    ),
  );
  const recentScansByLocationId = new Map<
    string,
    Array<{ occurredAt: string; shortcode: string; campaignName: string }>
  >();

  for (const event of recentLocationScanEvents) {
    if (!event.locationId) {
      continue;
    }

    const locationScans = recentScansByLocationId.get(event.locationId) ?? [];
    if (locationScans.length >= 3) {
      continue;
    }

    locationScans.push({
      occurredAt: event.occurredAt.toISOString(),
      shortcode: event.flyer.shortcode,
      campaignName: event.campaign.name,
    });
    recentScansByLocationId.set(event.locationId, locationScans);
  }

  const highestSevenDayScans = Math.max(
    0,
    ...workspaceLocations
      .filter((location) => !location.archivedAt)
      .map((location) => sevenDayScanCountByLocationId.get(location.id) ?? 0),
  );

  return {
    summary: {
      totalScans,
      totalFlyers,
      totalActivatedFlyers,
      totalCampaigns: campaignStats.length,
      topLocationScans: scanCountsByLocation[0]?._count._all ?? 0,
    },
    campaignStats: campaignStats.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      flyerCount: campaign._count.flyers,
      scanCount: campaign._count.scanEvents,
    })),
    topFlyers: scanCountsByFlyer.map((item) => ({
      flyerId: item.flyerId,
      shortcode: flyerMap.get(item.flyerId)?.shortcode ?? item.flyerId,
      campaignName: flyerMap.get(item.flyerId)?.campaign.name ?? "Unknown campaign",
      scanCount: item._count._all,
    })),
    topLocations: scanCountsByLocation.slice(0, 8).map((item) => {
      const location = item.locationId ? locationMap.get(item.locationId) : null;

      return {
        locationId: item.locationId,
        name: location?.name ?? "Unassigned",
        campaignName: location?.campaign?.name ?? null,
        archived: Boolean(location?.archivedAt),
        scanCount: item._count._all,
      };
    }),
    mapLocations: workspaceLocations.flatMap((location) => {
      if (location.latitude === null || location.longitude === null) {
        return [];
      }

      const scanCount = scanCountByLocationId.get(location.id) ?? 0;
      const todayScanCount = todayScanCountByLocationId.get(location.id) ?? 0;
      const sevenDayScanCount = sevenDayScanCountByLocationId.get(location.id) ?? 0;
      const archived = Boolean(location.archivedAt);

      return [
        {
          id: location.id,
          name: location.name,
          campaignName: location.campaign?.name ?? null,
          latitude: location.latitude,
          longitude: location.longitude,
          scanCount,
          todayScanCount,
          sevenDayScanCount,
          recentScans: recentScansByLocationId.get(location.id) ?? [],
          archived,
          performance: getLocationPerformance({
            archived,
            totalScans: scanCount,
            todayScans: todayScanCount,
            sevenDayScans: sevenDayScanCount,
            highestSevenDayScans,
          }),
        },
      ];
    }),
    unmappedLocationCount: workspaceLocations.filter(
      (location) => location.latitude === null || location.longitude === null,
    ).length,
    recentScanEvents,
  };
}

export const analyticsModule = {
  name: "analytics",
  status: "dashboard-enabled",
} as const;
