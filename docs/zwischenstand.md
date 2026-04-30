# Architektur-Zwischenstand

Stand: 2026-04-30

## Kurzfazit

Die App ist als MVP gut nachvollziehbar aufgebaut: Next.js App Router fuer UI, Server Actions und Routen, Prisma fuer Persistenz, Domain-Module fuer fachliche Logik und Storage-Helper fuer PDF-Dateien. Die Kernflows Campaigns, Templates, Flyer-Generierung, Aktivierung, Tracking und Analytics sind funktional getrennt genug, um weiter daran zu arbeiten.

Die groessten Risiken liegen nicht in der Grundidee, sondern in einigen gewachsenen Hotspots: grosse Client-Komponenten, doppelte PDF-/QR-Logik, teilweise vermischte Verantwortlichkeiten in Domain-Funktionen und fehlende technische Absicherungen fuer einige fachliche Regeln.

## Wichtige Schwachstellen

- `TemplateUploadForm` ist sehr gross und buendelt Upload, PDF-Metadaten, PDF.js-Rendering, Canvas-Interaktion, Placement-State und Formularlogik in einer Komponente.
- PDF-Metadaten und QR-/PDF-Placement-Logik sind an mehreren Stellen verteilt und teilweise doppelt umgesetzt.
- Flyer-Generierung kombiniert Datenbankanlage, QR-Erzeugung, PDF-Rendering, Dateiablage und DB-Update in einem Ablauf. Das kann bei Teilausfaellen inkonsistente Zustaende erzeugen.
- Die Aktivierungsregel "ein Flyer wird einmal aktiviert" ist hauptsaechlich in Code-Logik abgebildet und nicht stark genug in der Datenbank abgesichert.
- `trackingUrl` wird aktuell gespeichert. Bei wechselnder `NEXT_PUBLIC_APP_URL`, etwa lokalen Tunnel-URLs, koennen alte Flyer-URLs fachlich veralten.
- Delete-Flows entfernen Datenbankeintraege, aber generierte lokale Dateien bleiben vermutlich im Upload-Verzeichnis liegen.
- `globals.css` enthaelt viel feature-spezifisches Styling und wird mit weiterer UI schnell schwer wartbar.
- Analytics liest direkt aus Prisma und ist fuer das aktuelle Volumen okay, koennte bei groesserer Nutzung aber ein eigener Lesebereich werden.

## Refactoring-Vorschlaege

### 1. Template-Upload und Placement-UI aufteilen

Nutzen: deutlich bessere Wartbarkeit, leichter testbare Teilbereiche, weniger Risiko bei UI-Anpassungen.

Risiko: niedrig bis mittel, weil hauptsaechlich Client-Code verschoben wird. Wichtig ist, das bestehende Verhalten 1:1 zu erhalten.

Vorschlag:
- PDF-Auswahl und Upload-Formular trennen.
- PDF-Vorschau und Canvas-Placement als eigene Komponente kapseln.
- Placement-State und Drag-/Resize-Logik in einen Hook auslagern.

### 2. PDF- und QR-Rendering zentralisieren

Nutzen: weniger doppelte Logik, konsistentere Vorschau und finale Flyer-PDFs.

Risiko: mittel, weil Rendering fachlich sensibel ist. Tests und manuelle Sichtpruefung sind wichtig.

Vorschlag:
- Gemeinsame Server-Utility fuer QR-Placement, Koordinatenumrechnung und PDF-Ausgabe schaffen.
- Print-Preview und finale Flyer-Generierung dieselben Hilfsfunktionen nutzen lassen.
- PDF-Metadaten-Parsing ebenfalls zentralisieren oder klar zwischen Client-Vorschau und Server-Validierung trennen.

### 3. Flyer-Generierung robuster machen

Nutzen: weniger inkonsistente Zustaende bei Fehlern, bessere Debugbarkeit.

Risiko: mittel, weil der Ablauf mehrere Systeme beruehrt: DB, QR, PDF, Dateisystem.

Vorschlag:
- Explizite Status- oder Fehlerbehandlung fuer generierte Flyer einfuehren.
- Bei Fehlern nach DB-Anlage entweder sauber aufraeumen oder einen klaren Fehlerstatus speichern.
- Storage-Schreibvorgaenge und DB-Updates bewusst als zweiphasigen Ablauf behandeln.

### 4. Aktivierungsmodell absichern

Nutzen: fachliche Regeln werden verlaesslicher und weniger an UI-/Server-Action-Pfade gekoppelt.

Risiko: niedrig bis mittel, abhaengig davon, ob bestehende Testdaten mehrere Aktivierungen pro Flyer enthalten.

Vorschlag:
- Entscheiden, ob pro Flyer exakt eine Aktivierung erlaubt ist.
- Falls ja: Datenbankseitig absichern, z. B. mit eindeutigem Bezug pro Flyer in `Activation`.
- Existing-Testdaten vor einer Migration pruefen.

### 5. Storage-Cleanup fuer Deletes ergaenzen

Nutzen: lokale Entwicklungsdaten bleiben kleiner, weniger Datei-Leichen.

Risiko: niedrig, solange Pfadpruefungen strikt bleiben.

Vorschlag:
- Beim Loeschen von Flyern generierte PDFs entfernen.
- Beim Loeschen von Campaigns zugehoerige Template- und Flyer-Dateien entfernen.
- Path-Traversal-Schutz in Storage-Helpern weiterhin strikt halten.

## Priorisierte Roadmap

### Sofort sinnvoll

1. `TemplateUploadForm` in kleinere Komponenten und Hooks aufteilen.
2. QR-/PDF-Placement-Logik zwischen Preview und finaler Flyer-Erzeugung vereinheitlichen.
3. Flyer-Generierung gegen Teilausfaelle absichern.
4. Aktivierungsregel klar definieren und in Code plus Datenmodell stabilisieren.

### Bald sinnvoll

1. Storage-Cleanup fuer Flyer- und Campaign-Deletes ergaenzen.
2. `trackingUrl`-Strategie pruefen: gespeichert lassen, dynamisch berechnen oder Base-URL-Historie einfuehren.
3. Feature-spezifisches CSS aus `globals.css` herausloesen oder klarer strukturieren.
4. Analytics-Service fachlich etwas staerker kapseln, bevor weitere Auswertungen dazukommen.

### Spaeter optional

1. Hintergrundjobs fuer PDF-Generierung einfuehren, falls Generierung langsamer oder umfangreicher wird.
2. Rollen, Auth und Multi-Workspace-Sicherheit ausbauen, sobald Demo-/Admin-Nutzung produktionsnaeher wird.
3. Analytics auf vorberechnete Kennzahlen oder Reporting-Tabellen umstellen, falls Scan-Volumen steigt.
4. Storage-Abstraktion fuer lokale Dateien, S3 oder andere Backends erweitern.

## Top-Empfehlungen

Die folgenden Aenderungen bringen den groessten Nutzen, ohne die funktionierende App unnoetig zu gefaehrden:

1. `TemplateUploadForm` zerlegen, weil sie aktuell der groesste Wartbarkeitshotspot ist.
2. PDF-/QR-Rendering zentralisieren, damit Vorschau und finaler Druck konsistent bleiben.
3. Flyer-Generierung robuster machen, damit keine halbfertigen Flyer-Zustaende entstehen.
4. Aktivierung datenbankseitig absichern, damit die zentrale Fachregel nicht nur von UI-Logik abhaengt.
5. Delete-Flows um Datei-Cleanup ergaenzen, damit lokale Tests und spaetere Nutzung nicht unbemerkt Datenmuell erzeugen.
