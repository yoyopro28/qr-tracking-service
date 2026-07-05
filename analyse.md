# Analyse der QR-Tracking-Webapp

Stand: 5. Juli 2026

Analysierter Commit: `77228ae` (`main`, „Generate flyer batches as PDFs“)

## Kurzfazit

Die Anwendung ist ein funktional weit fortgeschrittener Solo-MVP. Der komplette Kernablauf ist im Code vorhanden: Kampagne anlegen, PDF hochladen, QR-Flächen definieren, eindeutige QR-Codes in ein Batch-PDF rendern, Flyer einem Standort zuweisen, öffentliche Scans protokollieren und Kennzahlen anzeigen. TypeScript, Prisma-Schema und Production-Build sind fehlerfrei.

Für einen kontrollierten Solo-Einsatz ist die Basis brauchbar. Für einen belastbaren öffentlichen Betrieb fehlen vor allem automatisierte Tests, robuste Transaktionsgrenzen zwischen Datenbank und Dateisystem, Ressourcenbegrenzungen bei der PDF-Generierung sowie Betriebs- und Sicherheitsmechanismen. Für einen echten Mehrbenutzerbetrieb ist die App noch nicht geeignet: Alle Admin-Zugriffe verwenden gemeinsame HTTP-Basic-Auth-Zugangsdaten und arbeiten im selben fest verdrahteten Demo-Workspace.

Die wichtigsten Risiken sind:

1. Es existiert keine automatisierte Test-Suite für die fachlich kritischen Abläufe.
2. Die synchrone Batch-PDF-Erzeugung kann sehr viel Speicher, Laufzeit und Plattenplatz benötigen.
3. Datenbank und Dateisystem können bei Fehlern oder Löschvorgängen auseinanderlaufen.
4. Uploads werden nicht anhand des tatsächlichen PDF-Inhalts verifiziert und später teilweise mit dem vom Browser gelieferten MIME-Typ inline ausgeliefert.
5. Die Regel „ein Flyer wird genau einmal aktiviert“ ist nicht gegen parallele Requests in der Datenbank abgesichert.

## Umfang und Vorgehen

Untersucht wurden Projektstruktur, Anwendungscode, Server Actions, API-Routen, Middleware, Prisma-Schema und Migrationen, Storage- und PDF-Helfer, Konfiguration, Deployment-Skript sowie die fachlichen Projektdokumente. `node_modules`, Build-Ausgaben und Binärdateien wurden nicht inhaltlich analysiert.

Ausgeführt wurden:

- ESLint
- TypeScript-Prüfung ohne Emit und ohne inkrementelle Schreibvorgänge
- Prisma-Schema-Validierung
- Abhängigkeitskonsistenz mit `npm ls`
- vollständiger Next.js-Production-Build in einer temporären Kopie unter `/tmp`
- kurzer Laufzeit-Smoke-Test des temporären Standalone-Builds

Im Projekt gab es vor der Analyse bereits die unversionierte Datei `ordnerstruktur.txt`. Sie wurde nicht verändert. Der Production-Build wurde bewusst nicht im Arbeitsverzeichnis ausgeführt, damit `.next` und `tsconfig.tsbuildinfo` unverändert bleiben. Die einzige von dieser Analyse angelegte Projektdatei ist `analyse.md`.

## Funktionsumfang der Webapp

| Bereich | Aktueller Stand | Einordnung |
|---|---|---|
| Admin-Schutz | HTTP Basic Auth in `src/middleware.ts` | Für einen einzelnen Betreiber einfach und wirksam, aber kein Benutzer-/Workspace-Login |
| Kampagnen | Anlegen, anzeigen, bearbeiten und löschen | Kern-CRUD vorhanden; Beschreibung und Status sind im Modell, aber nicht wirklich bedienbar |
| Templates | PDF-Upload, Vorschau und eine oder mehrere QR-Flächen | Gute visuelle Platzierungsoberfläche; kein sichtbarer Delete- oder nachträglicher Edit-Flow |
| Flyer | Eindeutige Shortcodes, Tracking-URLs und kombinierte Batch-PDFs | Kernfunktion vorhanden; Generierung erfolgt synchron im Webrequest |
| Aktivierung | Shortcode-Suche, Kamera-Scanner, vorhandener oder neuer Standort | Funktional vollständig für den MVP; Parallelität und Statusregeln sind nicht ausreichend abgesichert |
| Tracking | Öffentliche Route `/r/[shortcode]`, Scan-Event und Redirect | Fachlich korrekt aufgebaut; abhängig von Datenbankverfügbarkeit und ohne Missbrauchsschutz |
| Analytics | Summen, Kampagnen, Top-Flyer, Top-Standorte, letzte Scans | Für MVP-Volumen ausreichend; keine Zeitreihen, Unique-Logik oder Filter |
| Deployment | Next.js Standalone, Prisma/Postgres, persistentes Upload-Verzeichnis | Für eine einzelne Instanz geeignet; nicht horizontal skalierbar |

Die Projektdokumentation beschreibt teilweise bereits weitergehende Ziele als der aktuelle Code erfüllt. Insbesondere Sign-up/Login, getrennte Benutzer-Workspaces, Flyer-Detailseite, vollständige Statuspflege, Unique-Scans und Zeitreihen sind noch nicht implementiert.

## Architektur

```text
Admin-Browser
  -> Next.js Middleware (Basic Auth)
  -> App-Router-Seiten / Server Actions
  -> Domain-Module
       -> Prisma -> PostgreSQL
       -> PDF-/QR-Renderer -> persistentes Upload-Verzeichnis

Öffentlicher Scanner
  -> /r/[shortcode]
  -> Flyer + Kampagne aus PostgreSQL lesen
  -> ScanEvent schreiben
  -> 307-Redirect zur Kampagnen-URL
```

Die Anwendung ist ein sinnvoller modularer Monolith. UI, fachliche Module und Infrastruktur sind grundsätzlich getrennt. Positiv ist insbesondere, dass Campaigns, Templates, Flyers, Activations, Tracking und Analytics eigene Domain-Dateien besitzen. Die Grenzen sind aber nicht vollständig: Flyer-Generierung koordiniert Datenbankanlage, QR-Erzeugung, komplettes PDF-Rendering, Dateischreibvorgang und nachträgliches DB-Update in einer einzigen synchronen Funktion.

Alle Admin-Abläufe rufen `resolveDemoWorkspace()` auf. Das Datenmodell enthält zwar `User`, `Workspace` und `WorkspaceMember`, diese werden für Authentifizierung und Autorisierung derzeit nicht verwendet.

## Positive Befunde

- TypeScript läuft im Strict-Modus, und die Typprüfung ist fehlerfrei.
- Workspace- und Campaign-IDs werden in den wichtigsten Queries mitgeführt und geprüft.
- Der Storage-Layer verhindert absolute Pfade und Directory Traversal mit einer Root-Pfad-Prüfung.
- Shortcodes werden kryptografisch zufällig erzeugt, sind in der Datenbank eindeutig und werden bei Kollisionen erneut versucht.
- Kampagnenziele werden auf `http:` und `https:` begrenzt.
- Der QR-/PDF-Renderer wird sowohl für die Druckvorschau als auch für die finale Ausgabe wiederverwendet. Ein älteres Architekturdokument, das hier noch doppelte Logik nennt, ist an diesem Punkt überholt.
- Scan-Events speichern die Standortzuordnung zum Scanzeitpunkt. Spätere Standortänderungen würden historische Events damit nicht rückwirkend verfälschen.
- Ein Fehler beim Schreiben eines Scan-Events verhindert nach erfolgreichem Flyer-Lookup nicht den Redirect.
- Datenbankmigrationen und aktuelles Prisma-Schema passen zusammen.
- README und Deployment-Hinweise erklären die notwendige Kombination aus Datenbank- und Volume-Backup nachvollziehbar.

## Priorisierte Befunde

### Hohe Priorität

#### 1. Keine automatisierten Tests

Es gibt weder Testdateien noch ein `test`-Skript oder Test-Framework. Damit sind insbesondere folgende Kernregeln ungeschützt:

- Koordinatenumrechnung zwischen PDF.js und `pdf-lib`
- Mengen- und Placement-Validierung
- Eindeutige Shortcodes und Kollisionsbehandlung
- Aktivierung und Standortzuordnung
- Tenant-/Workspace-Isolation
- Scan-Logging und Redirect-Verhalten
- Fehlerbereinigung bei teilweise erzeugten Batches

Der erfolgreiche Build belegt Kompilierbarkeit, aber nicht fachliche Korrektheit. Schon kleine Änderungen am PDF-Rendering können druckbare Dateien formal korrekt erzeugen und trotzdem QR-Codes an falschen Positionen platzieren.

Empfehlung: zuerst Unit-Tests für reine Funktionen, dann Postgres-Integrationstests und mindestens einen vollständigen End-to-End-Test mit einer kleinen echten PDF-Datei einführen.

#### 2. Synchrone Batch-Erzeugung hat ein hohes Ressourcenrisiko

`generateCampaignFlyers()` legt alle Flyer-Datensätze nacheinander an, kopiert für jedes gewünschte Blatt sämtliche Seiten des Templates, generiert jeden QR-Code einzeln und speichert am Ende das gesamte PDF. Die Eingabe begrenzt zwar die Menge auf 250, die Zahl der QR-Platzhalter ist serverseitig jedoch nicht begrenzt. Die tatsächliche Arbeit ist daher `Menge × Platzhalter × Template-Seiten`.

Das ist bereits im lokalen Datenbestand sichtbar:

- Upload-Verzeichnis: rund 265 MB
- 16 Template-Dateien und 47 generierte PDF-Dateien
- ein vorhandenes Batch-PDF ist rund 74 MB groß

Bei großen oder mehrseitigen 15-MB-Templates drohen hohe RAM-Nutzung, Request-Timeouts und sehr große Ausgabedateien. Die Server-Action-Grenze von 16 MB liegt außerdem so nah an der erlaubten Uploadgröße von 15 MB, dass Multipart-/Action-Overhead Uploads nahe am Limit schon vor der eigenen Validierung ablehnen kann.

Empfehlung: maximale Platzhalter- und Gesamtseitenzahl definieren, geschätzte Ausgabekosten vor dem Start prüfen, kleinere Batches erlauben und die Erzeugung mittelfristig in einen Job mit Status und Fortschritt verschieben.

#### 3. Datenbank und Dateisystem sind nicht konsistent gekoppelt

Mehrere Fehlerpfade erzeugen Datei-Leichen oder inkonsistente Zustände:

- Template-Datei wird vor dem Prisma-Record geschrieben; schlägt der DB-Insert fehl, bleibt die Datei liegen.
- Batch-PDF wird vor `flyer.updateMany()` geschrieben; schlägt das Update fehl, werden Datensätze gelöscht, die Datei aber nicht.
- Flyer- und Campaign-Deletes löschen Datenbankzeilen, aber keine erzeugten PDF- oder Template-Dateien.
- Das Löschen eines Flyers löscht absichtlich den gesamten Batch anhand des gemeinsamen Storage Keys, entfernt aber die Batch-Datei nicht.

Empfehlung: für jeden Ablauf einen expliziten zweiphasigen Zustand definieren, kompensierende Dateilöschung implementieren und einen periodischen Orphan-Check vorsehen. Löschvorgänge sollten zuerst alle betroffenen Storage Keys ermitteln und Pfade ausschließlich über die vorhandenen sicheren Storage-Helper entfernen.

#### 4. Authentifizierung und Workspace-Modell sind nur eine Solo-Attrappe

Basic Auth schützt die vorgesehenen Admin-Pfade zuverlässig, aber alle korrekt angemeldeten Requests teilen dieselben Zugangsdaten und denselben `demo-workspace`. `User`, `WorkspaceMember`, Rollen und `activatedByUserId` werden nicht verwendet. Damit gibt es keine benutzerspezifische Autorisierung, keine Sitzungsverwaltung, keine Audit-Zuordnung und keinen sicheren Workspace-Wechsel.

Das ist für den dokumentierten Solo-Betrieb vertretbar, widerspricht aber der ebenfalls dokumentierten Mehrbenutzer-/SaaS-Vorbereitung. Vor mehreren Kunden muss jeder Server-Action- und API-Zugriff seinen Workspace aus einer verifizierten Identität ableiten; eine vom Client übergebene Workspace-ID wäre nicht ausreichend.

#### 5. PDF-Upload prüft nicht den tatsächlichen Inhalt

Ein Upload wird akzeptiert, wenn MIME-Typ **oder** Dateiendung nach PDF aussieht. Die Datei wird vor einem echten `PDFDocument.load()` gespeichert. Außerdem wird der vom Browser gelieferte MIME-Typ in der Datenbank gespeichert und beim Dokument-Download als `Content-Type` für eine Inline-Antwort verwendet.

Damit kann beispielsweise eine Datei `inhalt.pdf` mit MIME-Typ `text/html` die Validierung passieren und anschließend same-origin inline als HTML ausgeliefert werden. Im aktuellen Solo-Modell setzt das einen angemeldeten, aktiv hochladenden Benutzer voraus; in einem Mehrbenutzersystem wäre dies ein relevantes Stored-XSS-Risiko.

Empfehlung: Uploadbytes vor dem Speichern mit einer PDF-Bibliothek öffnen, nur erfolgreich parsebare PDFs akzeptieren, serverseitig immer `application/pdf` ausliefern, `X-Content-Type-Options: nosniff` setzen und Dateinamen für `Content-Disposition` korrekt kodieren.

### Mittlere Priorität

#### 6. Aktivierung ist nicht parallelitätssicher

Die Transaktion liest zuerst den Flyerstatus, legt dann eine Aktivierung an und setzt danach den Status. Zwei parallele Requests können beide `GENERATED` sehen und zwei Aktivierungsrecords erzeugen. Das Schema besitzt keinen Unique Constraint auf `Activation.flyerId`.

Zusätzlich blockiert der Code nur den Status `ACTIVATED`; ein künftig `RETIRED` gesetzter Flyer könnte wieder aktiviert werden. Zuerst sollte fachlich entschieden werden, ob Reaktivierungen als Event-Historie erlaubt sein sollen. Falls exakt eine Aktivierung gilt, sollte dies durch einen Unique Constraint und ein bedingtes Status-Update abgesichert werden.

#### 7. Placement-Validierung ist unvollständig

Der Server prüft positive Maße und nichtnegative Koordinaten, aber nicht:

- `pageNumber <= pageCount`
- `x + width <= pageWidth`
- `y + height <= pageHeight`
- maximale Zahl von Platzhaltern
- eindeutige Placement-IDs
- quadratische Maße, obwohl die UI „Square only“ verspricht

Die Seitengröße und Seitenzahl werden serverseitig außerdem nur per regulärem Ausdruck aus dem PDF-Text geschätzt. Komprimierte, vererbte, beschnittene oder gedrehte PDF-Seiten können dadurch falsch interpretiert werden. Die Client-Vorschau verwendet dagegen PDF.js. Diese unterschiedlichen Metadatenquellen können zu einer korrekten Vorschau, aber falscher Druckposition führen.

Empfehlung: PDF serverseitig wirklich parsen und Placement-Grenzen gegen die konkrete Zielseite validieren. Tests sollten gedrehte Seiten, CropBox/MediaBox, mehrere Seiten und Randpositionen enthalten.

#### 8. Öffentliche Tracking-Route ist leicht manipulierbar und datenbankabhängig

Jeder Request auf einen bekannten Shortcode erzeugt ein Scan-Event. Es gibt keine Bot-Erkennung, Deduplizierung, Rate Limits oder Größenbegrenzung für `User-Agent` und `Referer`. Kennzahlen können deshalb einfach verfälscht und die Datenbank unnötig vergrößert werden.

Der Redirect wartet synchron auf den DB-Insert. Bei langsamer Datenbank wird damit auch der Besucher-Redirect langsam. Ein Insert-Fehler wird zwar abgefangen, der vorherige Flyer-Lookup ist aber zwingend datenbankabhängig und aktuell nicht separat behandelt. Bei nicht verfügbarer Datenbank endet der öffentliche Request mit `500`.

Empfehlung: Request-Metadaten begrenzen, bekannte Bots markieren, eine einfache Deduplizierungsstrategie definieren, Rate Limits einführen und für den Redirect messbare Zeitlimits/Monitoring ergänzen. Für höhere Zuverlässigkeit wären ein gecachter Shortcode-Ziel-Lookup und asynchrones Event-Ingest sinnvoll.

#### 9. IP-Hashing ist kein belastbares Privacy- oder Unique-Konzept

Die App hasht die erste `x-forwarded-for`-Adresse direkt mit SHA-256. Ohne geheimen Salt/HMAC lassen sich kleine oder bekannte IP-Räume wiedererkennen. Außerdem wird dem Forwarding-Header ohne explizite Proxy-Vertrauenskonfiguration geglaubt; ein Client kann abhängig von der Plattform möglicherweise den verwendeten Wert beeinflussen. `isUniqueEstimate` bleibt immer `false`.

Empfehlung: Datenschutz-/Aufbewahrungskonzept festlegen, nur vertrauenswürdige Proxy-Header auswerten, für pseudonyme Tages-/Zeitraum-IDs HMAC mit rotierendem Geheimnis verwenden und alte Rohmetadaten löschen oder aggregieren.

#### 10. Fachliche Statusmodelle sind weitgehend inaktiv

`CampaignStatus` enthält `DRAFT`, `ACTIVE`, `ARCHIVED`; Kampagnen bleiben aber immer `DRAFT`. `FlyerStatus` enthält `GENERATED`, `PRINTED`, `ACTIVATED`, `RETIRED`; praktisch werden nur `GENERATED` und `ACTIVATED` gesetzt. Redirect und Scan-Logging berücksichtigen weder Campaign- noch Flyerstatus. Ein später pensionierter Flyer würde daher weiterhin umleiten und Scans erzeugen.

Empfehlung: erlaubte Zustandsübergänge explizit definieren und zentral testen. Falls die zusätzlichen Zustände im MVP nicht gebraucht werden, sollte ihre Semantik bis zur Implementierung nicht als bestehende Funktion dokumentiert werden.

#### 11. Datenmodell erlaubt widersprüchliche Tenant-Zuordnungen

Viele Tabellen speichern `workspaceId`, `campaignId`, `flyerId`, `templateId` und `locationId` parallel, die Fremdschlüssel sichern aber nur die einzelne Existenz. Die Datenbank verhindert beispielsweise nicht grundsätzlich, dass ein Flyer auf eine Kampagne und ein Template aus verschiedenen Workspaces verweist. Der aktuelle Anwendungscode prüft die meisten Pfade korrekt, aber ein späterer Import, Admin-Job oder neuer Endpoint kann inkonsistente Daten erzeugen.

Empfehlung: Invarianten entweder durch zusammengesetzte Schlüssel/Fremdschlüssel oder durch eine zentrale, getestete Write-Schicht absichern. Für Analytics wären bei wachsendem Volumen zusammengesetzte Indizes wie `(workspaceId, occurredAt)`, `(workspaceId, flyerId)` und `(workspaceId, locationId)` passender als ausschließlich getrennte Indizes.

#### 12. Betriebsbeobachtung und Healthcheck sind zu schwach

Fehler werden nur per `console.error` protokolliert. Es fehlen strukturierte Request-/Batch-IDs, Metriken, Fehlertracking und Alarmierung. Der öffentliche Healthcheck testet nur die QR-Bibliothek; Datenbank, Upload-Volume und Schreibrechte werden nicht geprüft. Er gibt im Fehlerfall zudem interne Fehlermeldungen zurück.

Empfehlung: getrennte Liveness- und Readiness-Checks einführen, DB und Storage in Readiness prüfen und Fehler zentral strukturiert erfassen. Generierungsdauer, PDF-Größe, Redirect-Latenz und Scan-Insert-Fehler sind die wichtigsten ersten Metriken.

### Niedrige Priorität und Wartbarkeit

- `Number.parseInt()` akzeptiert Eingaben wie `10abc` oder `1.5` als Ganzzahl. Betroffen sind unter anderem Flyer-Menge und Seitenzahl. Nach dem Parsen sollte der normalisierte String vollständig gegen ein Integer-Muster geprüft werden.
- Die UI für `updateTemplatePlacementAction()` ist nicht angebunden. Vorhandene Templates können in der sichtbaren Campaign-Seite nicht nachträglich bearbeitet werden.
- Die Datei `public/pdf.worker.min.mjs` ist offenbar ungenutzt; verwendet wird `public/vendor/pdfjs/pdf.worker.min.mjs`. Das sind rund 1,3 MB doppeltes statisches Asset.
- PDF.js wird über indirektes `eval('import(...)')` geladen. Das erschwert Bundling, Typisierung und eine spätere Content-Security-Policy ohne `unsafe-eval`.
- Mehrere exportierte `*Module`-Statusobjekte und `generateQRCodeMultiFormat()` werden produktiv nicht verwendet.
- `globals.css` ist mit 929 Zeilen ein wachsender globaler Wartbarkeitshotspot.
- Das installierte `node_modules` enthält `@emnapi/runtime` als extraneous Dependency. Ein sauberes `npm ci` sollte diesen lokalen Drift entfernen.
- ESLint meldet beim QR-Viewer eine `no-img-element`-Warnung. Bei einem dynamischen Data-URL-QR ist ein natives `<img>` fachlich plausibel; die Regel sollte dann gezielt mit Begründung unterdrückt werden, statt als dauerhafte Warnung bestehen zu bleiben.
- Sicherheitsheader wie CSP, HSTS, `X-Content-Type-Options` und eine Referrer Policy werden nicht explizit gesetzt. HSTS muss dabei nur hinter garantiertem HTTPS aktiviert werden.
- Der Kamera-Scanner basiert auf `BarcodeDetector` und fällt sinnvoll auf manuelle Eingabe zurück. Browserkompatibilität und Berechtigungsfehler sind aber nicht automatisiert getestet.
- Datumsdarstellung ist uneinheitlich: Teile verwenden Server-Locale, die Batch-Karte erzwingt `en-GB` und UTC. Für reale Nutzer sollte Locale/Timezone bewusst einheitlich sein.

## Ergebnisse der ausgeführten Prüfungen

Umgebung: Node.js `v24.15.0`, npm `11.12.1`.

| Prüfung | Ergebnis | Details |
|---|---|---|
| `npm run lint` | Bestanden | 0 Fehler, 1 Warnung zu `<img>` in `qr-code-viewer.tsx` |
| `tsc --noEmit --incremental false` | Bestanden | Keine Typfehler, keine Ausgabe geschrieben |
| `prisma validate` | Bestanden | Schema ist gültig |
| `npm ls --depth=0` | Bestanden mit Hinweis | Deklarierte Pakete auflösbar; `@emnapi/runtime` lokal als extraneous |
| Next.js Production-Build | Bestanden | In temporärer Kopie; Compile, Typecheck, statische Generierung und Standalone-Vorbereitung erfolgreich |
| Standalone-Start | Bestanden | Temporärer Production-Server wurde erfolgreich gestartet |
| `/` ohne Auth | Bestanden | HTTP 401 |
| `/api/qr/DOESNOTEXIST` ohne Auth | Bestanden | HTTP 401 |
| `/api/health/qrcode-check` | Bestanden | HTTP 200 |
| `/r/DOESNOTEXIST` | Nicht fachlich prüfbar | HTTP 500, weil lokal kein PostgreSQL auf `localhost:5432` erreichbar war |

Der Build weist ungefähr 102 kB gemeinsam geladenes JavaScript aus. Die größte fachliche Seite ist `/campaigns/[campaignId]` mit rund 7,6 kB route-spezifischem JavaScript und rund 113 kB First Load JS. Für diesen MVP ist das unauffällig.

Nicht durchgeführt wurden DB-abhängige End-to-End-Tests, echte Upload-/Render-/Aktivierungsabläufe und ein aktueller Dependency-Vulnerability-Audit. Eine Datenbank zu starten oder Testdaten zu verändern hätte den gewünschten rein lesenden Projektzustand verlassen; aktuelle Vulnerability-Daten benötigen außerdem eine externe Advisory-Quelle.

## Empfohlene Teststrategie

### 1. Unit-Tests

- `validateCampaignInput`, `validateTemplateInput`, `validateFlyerGenerationInput`, `validateActivationInput`
- exakte Integer-Validierung und Grenzwerte
- `getStoredTemplateQrPlacements`
- `mapQrPlacementToPdfPage`, einschließlich Rotation/Ränder/ungültiger Werte
- `buildUploadPath`, `buildStorageKey`, `resolveUploadStoragePath` mit Traversal-Versuchen
- Shortcodeformat und kontrollierte Kollisionswiederholung
- QR-Payload-Extraktion des Kamera-Scanners

### 2. Integrationstests mit temporärem PostgreSQL

- Campaign-, Template-, Flyer-, Activation- und Scan-Schreibpfade
- Workspace-Isolation bei jedem Query- und Mutationstyp
- zwei parallele Aktivierungsrequests
- Transaktions- und Cleanup-Verhalten bei simulierten Storage-/DB-Fehlern
- Redirect mit erfolgreichem und fehlgeschlagenem Scan-Insert
- Kaskaden beim Löschen sowie anschließender Storage-Orphan-Check

### 3. PDF-Golden-Tests

- kleine Fixture-PDFs für A4, Landscape, Rotation, mehrere Seiten und CropBox
- erzeugte Seite wieder mit einer PDF-Bibliothek öffnen
- Anzahl Seiten, eingebettete QR-Bilder und erwartete Bounding Boxes prüfen
- QR-Code aus gerasterter Ausgabe wieder decodieren

### 4. End-to-End-Test

Mit Playwright oder vergleichbar:

1. unauthentifizierten Admin-Zugriff ablehnen
2. Kampagne erstellen
3. echtes PDF hochladen und Placement setzen
4. zwei Flyer erzeugen
5. PDF herunterladen und QR-Ziel prüfen
6. Flyer aktivieren
7. öffentliche Redirect-Route aufrufen
8. Scan in Analytics mit korrektem Flyer und Standort verifizieren

## Empfohlene Reihenfolge der nächsten Arbeiten

### Vor einem ernsthaften öffentlichen Solo-Einsatz

1. Kern-Unit- und ein vollständiger DB-End-to-End-Test.
2. Echte PDF-Validierung, sichere MIME-Ausgabe und Security Header.
3. Limits für Platzhalter, Seiten und geschätzte Batch-Größe.
4. Datei-Cleanup und definierte Kompensation bei Teilausfällen.
5. Aktivierungsregel fachlich festlegen und datenbankseitig absichern.
6. Redirect-Latenz, Fehlerquote und Storage-Verbrauch überwachen.
7. Einfachen Missbrauchs-/Bot-Schutz und Datenaufbewahrung für Scan-Metadaten festlegen.

### Vor einem Mehrbenutzer- oder SaaS-Betrieb

1. Echte Benutzer-Authentifizierung und Sessions einführen.
2. Workspace aus der verifizierten Identität ableiten und jede Operation autorisieren.
3. Tenant-Invarianten in Datenbank und Integrationstests absichern.
4. Storage auf mandantenfähigen Object Storage mit Lifecycle-Regeln umstellen.
5. PDF-Generierung in einen begrenzten Hintergrundjob verschieben.
6. Audit-Log, Rate Limits, strukturierte Logs und Monitoring ergänzen.

## Gesamtbewertung

| Dimension | Bewertung |
|---|---|
| Funktionaler MVP | Gut: Kernablauf ist vollständig im Code vorhanden |
| Codebasis | Solide Grundlage mit einigen großen und eng gekoppelten Hotspots |
| Typ- und Buildqualität | Gut: alle lokalen statischen Prüfungen bestehen |
| Testbarkeit | Schwach: keine automatisierten Tests vorhanden |
| Solo-Produktionsreife | Bedingt: für kontrollierte geringe Last nach den wichtigsten Härtungen |
| Mehrbenutzerfähigkeit | Nicht gegeben, trotz vorbereitetem Datenmodell |
| Skalierbarkeit | Niedrig: synchrone PDF-Erzeugung und lokales Dateisystem |
| Betriebssicherheit | Ausbaufähig: Cleanup, Readiness, Monitoring und Recovery fehlen |

Die App ist damit kein unfertiger Prototyp mehr, aber noch ein MVP mit klaren Produktionsgrenzen. Der größte Qualitätsgewinn entsteht nicht durch weitere Features, sondern durch Tests, kontrollierte Generierungsgrenzen und konsistente Fehlerbehandlung zwischen PostgreSQL und Storage.
