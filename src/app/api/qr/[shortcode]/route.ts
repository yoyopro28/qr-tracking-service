import { NextResponse } from "next/server";
import { generateQRCode, generateQRCodeDataUrl } from "@/lib/qr-code";
import { prisma } from "@/lib/prisma";
import { normalizeShortcode } from "@/domains/activations";

type QRRouteProps = {
  params: Promise<{
    shortcode: string;
  }>;
};

/**
 * GET /api/qr/[shortcode]
 * Returns a QR code for the given shortcode
 * Query parameters:
 * - format: 'png' (default), 'webp', 'dataUrl'
 * - transparent: 'true' or 'false' (default: false) - for transparent background
 */
export async function GET(request: Request, { params }: QRRouteProps) {
  try {
    const { shortcode } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "png";
    const transparent = searchParams.get("transparent") === "true";

    // Normalize and validate shortcode
    const normalizedShortcode = normalizeShortcode(shortcode);

    // Verify the flyer exists
    const flyer = await prisma.flyer.findUnique({
      where: {
        shortcode: normalizedShortcode,
      },
      select: {
        trackingUrl: true,
      },
    });

    if (!flyer) {
      return new NextResponse("Shortcode not found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    // Generate QR code based on format
    if (format === "dataUrl") {
      const dataUrl = await generateQRCodeDataUrl(flyer.trackingUrl, { transparent });
      return NextResponse.json({ dataUrl });
    }

    const qrBuffer = await generateQRCode(
      flyer.trackingUrl,
      format === "webp" ? "image/webp" : "image/png",
      { transparent },
    );

    // Return image with appropriate headers
    const mimeType = format === "webp" ? "image/webp" : "image/png";
    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        "content-type": mimeType,
        "cache-control": "public, max-age=86400", // Cache for 24 hours
        "content-disposition": `inline; filename="qr-${normalizedShortcode}${transparent ? "-transparent" : ""}.${format === "webp" ? "webp" : "png"}"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate QR code:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return detailed error response in development
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment && error instanceof Error ? error.message : "Failed to generate QR code";

    return new NextResponse(errorMessage, {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
}
