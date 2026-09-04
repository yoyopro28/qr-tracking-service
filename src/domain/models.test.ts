import { describe, expect, it } from "vitest";
import { normalizeSlug, validateDestinationUrl } from "./models";

describe("redirect domain", () => {
  it("normalizes an eight-character slug", () => {
    expect(normalizeSlug(" ab12cd34 ")).toBe("AB12CD34");
  });

  it("rejects malformed slugs", () => {
    expect(normalizeSlug("../secret")).toBeNull();
    expect(normalizeSlug("TOO-SHORT")).toBeNull();
  });

  it("only accepts HTTP destinations", () => {
    expect(validateDestinationUrl("https://example.com")).toBe("https://example.com/");
    expect(() => validateDestinationUrl("javascript:alert(1)")).toThrow();
  });
});
