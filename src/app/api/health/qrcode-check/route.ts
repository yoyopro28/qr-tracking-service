import { NextResponse } from "next/server";

/**
 * GET /api/health/qrcode-check
 * Simple health check for qrcode library
 */
export async function GET() {
  try {
    // Try to import qrcode
    const QRCode = await import("qrcode").then((m) => m.default);

    if (!QRCode) {
      return NextResponse.json(
        { status: "error", message: "qrcode module exported as falsy" },
        { status: 500 },
      );
    }

    // Try to generate a simple QR code
    const testBuffer = await QRCode.toBuffer("test", {
      width: 100,
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    return NextResponse.json({
      status: "ok",
      message: "qrcode library is working",
      testQRSize: testBuffer.length,
    });
  } catch (error) {
    console.error("qrcode health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        hint: "Run 'npm install qrcode' to install the library",
      },
      { status: 500 },
    );
  }
}
