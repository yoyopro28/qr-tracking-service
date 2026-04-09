import { NextResponse } from "next/server";
import { getFlyerForRedirect, logScanEventForFlyer } from "@/domains/tracking";

type RedirectRouteProps = {
  params: Promise<{
    shortcode: string;
  }>;
};

export async function GET(request: Request, { params }: RedirectRouteProps) {
  const { shortcode } = await params;
  const flyer = await getFlyerForRedirect(shortcode);

  if (!flyer) {
    return new NextResponse("Flyer not found.", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  try {
    await logScanEventForFlyer({
      flyer,
      headers: request.headers,
    });
  } catch (error) {
    console.error("Failed to log scan event", error);
  }

  return NextResponse.redirect(flyer.campaign.destinationUrl, {
    status: 307,
  });
}
