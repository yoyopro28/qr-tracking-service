import { BrowserCodeReader, BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { cameraErrorMessage, parseTrackingCode } from "../scanner";

export function QrScanner({ trackingOrigin, onCode }: { trackingOrigin: string; onCode: (shortcode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>();
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => () => controlsRef.current?.stop(), []);

  function accept(value: string) {
    const code = parseTrackingCode(value, trackingOrigin);
    if (!code) {
      setError("Der QR-Code gehört nicht zu dieser Tracking-Domain.");
      return false;
    }
    controlsRef.current?.stop();
    controlsRef.current = null;
    setRunning(false);
    onCode(code);
    return true;
  }

  async function refreshDevices() {
    try {
      const available = await BrowserCodeReader.listVideoInputDevices();
      setDevices(available);
      setDeviceId((current) => current ?? available.find((item) => /back|rear|environment/i.test(item.label))?.deviceId ?? available[0]?.deviceId);
      return available;
    } catch {
      setDevices([]);
      return [];
    }
  }

  async function start(requestedDeviceId?: string) {
    setError("");
    try {
      controlsRef.current?.stop();
      controlsRef.current = null;
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("Camera API unavailable", "NotSupportedError");
      if (!videoRef.current) throw new Error("Die Kameravorschau ist nicht verfügbar.");
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: requestedDeviceId
          ? { deviceId: { exact: requestedDeviceId } }
          : { facingMode: { ideal: "environment" } },
      };
      controlsRef.current = await reader.decodeFromConstraints(constraints, videoRef.current, (result) => {
        if (!result) return;
        accept(result.getText());
      });
      setRunning(true);
      void refreshDevices();
    } catch (cause) {
      setRunning(false);
      setError(cameraErrorMessage(cause));
    }
  }

  function stop() { controlsRef.current?.stop(); controlsRef.current = null; setRunning(false); }

  async function scanImage(file?: File) {
    if (!file) return;
    setError("");
    const url = URL.createObjectURL(file);
    try {
      const result = await new BrowserQRCodeReader().decodeFromImageUrl(url);
      accept(result.getText());
    } catch {
      setError("Auf dem ausgewählten Bild wurde kein lesbarer QR-Code gefunden.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <section className="scanner-panel">
      <div className="scanner-viewport">
        <video ref={videoRef} className="scanner-video" muted playsInline autoPlay />
        {!running && <div className="scanner-overlay">Kamera starten und den gedruckten QR-Code in den Rahmen halten.</div>}
        <div className="scanner-reticle" aria-hidden="true" />
      </div>
      {devices.length > 1 && <label>Kamera<select value={deviceId} onChange={(event) => { const selected = event.target.value; setDeviceId(selected); if (running) void start(selected); }}>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Kamera ${index + 1}`}</option>)}</select></label>}
      <div className="actions"><button type="button" className="button" onClick={() => void (running ? Promise.resolve(stop()) : start(deviceId))}>{running ? "Kamera stoppen" : "Kamera starten"}</button><label className="button secondary scanner-file-button">QR-Foto auswählen<input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { void scanImage(event.target.files?.[0]); event.target.value = ""; }} /></label></div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}
