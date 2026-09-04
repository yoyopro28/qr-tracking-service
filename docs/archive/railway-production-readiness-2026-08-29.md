# Historical Production Readiness and Railway Deployment

Stand: 29. August 2026

> Historical snapshot retained for reference. Branch, dependency, and deployment
> status may no longer reflect the current repository state.

Der aktuelle Stand ist noch nicht produktionsreif deploybar. Hauptblocker sind der falsche Deployment-Branch, ungepatchte Next.js-/PDF.js-Sicherheitsluecken, fehlende CI-Tests und kein echter Healthcheck.

## Git- und GitHub-Bericht

Repository: <https://github.com/yoyopro28/qr-tracking-service>

- Sichtbarkeit: oeffentlich
- Default-Branch: `main`
- Repository ist nicht archiviert
- Keine Pull Requests vorhanden
- Keine GitHub-Actions-Workflows vorhanden
- Kein Branch-Schutz eingerichtet
- Einziger Tag: `local-before-railway-experiment`

### Branches

| Branch | Commit | Zustand |
| --- | --- | --- |
| `origin/main` | `3762d28` | GitHub-Default, aber zwei Funktionsstaende hinter dem aktuellen Code |
| lokales `main` | `77228ae` | Ein Commit vor `origin/main` |
| `railway-solo-deploy` | `fd15e45` | Inhaltlich identisch zu lokalem `main`, anderer Commit |
| `codex/location-analytics` | `7d58765` | Aktiver und vollstaendigster Branch, synchron mit Remote |

`codex/location-analytics` enthaelt gegenueber `origin/main` Flyer-Batches sowie Standortkarten und Analytics. Fuer ein Railway-Deployment sollte nicht der aktuelle Remote-Stand von `main` verwendet werden.

### Lokaler Arbeitsbaum

- `tsconfig.tsbuildinfo` ist versioniert und durch den Build veraendert.
- `ordnerstruktur.txt` ist unversioniert.
- `.env` und `uploads/` sind korrekt ignoriert.
- In der Git-Historie wurden keine eingecheckte echte `.env` und keine offensichtlichen Zugangsdaten gefunden, nur Beispielwerte.
- Lokale Uploads: 87 Dateien, rund 282 MB.

## Repository-Struktur

- `src/app`: Next.js-Routen, Server Actions, APIs und Redirect
- `src/domains`: Kampagnen, Flyer, Aktivierungen, Tracking und Analytics
- `src/server`: PDF-Erzeugung und lokaler Dateispeicher
- `prisma`: PostgreSQL-Schema und vier Migrationen
- `public`: lokal mitgelieferte PDF.js-Worker
- `package.json`: Build als Next.js-Standalone-Anwendung
- Keine Tests, kein `.github/workflows`, kein Dockerfile, kein `railway.toml` und keine festgelegte Node-Version

## Dependencies

Installiert sind 458 Pakete inklusive transitiver und optionaler Abhaengigkeiten.

### Direkte Produktionsabhaengigkeiten

| Paket | Installiert | Aktuell sinnvoll |
| --- | ---: | ---: |
| `next` | 15.5.15 | Mindestens 15.5.24 vor Deployment |
| `react` | 19.2.4 | 19.2.8 |
| `react-dom` | 19.2.4 | 19.2.8 |
| `@prisma/client` | 6.19.3 | Vorerst 6.19.3 oder geplante gemeinsame Prisma-Migration |
| `pdfjs-dist` | 5.6.205 | 6.2.108 mit Anpassung und Tests |
| `maplibre-gl` | 5.24.0 | Vorerst 5.24.0; Major 6 spaeter planen |
| `pdf-lib` | 1.17.1 | Aktuell |
| `qrcode` | 1.5.4 | Aktuell |

### Entwicklungsabhaengigkeiten

- TypeScript 5.9.3
- ESLint 9.39.4
- `eslint-config-next` 15.5.14
- Prisma CLI 6.19.3
- `@types/node` 22.19.17
- `@types/react` 19.2.14
- `@types/react-dom` 19.2.3

`@emnapi/runtime@1.9.2` liegt extraneous in `node_modules`; ein sauberes `npm ci` sollte es entfernen.

### Sicherheitsstatus

`npm audit` meldet zehn High-Severity-Pakete, davon acht in der als produktiv betrachteten Kette. Es wurden keine kritischen Advisories gemeldet.

Besonders relevant:

- Next.js 15.5.15 hat mehrere Advisories einschliesslich Middleware-Bypass. Da die Admin-Authentifizierung in `src/middleware.ts` sitzt, ist das ein Deployment-Blocker.
- PDF.js 5.6.205 hat eine Schwachstelle beim Oeffnen manipulierter PDFs.
- Weitere Funde liegen transitiv in PostCSS, Sharp, Nanoid und der Prisma-Konfiguration.

## Checkliste: Code und Git

- [ ] `codex/location-analytics` ueber einen Pull Request in `main` uebernehmen.
- [ ] `railway-solo-deploy` anschliessend entfernen, da der Branch inhaltlich redundant ist.
- [ ] `tsconfig.tsbuildinfo` aus Git entfernen und in `.gitignore` aufnehmen.
- [ ] Ueber `ordnerstruktur.txt` entscheiden: dokumentieren oder nicht committen.
- [ ] Repository optional auf privat stellen.
- [ ] Branch-Schutz fuer `main` aktivieren: Pull Request erforderlich, CI erforderlich, kein Force-Push.
- [ ] Node.js in `package.json` auf Node 22 LTS festlegen.
- [ ] Next.js und `eslint-config-next` mindestens auf 15.5.24 aktualisieren.
- [ ] React und React DOM auf 19.2.8 aktualisieren.
- [ ] PDF.js auf 6.2.108 migrieren und die Worker-Dateien in `public/` erneuern.
- [ ] Danach `npm ci`, `npm audit`, `npm run lint` und `npm run build` ausfuehren.
- [ ] GitHub Actions fuer Installation, Audit, Lint, Build und Tests hinzufuegen.
- [ ] Tests fuer Kampagne, Flyer-Erzeugung, Aktivierung, Redirect und Scan-Attribution hinzufuegen.
- [ ] Echten `/api/health`-Endpunkt mit PostgreSQL- und Volume-Pruefung implementieren.
- [ ] Upload- und Flyer-Dateien beim Loeschen bereinigen; aktuell entstehen verwaiste PDFs.
- [ ] Kampagnen archivieren, statt Scan-Historie durch Cascade endgueltig zu loeschen.
- [ ] Verhalten fuer `RETIRED` und nicht aktivierte Flyer ausdruecklich festlegen.
- [ ] Scan-Deduplizierung, Bot-Erkennung und Aufbewahrungsfrist ergaenzen.
- [ ] Gesalzenen beziehungsweise regelmaessig wechselnden IP-Hash oder Verzicht auf IP-Speicherung umsetzen.
- [ ] Error-Tracking, beispielsweise Sentry, ergaenzen.

## Checkliste: Railway

- [ ] Railway-Hobby-Projekt in einer europaeischen Region erstellen.
- [ ] GitHub-Repository verbinden und ausschliesslich `main` deployen.
- [ ] Railway PostgreSQL im selben Projekt hinzufuegen.
- [ ] App-Volume unter `/data/uploads` mounten.
- [ ] `DATABASE_URL` als Referenz auf den PostgreSQL-Service setzen.
- [ ] `UPLOADS_DIR=/data/uploads` setzen.
- [ ] `ADMIN_USERNAME` und ein zufaelliges starkes `ADMIN_PASSWORD` setzen.
- [ ] `NEXT_PUBLIC_APP_URL=https://qr.deine-domain.de` setzen.
- [ ] Build Command auf `npm run build` setzen.
- [ ] Start Command auf `npm run start` setzen.
- [ ] Pre-Deploy Command auf `npx prisma migrate deploy` setzen.
- [ ] Restart-Policy `On Failure` konfigurieren.
- [ ] Healthcheck auf den neu implementierten `/api/health` setzen.
- [ ] Kostenlimit und E-Mail-Benachrichtigungen aktivieren.
- [ ] Nur den App-Service oeffentlich erreichbar machen; PostgreSQL bleibt intern.
- [ ] Eigene Domain verbinden und HTTPS abwarten.
- [ ] `NEXT_PUBLIC_APP_URL` kontrollieren und erneut deployen.
- [ ] Railway auf erfolgreiche GitHub-CI warten lassen.
- [ ] Taegliche, woechentliche und monatliche Backups fuer PostgreSQL und Upload-Volume aktivieren.
- [ ] Zusaetzlich regelmaessigen `pg_dump` ausserhalb des eigentlichen Projekts speichern.
- [ ] Restore-Test durchfuehren.
- [ ] Externes Uptime-Monitoring auf Healthcheck und einen kontrollierten Redirect einrichten.

Railway-Referenzen:

- <https://docs.railway.com/overview/production-readiness-checklist>
- <https://docs.railway.com/guides/postgres-backups-restores>
- <https://docs.railway.com/volumes>
- <https://docs.railway.com/deployments/pre-deploy-command>

## Abnahmetest vor dem ersten echten Druck

- [ ] Produktionsdomain ist erreichbar und HTTPS funktioniert.
- [ ] Admin-Routen verlangen Authentifizierung; `/r/<shortcode>` bleibt oeffentlich.
- [ ] Kampagne mit echter Ziel-URL erstellen.
- [ ] PDF hochladen und QR-Platzierung speichern.
- [ ] Drei bis fuenf Testflyer erzeugen und herunterladen.
- [ ] Gedruckte QR-Codes mit mindestens zwei Smartphones testen.
- [ ] Flyer ueber den Admin-Scan aktivieren und einem Standort zuordnen.
- [ ] Scan ueber Mobilfunk ausfuehren und Redirect kontrollieren.
- [ ] Scan in Analytics dem richtigen Flyer und Standort zuordnen.
- [ ] App neu deployen und Fortbestand von Datenbankdaten und PDFs pruefen.
- [ ] Backup wiederherstellen und den Wiederherstellungsweg dokumentieren.

Erst danach sollte die Produktionsdomain in einer groesseren Auflage von Flyer-QRs verwendet werden.
