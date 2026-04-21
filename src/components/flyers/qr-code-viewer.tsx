"use client";

import { useEffect, useRef, useState } from "react";

type QRCodeViewerProps = {
  shortcode: string;
  trackingUrl?: string;
  enableDownload?: boolean;
  size?: "small" | "medium" | "large";
};

const sizeMap = {
  small: "200px",
  medium: "300px",
  large: "400px",
};

export function QRCodeViewer({
  shortcode,
  trackingUrl,
  enableDownload = true,
  size = "medium",
}: QRCodeViewerProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transparent, setTransparent] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Ensure we only render after hydration is complete
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    async function loadQRCode() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/qr/${shortcode}?format=dataUrl&transparent=${transparent}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to load QR code: ${response.statusText}`);
        }

        const data = await response.json();
        setDataUrl(data.dataUrl);
      } catch (err) {
        console.error("Failed to load QR code:", err);
        setError(err instanceof Error ? err.message : "Failed to load QR code");
      } finally {
        setIsLoading(false);
      }
    }

    loadQRCode();
  }, [shortcode, transparent, isMounted]);

  const handleDownload = async (format: "png" | "webp") => {
    try {
      const response = await fetch(
        `/api/qr/${shortcode}?format=${format}&transparent=${transparent}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to download QR code: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-${shortcode}${transparent ? "-transparent" : ""}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code:", err);
      alert("Failed to download QR code");
    }
  };

  const displaySize = sizeMap[size];

  return (
    <div className="qrCodeViewer">
      <div className="qrCodeContainer" style={{ width: displaySize, height: displaySize }}>
        {isLoading && <div className="qrCodeLoading">Loading QR code...</div>}

        {error && <div className="qrCodeError">{error}</div>}

        {dataUrl && !isLoading && (
          <img
            ref={imgRef}
            src={dataUrl}
            alt={`QR code for ${shortcode}`}
            className="qrCodeImage"
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: transparent ? "transparent" : "#ffffff",
            }}
          />
        )}
      </div>

      {trackingUrl && (
        <p className="qrCodeUrl" style={{ marginTop: "12px", fontSize: "12px", color: "#666" }}>
          Tracking URL: <code>{trackingUrl}</code>
        </p>
      )}

      <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => setTransparent(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          <span style={{ fontSize: "14px" }}>Transparent background</span>
        </label>
      </div>

      {enableDownload && !isLoading && !error && (
        <div className="qrCodeDownloadButtons" style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
          <button
            className="button button--secondary"
            onClick={() => handleDownload("png")}
            title="Download as PNG"
          >
            Download PNG
          </button>
          <button
            className="button button--secondary"
            onClick={() => handleDownload("webp")}
            title="Download as WebP (smaller file)"
          >
            Download WebP
          </button>
        </div>
      )}
    </div>
  );
}
