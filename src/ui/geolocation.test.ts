import { describe, expect, it } from "vitest";
import { geolocationErrorMessage, parseCoordinates } from "./geolocation";

describe("geolocation helpers", () => {
  it("parses a complete coordinate pair", () => {
    expect(parseCoordinates("52.520008", "13.404954")).toEqual({ latitude: 52.520008, longitude: 13.404954 });
  });

  it("accepts an empty pair and rejects incomplete or invalid coordinates", () => {
    expect(parseCoordinates("", "")).toEqual({ latitude: undefined, longitude: undefined });
    expect(() => parseCoordinates("52.5", "")).toThrow("gemeinsam");
    expect(() => parseCoordinates("91", "13.4")).toThrow("-90 und 90");
    expect(() => parseCoordinates("52.5", "181")).toThrow("-180 und 180");
  });

  it("provides actionable browser permission errors", () => {
    expect(geolocationErrorMessage(1)).toContain("Website-Einstellungen");
    expect(geolocationErrorMessage(2)).toContain("GPS");
    expect(geolocationErrorMessage(3)).toContain("zu lange");
  });
});
