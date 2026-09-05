import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Flyer, Location } from "../../domain/models";
import { browserConfig } from "../../lib/env";
import { EmptyState, ErrorBanner, Notice, PageHeader } from "../components/Page";
import { QrScanner } from "../components/QrScanner";
import { geolocationErrorMessage, parseCoordinates } from "../geolocation";
import { errorMessage, qrRepository } from "../services";

export function ActivationPage({ workspaceId }: { workspaceId: string }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [shortcode, setShortcode] = useState("");
  const [flyer, setFlyer] = useState<Flyer | null>();
  const [locationId, setLocationId] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [source, setSource] = useState<"ADMIN_SCAN" | "MANUAL_ADMIN_ENTRY">("MANUAL_ADMIN_ENTRY");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void qrRepository.listLocations(workspaceId).then(setLocations).catch((cause) => setError(errorMessage(cause)));
  }, [workspaceId]);

  const availableLocations = useMemo(
    () => locations.filter((location) => !location.archivedAt && flyer && (location.campaignId === null || location.campaignId === flyer.campaignId)),
    [flyer, locations],
  );

  function resetLocationDraft() {
    setLocationId("");
    setNewLocation("");
    setLatitude("");
    setLongitude("");
    setGpsStatus("");
  }

  async function lookup(code = shortcode, lookupSource = source) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await qrRepository.getFlyerByShortcode(workspaceId, code);
      if (!value) throw new Error("Flyer wurde in diesem Workspace nicht gefunden.");
      if (value.status === "RESERVED" || value.status === "RETIRED") throw new Error("Dieser Flyer kann nicht aktiviert werden.");
      setShortcode(value.shortcode);
      setFlyer(value);
      setSource(lookupSource);
      resetLocationDraft();
      if (value.activation) setNotice(`Der Flyer ist bereits bei „${value.activation.locationName}“ aktiviert.`);
    } catch (cause) {
      setFlyer(null);
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function locateNewLocation() {
    setError("");
    setGpsStatus("");
    if (!window.isSecureContext) {
      setError("Die GPS-Abfrage ist nur über eine sichere HTTPS-Verbindung verfügbar.");
      return;
    }
    if (!navigator.geolocation) {
      setError("Die GPS-Abfrage wird von diesem Browser nicht unterstützt. Trage die Koordinaten bitte manuell ein.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGpsStatus(`Aktueller Standort übernommen · Genauigkeit ca. ${Math.round(position.coords.accuracy)} m`);
        setLocating(false);
      },
      (cause) => {
        setError(geolocationErrorMessage(cause.code));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  async function activate(event: FormEvent) {
    event.preventDefault();
    if (!flyer) return;
    setBusy(true);
    setError("");
    try {
      const coordinates = locationId ? { latitude: undefined, longitude: undefined } : parseCoordinates(latitude, longitude);
      await qrRepository.activateFlyer({
        workspaceId,
        shortcode: flyer.shortcode,
        locationId: locationId || undefined,
        newLocationName: locationId ? undefined : newLocation,
        ...coordinates,
        source,
      });
      setNotice(`Flyer ${flyer.shortcode} wurde aktiviert. Die neue Route wird über die Outbox synchronisiert.`);
      setFlyer(await qrRepository.getFlyerByShortcode(workspaceId, flyer.shortcode));
      setLocations(await qrRepository.listLocations(workspaceId));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeader eyebrow="Field Operations" title="Flyer aktivieren" description="Gedruckten QR-Code per Kamera erfassen oder den achtstelligen Shortcode manuell eingeben." />
    {error && <ErrorBanner message={error} />}
    {notice && <Notice>{notice}</Notice>}
    <div className="two-column activation-layout">
      <section className="panel">
        <h2>Kamera-Scanner</h2>
        <QrScanner trackingOrigin={browserConfig.trackingOrigin} onCode={(code) => { setShortcode(code); void lookup(code, "ADMIN_SCAN"); }} />
      </section>
      <section className="panel">
        <h2>Manuelle Eingabe</h2>
        <form onSubmit={(event) => { event.preventDefault(); void lookup(shortcode, "MANUAL_ADMIN_ENTRY"); }}>
          <label>Shortcode<input required pattern="[A-Za-z0-9]{8}" maxLength={8} autoCapitalize="characters" value={shortcode} onChange={(event) => { setShortcode(event.target.value.toUpperCase()); setFlyer(undefined); }} placeholder="AB12CD34" /></label>
          <button className="button" disabled={busy || shortcode.length !== 8}>Flyer suchen</button>
        </form>
        {flyer === undefined ? <EmptyState title="Noch kein Flyer ausgewählt">Scanne einen QR-Code oder suche einen Shortcode.</EmptyState> : flyer === null ? null : <div className="lookup-result">
          <div className="card-topline"><span className={`status ${flyer.status.toLowerCase()}`}>{flyer.status}</span><code>{flyer.shortcode}</code></div>
          <p>Blatt {flyer.sheetIndex + 1}, Position {flyer.placementIndex + 1}</p>
          {flyer.activation ? <p>Aktiver Standort: <strong>{flyer.activation.locationName}</strong></p> : <form onSubmit={activate}>
            <label>Standort<select value={locationId} onChange={(event) => { setLocationId(event.target.value); setGpsStatus(""); }}><option value="">Neuen Standort direkt anlegen</option>{availableLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
            {!locationId && <>
              <label>Name des neuen Standorts<input required maxLength={160} value={newLocation} onChange={(event) => setNewLocation(event.target.value)} placeholder="z. B. Café am Markt" /></label>
              <button type="button" className="button secondary" disabled={busy || locating} onClick={locateNewLocation}>{locating ? "GPS wird ermittelt…" : "Aktuellen GPS-Standort übernehmen"}</button>
              {gpsStatus && <p className="field-hint" role="status">{gpsStatus}</p>}
              <div className="form-grid">
                <label>Breitengrad<input inputMode="decimal" value={latitude} onChange={(event) => { setLatitude(event.target.value); setGpsStatus(""); }} placeholder="52.520008" /></label>
                <label>Längengrad<input inputMode="decimal" value={longitude} onChange={(event) => { setLongitude(event.target.value); setGpsStatus(""); }} placeholder="13.404954" /></label>
              </div>
            </>}
            <button className="button" disabled={busy || locating}>{busy ? "Wird aktiviert…" : "Flyer aktivieren"}</button>
          </form>}
        </div>}
      </section>
    </div>
  </>;
}
