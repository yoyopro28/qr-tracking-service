"use client";

import Link from "next/link";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type BarcodeDetectorResult = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect(source: CanvasImageSource): Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

type WindowWithBarcodeDetector = Window &
  typeof globalThis & {
    BarcodeDetector?: BarcodeDetectorConstructor;
  };

type ZoomMediaTrackCapabilities = MediaTrackCapabilities & {
  zoom?: {
    min?: number;
  };
};

type ScannerStatus = "idle" | "starting" | "scanning" | "detected" | "unsupported" | "error";

const SHORTCODE_PATTERN = /^[A-Z0-9]{4,32}$/;

function normalizeDetectedShortcode(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  return SHORTCODE_PATTERN.test(normalized) ? normalized : null;
}

function getShortcodeFromKnownPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const routeIndex = segments.findIndex((segment) =>
    ["r", "activate"].includes(segment.toLowerCase()),
  );

  return routeIndex >= 0 ? segments[routeIndex + 1] ?? null : null;
}

function extractShortcodeFromPayload(payload: string) {
  const trimmedPayload = payload.trim();

  if (!trimmedPayload) {
    return null;
  }

  const directShortcode = normalizeDetectedShortcode(trimmedPayload);

  if (directShortcode) {
    return directShortcode;
  }

  try {
    const parsedUrl = new URL(trimmedPayload, window.location.origin);

    return (
      normalizeDetectedShortcode(parsedUrl.searchParams.get("shortcode")) ??
      normalizeDetectedShortcode(parsedUrl.searchParams.get("code")) ??
      normalizeDetectedShortcode(getShortcodeFromKnownPath(parsedUrl.pathname))
    );
  } catch {
    return null;
  }
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Camera access was denied. Allow camera access or enter the shortcode manually.";
  }

  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No camera was found on this device.";
  }

  return error instanceof Error ? error.message : "Camera scanner could not be started.";
}

function buildVideoConstraints(deviceId?: string): MediaTrackConstraints {
  const baseConstraints: MediaTrackConstraints = {
    width: {
      ideal: 1280,
    },
    height: {
      ideal: 720,
    },
  };

  if (deviceId) {
    return {
      ...baseConstraints,
      deviceId: {
        exact: deviceId,
      },
    };
  }

  return {
    ...baseConstraints,
    facingMode: {
      ideal: "environment",
    },
  };
}

async function minimizeTrackZoom(stream: MediaStream) {
  const [track] = stream.getVideoTracks();

  if (!track.getCapabilities) {
    return;
  }

  const capabilities = track.getCapabilities() as ZoomMediaTrackCapabilities;
  const minZoom = capabilities.zoom?.min;

  if (typeof minZoom !== "number") {
    return;
  }

  try {
    await track.applyConstraints({
      advanced: [
        {
          zoom: minZoom,
        },
      ],
    } as MediaTrackConstraints);
  } catch {
    // Some mobile browsers expose zoom capability but reject the constraint.
  }
}

function cameraLabel(camera: MediaDeviceInfo, index: number) {
  return camera.label || `Camera ${index + 1}`;
}

export function ActivationQrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);
  const isScanningRef = useRef(false);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const stopScanner = useCallback(() => {
    isScanningRef.current = false;
    isDetectingRef.current = false;
    detectorRef.current = null;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => stopScanner, [stopScanner]);

  const refreshCameraDevices = useCallback(async (activeDeviceId?: string) => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");

    setCameraDevices(videoDevices);

    if (activeDeviceId) {
      setSelectedDeviceId(activeDeviceId);
    }
  }, []);

  const startScanner = useCallback(async (deviceId = selectedDeviceId) => {
    const BarcodeDetector = (window as WindowWithBarcodeDetector).BarcodeDetector;

    if (!BarcodeDetector) {
      setStatus("unsupported");
      setError(
        "This browser does not support camera QR detection yet. Use manual shortcode entry on this device.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("This browser cannot access the camera. Use manual shortcode entry instead.");
      return;
    }

    stopScanner();
    setStatus("starting");
    setError(null);
    setLastPayload(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: buildVideoConstraints(deviceId || undefined),
      });

      const videoElement = videoRef.current;
      const [videoTrack] = stream.getVideoTracks();

      if (!videoElement) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Scanner view is not ready.");
      }

      streamRef.current = stream;
      await minimizeTrackZoom(stream);
      await refreshCameraDevices(videoTrack?.getSettings().deviceId);

      detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });
      isScanningRef.current = true;
      videoElement.srcObject = stream;
      await videoElement.play();
      setStatus("scanning");

      const scanFrame = async () => {
        if (!isScanningRef.current) {
          return;
        }

        const detector = detectorRef.current;
        const video = videoRef.current;

        if (!detector || !video || video.readyState < video.HAVE_CURRENT_DATA) {
          animationFrameRef.current = window.requestAnimationFrame(scanFrame);
          return;
        }

        if (!isDetectingRef.current) {
          isDetectingRef.current = true;

          try {
            const results = await detector.detect(video);

            if (!isScanningRef.current) {
              return;
            }

            const payload = results.find((result) => result.rawValue)?.rawValue ?? null;

            if (payload) {
              const shortcode = extractShortcodeFromPayload(payload);
              setLastPayload(payload);

              if (shortcode) {
                setStatus("detected");
                stopScanner();
                router.push(
                  `/admin/activation?shortcode=${encodeURIComponent(shortcode)}&source=admin_scan`,
                );
                return;
              }

              setError("QR code read, but no flyer shortcode was found in it.");
            }
          } catch (scanError) {
            if (scanError instanceof DOMException && scanError.name === "AbortError") {
              return;
            }

            setError(
              scanError instanceof Error
                ? scanError.message
                : "QR detection failed. Try again or enter the shortcode manually.",
            );
          } finally {
            isDetectingRef.current = false;
          }
        }

        if (isScanningRef.current) {
          animationFrameRef.current = window.requestAnimationFrame(scanFrame);
        }
      };

      animationFrameRef.current = window.requestAnimationFrame(scanFrame);
    } catch (cameraError) {
      stopScanner();
      setStatus("error");
      setError(getCameraErrorMessage(cameraError));
    }
  }, [refreshCameraDevices, router, selectedDeviceId, stopScanner]);

  const handleStopScanner = useCallback(() => {
    stopScanner();
    setStatus("idle");
  }, [stopScanner]);

  const isCameraRunning = status === "starting" || status === "scanning";

  const handleCameraChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value;

    setSelectedDeviceId(deviceId);

    if (isScanningRef.current) {
      void startScanner(deviceId);
    }
  };

  return (
    <section className="panel scannerPanel">
      <div className="sectionHeader">
        <div>
          <h2>Camera scan</h2>
          <p className="sectionCopy">
            The camera reads the QR content in the browser and opens activation without
            calling the public redirect route.
          </p>
        </div>
        <span className="statusBadge">{status}</span>
      </div>

      <div className="scannerViewport">
        <video
          ref={videoRef}
          className="scannerVideo"
          muted
          playsInline
          autoPlay
          aria-label="QR scanner camera preview"
        />
        {status === "scanning" ? <div className="scannerReticle" aria-hidden="true" /> : null}
        {status !== "scanning" ? (
          <div className="scannerOverlay">
            <p>{status === "detected" ? "Opening activation..." : "Start the camera scanner."}</p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="formError" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}

      {lastPayload ? (
        <p className="metaText breakValue" aria-live="polite">
          Last QR payload: {lastPayload}
        </p>
      ) : null}

      {cameraDevices.length > 0 ? (
        <label className="field scannerDeviceField">
          <span className="fieldLabel">Camera</span>
          <select
            className="input"
            value={selectedDeviceId}
            onChange={handleCameraChange}
            disabled={status === "starting"}
          >
            {cameraDevices.map((camera, index) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {cameraLabel(camera, index)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="formActions scannerActions">
        <button className="button" type="button" onClick={() => startScanner()} disabled={isCameraRunning}>
          {status === "starting" ? "Starting..." : "Start camera"}
        </button>
        <button
          className="button button--secondary"
          type="button"
          onClick={handleStopScanner}
          disabled={!isCameraRunning}
        >
          Stop
        </button>
        <Link className="button button--secondary" href="/admin/activation">
          Manual entry
        </Link>
      </div>
    </section>
  );
}
