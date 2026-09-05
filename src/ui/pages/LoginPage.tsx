import { useState } from "react";
import { authProvider } from "../services";
import { authErrorMessage } from "../auth-errors";

export function LoginPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("local@qr-tracking.test");
  const [password, setPassword] = useState("local-dev-password");
  const isLocalDevelopment = import.meta.env.DEV;

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

  async function withPassword(action: "signInWithPassword" | "signUpWithPassword") {
    setBusy(true);
    setErrorMessage("");
    try {
      await authProvider[action](email, password);
    } catch (error) {
      setErrorMessage(errorMessageForLocalAuth(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <span className="eyebrow">QR Tracking</span>
        <h1>Willkommen zurück</h1>
        {isLocalDevelopment ? <>
          <p className="lede">Lokale Entwicklung: Melde dich mit einem Testkonto an oder lege eines an. Diese Anmeldung existiert nur in deinem lokalen Supabase.</p>
          <form className="login-form" onSubmit={(event) => { event.preventDefault(); void withPassword("signInWithPassword"); }}>
            <label>E-Mail-Adresse<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Passwort<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <div className="actions"><button className="button" disabled={busy}>{busy ? "Bitte warten…" : "Lokal anmelden"}</button><button className="button secondary" type="button" disabled={busy} onClick={() => void withPassword("signUpWithPassword")}>Testkonto anlegen</button></div>
          </form>
        </> : <>
          <p className="lede">Melde dich sicher mit deinem Google-Konto an. Es wird kein zusätzliches Passwort gespeichert.</p>
          <button className="button google-login-button" type="button" disabled={busy} onClick={signInWithGoogle}>
            {busy ? "Google wird geöffnet…" : "Mit Google anmelden"}
          </button>
        </>}
        {errorMessage && <p className="login-message error" role="alert">{errorMessage}</p>}
      </section>
    </main>
  );
}

function errorMessageForLocalAuth(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/invalid login credentials/i.test(message)) return "E-Mail oder Passwort stimmen nicht. Lege das Testkonto zuerst an.";
  if (/already registered/i.test(message)) return "Dieses Testkonto existiert bereits. Melde dich damit an.";
  return authErrorMessage(error);
}
