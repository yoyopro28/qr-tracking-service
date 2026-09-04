import { useState } from "react";
import { authProvider } from "../services";
import { authErrorMessage } from "../auth-errors";

export function LoginPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    setErrorMessage("");
    try {
      await authProvider.signInWithGoogle();
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <span className="eyebrow">QR Tracking</span>
        <h1>Willkommen zurück</h1>
        <p className="lede">Melde dich sicher mit deinem Google-Konto an. Es wird kein zusätzliches Passwort gespeichert.</p>
        <button className="button google-login-button" type="button" disabled={busy} onClick={signInWithGoogle}>
          {busy ? "Google wird geöffnet…" : "Mit Google anmelden"}
        </button>
        {errorMessage && <p className="login-message error" role="alert">{errorMessage}</p>}
      </section>
    </main>
  );
}
