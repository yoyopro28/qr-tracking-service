import { useEffect, useMemo, useRef, useState } from "react";
import type { Location } from "../../domain/models";
import { browserConfig } from "../../lib/env";
import "maplibre-gl/dist/maplibre-gl.css";

export function LocationMap({ locations, scansByLocation }: { locations: Location[]; scansByLocation: Map<string, number> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const points = useMemo(() => locations.filter((location) => location.latitude !== null && location.longitude !== null), [locations]);

  useEffect(() => {
    if (!browserConfig.mapStyleUrl || !containerRef.current || points.length === 0) return;
    let disposed = false;
    let cleanup = () => {};
    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !containerRef.current) return;
      const map = new maplibregl.Map({ container: containerRef.current, style: browserConfig.mapStyleUrl!, center: [points[0].longitude!, points[0].latitude!], zoom: 4 });
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      const bounds = new maplibregl.LngLatBounds();
      for (const location of points) {
        const scans = scansByLocation.get(location.id) ?? 0;
        const marker = document.createElement("button"); marker.type = "button"; marker.className = "map-marker"; marker.textContent = String(scans); marker.title = `${location.name}: ${scans} Scans`;
        new maplibregl.Marker({ element: marker }).setLngLat([location.longitude!, location.latitude!]).setPopup(new maplibregl.Popup({ offset: 24 }).setHTML(`<strong>${escapeHtml(location.name)}</strong><br>${scans} Scans`)).addTo(map);
        bounds.extend([location.longitude!, location.latitude!]);
      }
      map.once("load", () => { if (points.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 13 }); });
      map.on("error", () => setError("Der Kartenstil konnte nicht vollständig geladen werden."));
      cleanup = () => map.remove();
    }).catch(() => setError("Die Kartenansicht konnte nicht geladen werden."));
    return () => { disposed = true; cleanup(); };
  }, [locations, points, scansByLocation]);

  if (points.length === 0) return <div className="map-empty"><strong>Noch keine Kartenpunkte</strong><span>Ergänze Koordinaten bei einem Standort.</span></div>;
  if (!browserConfig.mapStyleUrl) return <div className="coordinate-map" aria-label="Standortübersicht ohne Kartenanbieter">{points.map((location) => <span key={location.id} className="coordinate-pin" title={`${location.name}: ${scansByLocation.get(location.id) ?? 0} Scans`} style={{ left: `${(location.longitude! + 180) / 360 * 100}%`, top: `${(90 - location.latitude!) / 180 * 100}%` }}>{scansByLocation.get(location.id) ?? 0}<small>{location.name}</small></span>)}</div>;
  return <div className="map-frame"><div ref={containerRef} className="map" />{error && <p className="map-error">{error}</p>}</div>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}
