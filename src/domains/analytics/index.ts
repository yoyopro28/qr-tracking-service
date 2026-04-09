import { prisma } from "@/lib/prisma";

export async function getWorkspaceAnalytics(workspaceId: string) {
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

  const [scanCountsByFlyer, scanCountsByLocation] = await Promise.all([
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
      take: 8,
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
    topLocations: scanCountsByLocation.map((item) => {
      const location = item.locationId ? locationMap.get(item.locationId) : null;

      return {
        locationId: item.locationId,
        name: location?.name ?? "Unassigned",
        campaignName: location?.campaign?.name ?? null,
        scanCount: item._count._all,
      };
    }),
    recentScanEvents,
  };
}

export const analyticsModule = {
  name: "analytics",
  status: "dashboard-enabled",
} as const;
