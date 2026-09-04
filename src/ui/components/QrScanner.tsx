import { BrowserCodeReader, BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

export function QrScanner({ trackingOrigin, onCode }: { trackingOrigin: string; onCode: (shortcode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>();
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => () => controlsRef.current?.stop(), []);

  function parse(value: string) {
    const direct = value.trim().toUpperCase();
    if (/^[A-Z0-9]{8}$/.test(direct)) return direct;
    try {
      const url = new URL(value);
      if (url.origin !== trackingOrigin) return null;
      const match = url.pathname.match(/^\/r\/([A-Za-z0-9]{8})\/?$/);
      return match?.[1].toUpperCase() ?? null;
    } catch { return null; }
  }

  async function start() {
    setError("");
    try {
      controlsRef.current?.stop();
      const available = await BrowserCodeReader.listVideoInputDevices();
      setDevices(available);
      const selected = deviceId ?? available.find((item) => /back|rear|environment/i.test(item.label))?.deviceId ?? available[0]?.deviceId;
      if (!selected || !videoRef.current) throw new Error("Keine Kamera verfügbar.");
      setDeviceId(selected);
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
      controlsRef.current = await reader.decodeFromVideoDevice(selected, videoRef.current, (result) => {
        if (!result) return;
        const code = parse(result.getText());
        if (!code) { setError("Der QR-Code gehört nicht zu dieser Tracking-Domain."); return; }
        controlsRef.current?.stop();
        setRunning(false);
        onCode(code);
      });
      setRunning(true);
    } catch (cause) {
      setRunning(false);
      setError(cause instanceof Error ? cause.message : "Kamera konnte nicht gestartet werden.");
    }
  }

  function stop() { controlsRef.current?.stop(); controlsRef.current = null; setRunning(false); }

  return (
    <section className="scanner-panel">
      <div className="scanner-viewport">
        <video ref={videoRef} className="scanner-video" muted playsInline />
        {!running && <div className="scanner-overlay">Kamera starten und den gedruckten QR-Code in den Rahmen halten.</div>}
        <div className="scanner-reticle" aria-hidden="true" />
      </div>
      {devices.length > 1 && <label>Kamera<select value={deviceId} onChange={(event) => { setDeviceId(event.target.value); if (running) void start(); }}>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Kamera ${index + 1}`}</option>)}</select></label>}
      <div className="actions"><button type="button" className="button" onClick={() => void (running ? Promise.resolve(stop()) : start())}>{running ? "Kamera stoppen" : "Kamera starten"}</button></div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </section>
  );
}
