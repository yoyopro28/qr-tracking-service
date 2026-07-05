"use client";

import { useState } from "react";

type LocationCoordinateFieldsProps = {
  latitudeName?: string;
  longitudeName?: string;
  defaultLatitude?: string;
  defaultLongitude?: string;
  latitudeErrors?: string[];
  longitudeErrors?: string[];
  disabled?: boolean;
};

export function LocationCoordinateFields({
  latitudeName = "latitude",
  longitudeName = "longitude",
  defaultLatitude = "",
  defaultLongitude = "",
  latitudeErrors,
  longitudeErrors,
  disabled = false,
}: LocationCoordinateFieldsProps) {
  const [latitude, setLatitude] = useState(defaultLatitude);
  const [longitude, setLongitude] = useState(defaultLongitude);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const errorId = `${latitudeName}-${longitudeName}-error`;

  function useCurrentPosition() {
    if (!navigator.geolocation) {
      setLocationStatus("This browser does not provide device location.");
      return;
    }

    setIsLocating(true);
    setLocationStatus("Reading current position...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocationStatus(`Position captured (about ${Math.round(position.coords.accuracy)} m accuracy).`);
        setIsLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. You can enter the coordinates manually."
            : "The current position could not be determined.";
        setLocationStatus(message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 30_000,
      },
    );
  }

  function clearPosition() {
    setLatitude("");
    setLongitude("");
    setLocationStatus("Coordinates removed. Save the form to apply this change.");
  }

  return (
    <div className="coordinateFields">
      <div className="fieldGrid">
        <label className="field">
          <span className="fieldLabel">Latitude</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="any"
            min="-90"
            max="90"
            name={latitudeName}
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="52.520008"
            disabled={disabled}
            aria-invalid={Boolean(latitudeErrors?.length)}
            aria-describedby={latitudeErrors?.length ? errorId : undefined}
          />
        </label>

        <label className="field">
          <span className="fieldLabel">Longitude</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="any"
            min="-180"
            max="180"
            name={longitudeName}
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="13.404954"
            disabled={disabled}
            aria-invalid={Boolean(longitudeErrors?.length)}
            aria-describedby={longitudeErrors?.length ? errorId : undefined}
          />
        </label>
      </div>

      {latitudeErrors?.[0] || longitudeErrors?.[0] ? (
        <p id={errorId} className="fieldError">
          {latitudeErrors?.[0] ?? longitudeErrors?.[0]}
        </p>
      ) : null}

      <div className="coordinateActions">
        <button
          className="button button--secondary"
          type="button"
          onClick={useCurrentPosition}
          disabled={disabled || isLocating}
        >
          {isLocating ? "Locating..." : "Use current position"}
        </button>
        <button
          className="textButton"
          type="button"
          onClick={clearPosition}
          disabled={disabled || (!latitude && !longitude)}
        >
          Clear coordinates
        </button>
      </div>

      <p className="fieldHint" aria-live="polite">
        {locationStatus ?? "Coordinates are optional. Device location requires HTTPS or localhost."}
      </p>
    </div>
  );
}
