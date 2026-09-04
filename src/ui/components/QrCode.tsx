import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, label }: { value: string; label: string }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, { width: 320, margin: 2, errorCorrectionLevel: "M" }).then((url: string) => { if (active) setSource(url); });
    return () => { active = false; };
  }, [value]);
  return source ? <img className="qr-image" src={source} alt={`QR-Code ${label}`} /> : <span className="qr-placeholder">QR wird erzeugt…</span>;
}
