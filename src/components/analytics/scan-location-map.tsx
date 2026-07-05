"use client";

import { useEffect, useRef, useState } from "react";

type LocationPerformanceLevel =
  | "leader"
  | "hot"
  | "today"
  | "active"
  | "quiet"
  | "archived";

type RecentLocationScan = {
  occurredAt: string;
  shortcode: string;
  campaignName: string;
};

export type ScanMapLocation = {
  id: string;
  name: string;
  campaignName: string | null;
  latitude: number;
  longitude: number;
  scanCount: number;
  todayScanCount: number;
  sevenDayScanCount: number;
  recentScans: RecentLocationScan[];
  archived: boolean;
  performance: {
    level: LocationPerformanceLevel;
    emoji: string;
    label: string;
  };
};

type ScanLocationMapProps = {
  locations: ScanMapLocation[];
};

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  text: string,
) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createMetric(label: string, value: number) {
  const metric = document.createElement("div");
  metric.className = "scanMapPopupMetric";
  metric.append(
    createTextElement("strong", "", value.toLocaleString()),
    createTextElement("span", "", label),
  );
  return metric;
}

function formatScanTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function createPopupContent(location: ScanMapLocation) {
  const wrapper = document.createElement("section");
  wrapper.className = "scanMapPopup";

  const header = document.createElement("header");
  header.className = "scanMapPopupHeader";

  const performance = createTextElement(
    "span",
    `scanMapPopupPerformance scanMapPopupPerformance--${location.performance.level}`,
    `${location.performance.emoji} ${location.performance.label}`,
  );
  const heading = createTextElement("strong", "scanMapPopupTitle", location.name);
  const scope = location.campaignName ?? "Shared location";
  const campaign = createTextElement(
    "span",
    "scanMapPopupScope",
    location.archived ? `Archived · ${scope}` : scope,
  );
  header.append(performance, heading, campaign);

  const metrics = document.createElement("div");
  metrics.className = "scanMapPopupMetrics";
  metrics.append(
    createMetric("Today", location.todayScanCount),
    createMetric("7 days", location.sevenDayScanCount),
    createMetric("Total", location.scanCount),
  );

  const recent = document.createElement("div");
  recent.className = "scanMapPopupRecent";
  recent.append(createTextElement("strong", "scanMapPopupSectionTitle", "Latest scans"));

  if (location.recentScans.length === 0) {
    recent.append(createTextElement("p", "scanMapPopupEmpty", "No attributed scans yet."));
  } else {
    const list = document.createElement("ul");
    list.className = "scanMapPopupScanList";

    for (const scan of location.recentScans) {
      const item = document.createElement("li");
      const details = document.createElement("span");
      details.append(
        createTextElement("strong", "", scan.shortcode),
        createTextElement("small", "", scan.campaignName),
      );
      item.append(details, createTextElement("time", "", formatScanTime(scan.occurredAt)));
      list.append(item);
    }

    recent.append(list);
  }

  wrapper.append(header, metrics, recent);
  return wrapper;
}

function formatPinCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function createPinElement(location: ScanMapLocation, onClick: () => void) {
  const markerRoot = document.createElement("div");
  markerRoot.className = "scanPinMarker";

  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = `scanPin scanPin--${location.performance.level}`;
  pin.title = `${location.name}: ${location.scanCount} total scans`;
  pin.setAttribute(
    "aria-label",
    `${location.name}, ${location.scanCount} total scans, ${location.performance.label}`,
  );

  const shape = document.createElement("span");
  shape.className = "scanPinShape";
  shape.setAttribute("aria-hidden", "true");

  const count = createTextElement("span", "scanPinCount", formatPinCount(location.scanCount));
  count.setAttribute("aria-hidden", "true");

  const badge = createTextElement("span", "scanPinBadge", location.performance.emoji);
  badge.classList.add(`scanPinBadge--${location.performance.level}`);
  badge.setAttribute("aria-hidden", "true");

  pin.append(shape, count, badge);
  pin.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });

  markerRoot.append(pin);
  return markerRoot;
}

export function ScanLocationMap({ locations }: ScanLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || locations.length === 0) {
      return;
    }

    let disposed = false;
    let mapInstance: import("maplibre-gl").Map | null = null;
    let activePopup: import("maplibre-gl").Popup | null = null;
    const locationMarkers = new Map<string, import("maplibre-gl").Marker>();

    async function initializeMap() {
      const maplibregl = await import("maplibre-gl");

      if (disposed || !containerRef.current) {
        return;
      }

      const locationById = new Map(locations.map((location) => [location.id, location]));
      const features = locations.map((location) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [location.longitude, location.latitude],
        },
        properties: {
          id: location.id,
          scanCount: location.scanCount,
        },
      }));

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [locations[0].longitude, locations[0].latitude],
        zoom: 12,
        attributionControl: { compact: true },
      });

      mapInstance = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      map.once("error", () => {
        if (!disposed && !map.loaded()) {
          setLoadError(true);
        }
      });

      function openLocationPopup(location: ScanMapLocation) {
        activePopup?.remove();
        activePopup = new maplibregl.Popup({
          offset: 54,
          closeButton: true,
          className: "scanMapPopupShell",
          maxWidth: "340px",
        })
          .setLngLat([location.longitude, location.latitude])
          .setDOMContent(createPopupContent(location))
          .addTo(map);
      }

      function syncLocationMarkers() {
        if (!map.getLayer("scan-location-points")) {
          return;
        }

        const renderedLocations = map.queryRenderedFeatures({
          layers: ["scan-location-points"],
        });
        const visibleLocationIds = new Set<string>();

        for (const feature of renderedLocations) {
          const locationId = feature.properties?.id;
          if (typeof locationId !== "string" || visibleLocationIds.has(locationId)) {
            continue;
          }

          const location = locationById.get(locationId);
          if (!location) {
            continue;
          }

          visibleLocationIds.add(locationId);

          if (!locationMarkers.has(locationId)) {
            const pin = createPinElement(location, () => openLocationPopup(location));
            const marker = new maplibregl.Marker({
              element: pin,
              anchor: "bottom",
            })
              .setLngLat([location.longitude, location.latitude])
              .addTo(map);
            locationMarkers.set(locationId, marker);
          }
        }

        for (const [locationId, marker] of locationMarkers) {
          if (!visibleLocationIds.has(locationId)) {
            marker.remove();
            locationMarkers.delete(locationId);
          }
        }
      }

      map.on("load", () => {
        if (disposed) {
          return;
        }

        map.addSource("scan-locations", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features,
          },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 54,
          clusterProperties: {
            totalScans: ["+", ["get", "scanCount"]],
          },
        });

        map.addLayer({
          id: "scan-clusters",
          type: "circle",
          source: "scan-locations",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "totalScans"],
              "#765c50",
              10,
              "#b04a2d",
              50,
              "#d47a28",
            ],
            "circle-opacity": 0.94,
            "circle-stroke-color": "#fffaf2",
            "circle-stroke-width": 3,
            "circle-radius": [
              "step",
              ["get", "totalScans"],
              22,
              10,
              27,
              50,
              33,
              200,
              39,
            ],
          },
        });

        map.addLayer({
          id: "scan-cluster-count",
          type: "symbol",
          source: "scan-locations",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["to-string", ["get", "totalScans"]],
            "text-size": 13,
          },
          paint: {
            "text-color": "#fffaf2",
          },
        });

        map.addLayer({
          id: "scan-location-points",
          type: "circle",
          source: "scan-locations",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "rgba(0, 0, 0, 0)",
            "circle-opacity": 0,
            "circle-radius": 24,
          },
        });

        const bounds = new maplibregl.LngLatBounds();
        for (const location of locations) {
          bounds.extend([location.longitude, location.latitude]);
        }

        if (locations.length > 1) {
          map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 0 });
        }

        map.on("click", "scan-clusters", async (event) => {
          const feature = map.queryRenderedFeatures(event.point, {
            layers: ["scan-clusters"],
          })[0];
          const clusterId = feature?.properties?.cluster_id;
          const coordinates = feature?.geometry.type === "Point" ? feature.geometry.coordinates : null;
          const source = map.getSource("scan-locations");

          if (!source || typeof clusterId !== "number" || !coordinates || source.type !== "geojson") {
            return;
          }

          const zoom = await (
            source as import("maplibre-gl").GeoJSONSource
          ).getClusterExpansionZoom(clusterId);
          map.easeTo({ center: [coordinates[0], coordinates[1]], zoom });
        });

        map.on("mouseenter", "scan-clusters", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "scan-clusters", () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("render", syncLocationMarkers);
        syncLocationMarkers();
      });
    }

    initializeMap().catch((error) => {
      console.error("Failed to initialize analytics map", error);
      if (!disposed) {
        setLoadError(true);
      }
    });

    return () => {
      disposed = true;
      activePopup?.remove();
      for (const marker of locationMarkers.values()) {
        marker.remove();
      }
      mapInstance?.remove();
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="mapEmptyState">
        <strong>No mapped locations yet</strong>
        <span>Add coordinates to a location to display it here.</span>
      </div>
    );
  }

  return (
    <div className="scanMapFrame">
      <div ref={containerRef} className="scanMap" aria-label="Map of scan locations" />
      {loadError ? (
        <div className="scanMapError">
          The basemap could not be loaded. Location statistics remain available below.
        </div>
      ) : null}
    </div>
  );
}
