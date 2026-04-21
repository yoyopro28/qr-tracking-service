# QR Code Generation

## Overview

The QR code generation feature allows you to create QR codes from shortcodes and tracking URLs. This enables easy distribution of tracking links in print materials and digital formats.

## Features

- **On-demand QR generation**: QR codes are generated dynamically from shortcodes
- **Multiple formats**: PNG, WebP, and data URLs for flexible integration
- **High error correction**: Uses level H error correction for robust scanning
- **Caching**: Generated QR codes are cached for 24 hours to improve performance
- **Download support**: Users can download QR codes in different formats

## API Endpoint

### GET /api/qr/[shortcode]

Returns a QR code image for the given shortcode.

**Parameters:**
- `shortcode` (path): The 8-character shortcode of the flyer
- `format` (query, optional): Output format - `png` (default), `webp`, or `dataUrl`
- `transparent` (query, optional): `true` or `false` (default: false) - Generate with transparent background

**Response:**
- `png`, `webp`: Returns binary image data with appropriate content-type header
- `dataUrl`: Returns JSON with `{ dataUrl: string }` containing a base64-encoded data URL

**Examples:**

```bash
# Get PNG image with white background
curl https://yourdomain.com/api/qr/ABC12345 > qr.png

# Get PNG image with transparent background
curl https://yourdomain.com/api/qr/ABC12345?transparent=true > qr-transparent.png

# Get WebP image (smaller file size)
curl https://yourdomain.com/api/qr/ABC12345?format=webp > qr.webp

# Get WebP with transparent background
curl https://yourdomain.com/api/qr/ABC12345?format=webp&transparent=true > qr-transparent.webp

# Get data URL (for embedding in HTML)
curl https://yourdomain.com/api/qr/ABC12345?format=dataUrl
# Response: { "dataUrl": "data:image/png;base64,iVBOR..." }

# Get transparent data URL
curl https://yourdomain.com/api/qr/ABC12345?format=dataUrl&transparent=true
```

## React Component

### QRCodeViewer

Display and download QR codes in your React components.

**Props:**
- `shortcode` (string, required): The shortcode of the flyer
- `trackingUrl` (string, optional): Display the tracking URL below the QR code
- `enableDownload` (boolean, default: true): Show download buttons
- `size` (enum, default: "medium"): Display size - "small" (200px), "medium" (300px), or "large" (400px)

**Features:**
- Toggle for transparent/opaque background
- Download in PNG or WebP format
- Automatic background adaptation based on transparency setting

**Example:**

```tsx
import { QRCodeViewer } from "@/components/flyers/qr-code-viewer";

export function FlyerDetails({ flyer }) {
  return (
    <div>
      <h2>Flyer: {flyer.shortcode}</h2>
      <QRCodeViewer
        shortcode={flyer.shortcode}
        trackingUrl={flyer.trackingUrl}
        size="large"
        enableDownload={true}
      />
    </div>
  );
}
```

The component includes a checkbox to toggle between transparent and opaque backgrounds on-the-fly.

## Implementation Details

### QR Code Specifications

- **Size**: 300x300 pixels (can be scaled without quality loss)
- **Error Correction**: Level H (30% of data can be restored if damaged)
- **Margin**: 1 module border
- **Colors**: Black (#000000) on white (#FFFFFF) or transparent
- **Quality**: 0.95 (95% JPEG quality for formats that support it)
- **Transparency**: Supported for PNG and WebP formats (not JPEG)
  - When `transparent=true`, the light background becomes transparent (RGBA)
  - JPEG format ignores transparency setting and always uses white background

### Service Functions

The `src/lib/qr-code.ts` module provides:

- `generateQRCode(content, format)`: Generate QR code as buffer
- `generateQRCodeDataUrl(content)`: Generate as base64 data URL
- `generateQRCodeMultiFormat(content)`: Generate in multiple formats at once

## Use Cases

1. **Print Materials**: Generate and print QR codes on flyers, posters, or packaging
   - Use transparent background for overlay on colored backgrounds
   - Use opaque for standard white paper prints

2. **Digital Distribution**: Embed QR codes in emails, social media, or websites
   - Transparent for flexible placement on any background
   - Download as WebP for web optimization

3. **Analytics Integration**: Track scans through the shortcode redirect system

4. **Campaign Management**: Users can download QR codes from the campaign dashboard
   - Choose format (PNG/WebP) and background style per download

## Transparency Use Cases

- **Colored backgrounds**: Use transparent QR codes to overlay on branded backgrounds
- **Dark interfaces**: Transparent allows for flexible styling in dark mode
- **Print design**: Place on top of images or patterns
- **Web overlays**: Flexible placement without needing to match backgrounds

## Security Considerations

- QR codes are generated on-demand and not stored
- Only valid shortcodes (verified in database) can generate QR codes
- Generated QR codes are cached for 24 hours to prevent abuse
- Content remains secure as the QR code only encodes the public tracking URL

## Future Enhancements

- Batch QR code generation for bulk download
- QR code customization (logos, colors, patterns)
- QR code integration in PDF templates
- QR code analytics dashboard
