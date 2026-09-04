type AuthErrorLike = {
  message?: unknown;
  status?: unknown;
};

export function authErrorMessage(error: unknown): string {
  const candidate = error && typeof error === "object" ? error as AuthErrorLike : undefined;
  const message = typeof candidate?.message === "string" ? candidate.message : "";

  if (candidate?.status === 429 || /rate limit/i.test(message)) {
    return "Das Anmeldelimit wurde erreicht. Bitte versuche es später erneut.";
  }
  if (/provider.*(not enabled|disabled)|unsupported provider/i.test(message)) {
    return "Die Google-Anmeldung ist noch nicht freigeschaltet. Bitte wende dich an den Administrator.";
  }
  if (/network|fetch/i.test(message)) {
    return "Die Anmeldung konnte den Server nicht erreichen. Bitte prüfe deine Verbindung und versuche es erneut.";
  }
  return "Die Google-Anmeldung konnte nicht gestartet werden. Bitte versuche es erneut.";
}
