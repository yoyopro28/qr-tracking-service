import { afterEach, describe, expect, it, vi } from "vitest";
import { cameraErrorMessage, parseTrackingCode } from "./scanner";

afterEach(() => vi.unstubAllGlobals());

describe("QR scanner helpers", () => {
  it("accepts direct codes and URLs from the configured tracking origin", () => {
    expect(parseTrackingCode(" ab12cd34 ", "https://qr.example.test")).toBe("AB12CD34");
    expect(parseTrackingCode("https://qr.example.test/r/xy12za90", "https://qr.example.test")).toBe("XY12ZA90");
  });

  it("rejects foreign origins and malformed routes", () => {
    expect(parseTrackingCode("https://evil.example/r/AB12CD34", "https://qr.example.test")).toBeNull();
    expect(parseTrackingCode("https://qr.example.test/other/AB12CD34", "https://qr.example.test")).toBeNull();
  });

  it("turns denied camera permissions into actionable copy", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    expect(cameraErrorMessage(new DOMException("denied", "NotAllowedError"))).toContain("Website-Einstellungen");
  });
});
