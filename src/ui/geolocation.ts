export function geolocationErrorMessage(code: number) {
  if (code === 1) return "Der Standortzugriff wurde blockiert. Erlaube den Standort in den Website-Einstellungen und versuche es erneut.";
  if (code === 2) return "Der aktuelle Standort konnte nicht bestimmt werden. Prüfe GPS und Netzwerkverbindung.";
  if (code === 3) return "Die Standortabfrage hat zu lange gedauert. Versuche es erneut oder trage die Koordinaten manuell ein.";
  return "Der aktuelle Standort konnte nicht übernommen werden.";
}

export function parseCoordinates(latitudeValue: string, longitudeValue: string) {
  const hasLatitude = latitudeValue.trim() !== "";
  const hasLongitude = longitudeValue.trim() !== "";
  if (hasLatitude !== hasLongitude) throw new Error("Breiten- und Längengrad müssen gemeinsam gesetzt werden.");
  if (!hasLatitude) return { latitude: undefined, longitude: undefined };

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Breitengrad muss zwischen -90 und 90 liegen.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Längengrad muss zwischen -180 und 180 liegen.");
  }
  return { latitude, longitude };
}
