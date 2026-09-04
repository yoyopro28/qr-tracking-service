import { useState, type FormEvent } from "react";
import { authProvider, errorMessage } from "../services";

export function LoginPage() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await authProvider.signInWithOtp(email); setMessage("Der Anmeldelink wurde versendet. Bitte prüfe dein Postfach."); }
    catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><section className="login-card"><span className="eyebrow">QR Tracking</span><h1>Willkommen zurück</h1><p className="lede">Melde dich mit einem einmalig nutzbaren Link an. Es wird kein Passwort gespeichert.</p><form onSubmit={submit}><label>E-Mail-Adresse<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@firma.de" /></label><button className="button" disabled={busy}>{busy ? "Wird versendet…" : "Anmeldelink senden"}</button></form>{message && <p className="login-message" role="status">{message}</p>}</section></main>;
}
