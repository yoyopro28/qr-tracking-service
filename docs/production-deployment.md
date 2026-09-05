# Production bereitstellen

Der Codepfad ist für getrennte Preview- und Produktionsumgebungen vorbereitet.
Konten, Domains, Resource-IDs und Secrets können nicht sinnvoll im Repository
vorbelegt werden. Diese Anleitung ist deshalb zugleich die einmalige
Infrastruktur-Checkliste. Danach wird gezielt über einen manuellen GitHub-Actions-
Workflow deployt.

## 1. Vorab lokal abnehmen

```bash
npm ci
npm run supabase:start
npm run lint
npm run typecheck
npm test
npm run supabase:lint
npx supabase test db
npm run test:e2e
npm run build
npm run build:check
npm run worker:check
npm run worker:dry-run
```

Für den Browser-E2E-Test müssen die von `npx supabase status -o env` ausgegebenen
lokalen Werte verfügbar sein. Insbesondere benötigt der Test den lokalen Legacy-
`SERVICE_ROLE_KEY` für die Auth-Admin-API; dieser lokale Standardschlüssel ist
kein Produktionssecret.

## 2. Cloud-Ressourcen anlegen

In Supabase zwei eigenständige Projekte erstellen: Preview und Produktion. Pro
Projekt werden benötigt:

- Project Ref und Datenbankpasswort
- Project URL (`https://<ref>.supabase.co`)
- Publishable Key (`sb_publishable_...`)
- Secret Key (`sb_secret_...`)

In Cloudflare zwei KV-Namespaces anlegen:

```bash
npx wrangler kv namespace create qr-redirects-preview
npx wrangler kv namespace create qr-redirects-production
```

Die ausgegebenen 32-stelligen IDs je Umgebung in **beiden** Dateien beim
entsprechenden Environment einsetzen:

- `workers/redirect/wrangler.jsonc`
- `workers/cache-sync/wrangler.jsonc`

Im Cache-Sync-Config zusätzlich die Preview- beziehungsweise Produktions-URL von
Supabase einsetzen. Redirect und Cache-Sync müssen innerhalb einer Umgebung
dieselbe KV-ID verwenden.

Für einen echten Produktionsbetrieb den Workers-Paid-Tarif einplanen. Der
Free-Tarif ist technisch für Preview geeignet, begrenzt KV derzeit aber auf 1.000
Writes pro Tag; ein großer Flyer-Batch kann einen erheblichen Teil davon
verbrauchen. Der Sync-Worker bleibt mit maximal 15 Events pro Invocation trotzdem
auch unter dem Free-Limit für externe Subrequests.

Für eigene Domains in den jeweiligen `env.preview`-/`env.production`-Block des
zuständigen Wrangler-Configs ergänzen:

```jsonc
"routes": [{ "pattern": "qr.example.de", "custom_domain": true }]
```

Die Admin-Domain gehört in das Root-`wrangler.jsonc`, die QR-Domain in den
Redirect-Worker. Der interne Cache-Sync-Worker kann zunächst seine `workers.dev`-
URL verwenden. `VITE_TRACKING_ORIGIN` muss exakt die öffentliche QR-Origin sein.

## 3. Tokens mit minimalen Rechten erstellen

Cloudflare benötigt für GitHub Actions ein auf das richtige Konto begrenztes
Deploy-Token mit Worker- und KV-Schreibrechten. Für die Analytics Edge Functions
einen **separaten** Token mit ausschließlich `Account Analytics Read` erstellen.

Für Supabase einen Personal Access Token für die CLI erzeugen. Die Secret Keys der
beiden Projekte nie in Browservariablen, Commits oder Tickets kopieren.

Vier voneinander unabhängige Zufallswerte mit mindestens 32 Bytes pro Umgebung
erzeugen, beispielsweise:

```bash
openssl rand -hex 32
```

Sie werden als `SYNC_WEBHOOK_SECRET`, `HMAC_SECRET`, `ROLLUP_CRON_SECRET` und
`MAINTENANCE_CRON_SECRET` verwendet. Preview und Produktion erhalten verschiedene
Werte.

## 4. GitHub Environments konfigurieren

Im Repository die Environments `preview` und `production` anlegen. Für
`production` sind manuelle Freigabe und geschützte `main`-Branch-Regeln empfohlen.

Je Environment folgende **Secrets** setzen:

| Name | Inhalt |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase Personal Access Token |
| `SUPABASE_PROJECT_REF` | Project Ref der Umgebung |
| `SUPABASE_DB_PASSWORD` | Datenbankpasswort der Umgebung |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` der Umgebung |
| `CLOUDFLARE_API_TOKEN` | minimaler Worker/KV-Deploy-Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_ANALYTICS_READ_TOKEN` | nur `Account Analytics Read` |
| `SYNC_WEBHOOK_SECRET` | zufälliger gemeinsamer Sync-Schlüssel |
| `HMAC_SECRET` | zufälliger Schlüssel für Tages-IP-Pseudonyme |
| `ROLLUP_CRON_SECRET` | zufälliger Rollup-Schlüssel |
| `MAINTENANCE_CRON_SECRET` | zufälliger Cleanup-Schlüssel |

Je Environment folgende **Variables** setzen:

| Name | Beispiel |
|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `VITE_TRACKING_ORIGIN` | `https://qr.example.de` |
| `VITE_MAP_STYLE_URL` | optionaler MapLibre-Style, sonst leer |
| `CLOUDFLARE_ANALYTICS_DATASET` | Preview: `qr_scans_preview`, Produktion: `qr_scans` |
| `ADMIN_URL` | `https://admin.example.de` |
| `ALLOWED_ORIGINS` | `https://admin.example.de` (mehrere kommasepariert) |
| `CACHE_SYNC_URL` | Origin des Cache-Sync-Workers |
| `SMOKE_REDIRECT_SLUG` | optionaler bekannter aktiver Test-Slug |

`SUPABASE_URL` und `REDIRECT_URL` leitet der Workflow aus diesen Variablen ab.

## 5. Supabase Auth konfigurieren

Im Auth-URL-Dialog des jeweiligen Projekts setzen:

- Site URL: die Admin-Origin der Umgebung
- Redirect URLs: Admin-Origin und bei Bedarf konkrete Preview-Origin
- Google als OAuth-Provider aktivieren

In Google Auth Platform einen OAuth-Client vom Typ **Web application** anlegen.
Als autorisierte JavaScript-Origin die Admin-Origin und als Redirect-URI exakt
Folgendes eintragen:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Die von Google ausgegebene Client-ID und das Client-Secret anschließend unter
Supabase **Authentication → Sign In / Providers → Google** hinterlegen. Benötigt
werden nur die Scopes `openid`, `userinfo.email` und `userinfo.profile`.

E-Mail-OTP bleibt technisch als interner Rückfallpfad vorhanden, wird im
Produktions-UI aber nicht angeboten. Wenn es später wieder sichtbar werden soll,
muss zuvor ein eigener SMTP-Provider konfiguriert werden.

Vor dem öffentlichen Start den OAuth-Consent-Screen, die erlaubten Domains und
den Login mit einem Konto außerhalb des Projektteams testen.

## 6. Manueller Rollout

Pull Requests führen automatisch nur die Qualitätsprüfungen aus. Ein Merge oder
Push deployt nichts. Zum Rollout unter **GitHub → Actions → Deploy → Run workflow**
die Zielumgebung und den Umfang wählen:

- `admin`: nur Vite-Build und Admin-SPA; für reine UI-Änderungen.
- `backend`: Supabase-Migrationen, Edge Functions, Worker und KV-Abgleich.
- `all`: vollständiger Rollout beider Bereiche.

Produktion kann ausschließlich vom Branch `main` gestartet werden. Der manuelle
Workflow führt – abhängig vom gewählten Umfang – in dieser Reihenfolge aus:

1. Validierung aller Variablen, Resource-IDs und Secret-Formate
2. optional Supabase-Migrationen und Edge Functions
3. optional Worker-Secrets, Cache-Sync- und Redirect-Worker
4. optional Vault-basierte Webhook-/Cron-Konfiguration und KV-Reconciliation
5. optional Admin-SPA
6. HTTP-Smoke-Test

Der Pull Request muss vor einem Produktionsrollout grün sein. Der erste Deploy-
Lauf stoppt absichtlich, solange Platzhalter in den Wrangler-Dateien stehen oder
ein erforderlicher GitHub-Wert fehlt.

## 7. Abnahme nach dem ersten Rollout

- Google-Login mit einer echten Benutzeradresse durchführen.
- Prüfen, dass automatisch genau ein eigener Workspace entsteht.
- Kampagne und PDF-Vorlage anlegen, QR-Position visuell prüfen.
- Einen kleinen Batch erzeugen; Download erst nach Status `SYNCED` prüfen.
- Einen QR-Code extern öffnen: `307`, korrekte Ziel-URL, `Cache-Control: no-store`.
- Flyer aktivieren und Standortzuordnung kontrollieren.
- Flyer stilllegen: die Route muss nach KV-Propagation `410` liefern.
- Analytics-Ansicht nach einem Scan kontrollieren.
- In Supabase Cron die Jobs `qr-analytics-rollup-daily` und
  `qr-stale-reservations-daily` sowie deren Run-History prüfen.
- Im Schema `net` fehlgeschlagene HTTP-Aufrufe und in Cloudflare die Worker-Logs
  prüfen.

## 8. Betrieb und Rückfall

Alarme auf Worker-Fehlerrate, Outbox-Einträge mit wiederholtem `FAILED`, Storage-
und Datenbankverbrauch sowie Analytics-Engine-Limits einrichten. Secret-Rotation
immer zuerst in GitHub durchführen und danach den betroffenen Environment-Deploy
neu starten.

Der Tag `node-postgres-filesystem-v1` bleibt ein reproduzierbarer historischer
Stand. Er ist kein direktes Datenbank-Downgrade: Nach produktiven Migrationen wird
bei einem Rückfall die vorherige Worker-/SPA-Version erneut deployed, während die
Supabase-Datenbank vorab gesichert und nur mit einer geprüften Vorwärtsmigration
korrigiert wird.
