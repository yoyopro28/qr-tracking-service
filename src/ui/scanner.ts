export function parseTrackingCode(value: string, trackingOrigin: string) {
  const direct = value.trim().toUpperCase();
  if (/^[A-Z0-9]{8}$/.test(direct)) return direct;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(trackingOrigin).origin) return null;
    const match = url.pathname.match(/^\/r\/([A-Za-z0-9]{8})\/?$/);
    return match?.[1].toUpperCase() ?? null;
  } catch {
    return null;
  }
}

export function cameraErrorMessage(cause: unknown) {
  const error = cause && typeof cause === "object" ? cause as { name?: unknown; message?: unknown } : undefined;
  const name = typeof error?.name === "string" ? error.name : "";

  if (!window.isSecureContext) {
    return "Die Kamera ist nur über eine sichere HTTPS-Verbindung verfügbar.";
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Der Kamerazugriff wurde blockiert. Erlaube die Kamera in den Website-Einstellungen des Browsers und versuche es erneut.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Auf diesem Gerät wurde keine Kamera gefunden.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Die Kamera wird bereits von einer anderen App verwendet oder konnte nicht gestartet werden.";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "Die ausgewählte Kamera ist nicht mehr verfügbar. Wähle eine andere Kamera und versuche es erneut.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Dieser Browser unterstützt keinen Kamerazugriff. Du kannst stattdessen ein QR-Foto auswählen.";
  }
  return typeof error?.message === "string" && error.message
    ? `Kamera konnte nicht gestartet werden: ${error.message}`
    : "Kamera konnte nicht gestartet werden. Prüfe die Website-Berechtigung oder wähle ein QR-Foto aus.";
}
