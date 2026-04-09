import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeShortcode } from "@/domains/activations";

function hashIpAddress(ipAddress: string | null) {
  if (!ipAddress) {
    return null;
  }

  return createHash("sha256").update(ipAddress).digest("hex");
}

function getClientIpAddress(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  const realIp = headers.get("x-real-ip");

  return realIp?.trim() || null;
}

export async function getFlyerForRedirect(shortcode: string) {
  return prisma.flyer.findUnique({
    where: {
      shortcode: normalizeShortcode(shortcode),
    },
    select: {
      id: true,
      shortcode: true,
      workspaceId: true,
      campaignId: true,
      trackingUrl: true,
      status: true,
      campaign: {
        select: {
          id: true,
          destinationUrl: true,
        },
      },
      activations: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          locationId: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function logScanEventForFlyer(params: {
  flyer: Awaited<ReturnType<typeof getFlyerForRedirect>>;
  headers: Headers;
}) {
  if (!params.flyer) {
    return;
  }

  const clientIpAddress = getClientIpAddress(params.headers);
  const ipHash = hashIpAddress(clientIpAddress);
  const userAgent = params.headers.get("user-agent");
  const referer = params.headers.get("referer");
  const latestActivation = params.flyer.activations[0] ?? null;

  await prisma.scanEvent.create({
    data: {
      workspaceId: params.flyer.workspaceId,
      flyerId: params.flyer.id,
      campaignId: params.flyer.campaignId,
      locationId: latestActivation?.locationId ?? null,
      ipHash,
      userAgent,
      referer,
      isUniqueEstimate: false,
    },
  });
}

export const trackingModule = {
  name: "tracking",
  status: "redirect-and-scan-logging-enabled",
} as const;
