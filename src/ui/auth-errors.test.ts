import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("authErrorMessage", () => {
  it("translates disabled OAuth providers", () => {
    expect(authErrorMessage(new Error("Unsupported provider: provider is not enabled")))
      .toBe("Die Google-Anmeldung ist noch nicht freigeschaltet. Bitte wende dich an den Administrator.");
  });

  it("translates rate-limit failures without exposing backend messages", () => {
    expect(authErrorMessage({ status: 429, message: "email rate limit exceeded" }))
      .toBe("Das Anmeldelimit wurde erreicht. Bitte versuche es später erneut.");
  });

  it("does not expose unknown provider errors", () => {
    expect(authErrorMessage(new Error("internal provider details")))
      .toBe("Die Google-Anmeldung konnte nicht gestartet werden. Bitte versuche es erneut.");
  });
});
