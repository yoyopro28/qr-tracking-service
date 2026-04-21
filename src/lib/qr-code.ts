import QRCode from "qrcode";

export type QRCodeFormat = "image/png" | "image/jpeg" | "image/webp" | "text";

interface QRCodeOptions {
  transparent?: boolean;
}

const TRANSPARENT_LIGHT_COLOR = "#FFFFFF00";
const OPAQUE_LIGHT_COLOR = "#FFFFFF";

/**
 * Generate a QR code from text/URL content
 * @param content - The text or URL to encode in the QR code
 * @param format - The output format (defaults to PNG)
 * @param options - Additional options (e.g., transparent background)
 * @returns Buffer containing the QR code image data
 */
export async function generateQRCode(
  content: string,
  format: QRCodeFormat = "image/png",
  options: QRCodeOptions = {},
): Promise<Buffer> {
  try {
    if (format === "text") {
      // Return ASCII art representation for terminal/text display
      return Buffer.from(await QRCode.toString(content, { type: "terminal" }));
    }

    // Determine colors based on transparency option
    // Note: JPEG doesn't support transparency, so we always use white background for JPEG
    const lightColor =
      format === "image/jpeg" || !options.transparent
        ? OPAQUE_LIGHT_COLOR
        : TRANSPARENT_LIGHT_COLOR;

    // Generate image QR code
    const buffer = await QRCode.toBuffer(content, {
      errorCorrectionLevel: "H", // High error correction for robustness
      type: format as "image/png" | "image/jpeg" | "image/webp",
      quality: 0.95,
      margin: 1,
      width: 300, // 300x300px for good print quality
      color: {
        dark: "#000000",
        light: lightColor,
      },
    });

    return buffer;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate QR code as data URL (for inline display in HTML)
 * @param content - The text or URL to encode
 * @param options - Additional options (e.g., transparent background)
 * @returns Data URL string that can be used in img src
 */
export async function generateQRCodeDataUrl(
  content: string,
  options: QRCodeOptions = {},
): Promise<string> {
  try {
    const lightColor = options.transparent ? TRANSPARENT_LIGHT_COLOR : OPAQUE_LIGHT_COLOR;

    return await QRCode.toDataURL(content, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: "#000000",
        light: lightColor,
      },
    });
  } catch (error) {
    console.error("Failed to generate QR code data URL:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate multiple QR codes for different formats
 * @param content - The content to encode
 * @param options - Additional options (e.g., transparent background)
 * @returns Object with QR codes in different formats
 */
export async function generateQRCodeMultiFormat(
  content: string,
  options: QRCodeOptions = {},
) {
  const [png, webp] = await Promise.all([
    generateQRCode(content, "image/png", options),
    generateQRCode(content, "image/webp", options),
  ]);

  return {
    png,
    webp,
    dataUrl: await generateQRCodeDataUrl(content, options),
  };
}
