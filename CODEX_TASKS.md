# CODEX_TASKS.md

## Zweck dieser Datei

Diese Datei zerlegt das Projekt in konkrete, umsetzbare Entwicklungstickets für Codex.

Ziel ist **nicht**, das komplette Produkt in einem Schritt zu generieren, sondern ein sauberes MVP in kleinen, testbaren Schritten aufzubauen.

Jedes Ticket sollte idealerweise:
- einen klaren Scope haben,
- in sich testbar sein,
- keine unnötigen Architekturentscheidungen vorwegnehmen,
- auf den vorherigen Tickets aufbauen.

---

# Arbeitsregeln für Codex

Bei allen Tasks gelten folgende Regeln:

1. Arbeite modular und dokumentiere Architekturentscheidungen.
2. Vermeide unnötige Komplexität im MVP.
3. Implementiere nur die Anforderungen des jeweiligen Tickets.
4. Bevorzuge gut lesbaren, wartbaren TypeScript-Code.
5. Trenne UI, Domain-Logik, Datenzugriff und Infrastruktur klar.
6. Verwende keine Mock-Architektur, die später komplett ersetzt werden muss, wenn eine einfache saubere Lösung möglich ist.
7. Schreibe Basis-Validierung und sinnvolle Fehlerbehandlung.
8. Ergänze README/Dokumentation, wenn ein Ticket neue Setup- oder Architekturdetails einführt.
9. Nutze bestehende Konventionen des Projekts konsequent weiter.
10. Führe keine Breaking Changes außerhalb des Ticket-Scopes ein.

---

# Technologischer Zielrahmen

Diese Tickets gehen von folgendem Stack aus:

- Next.js (App Router)
- TypeScript
- PostgreSQL
- Prisma
- NextAuth oder Clerk für Auth
- S3-kompatibler Storage für Dateien
- pdf-lib für PDF-Bearbeitung
- qrcode für QR-Code-Erzeugung
- shadcn/ui für Admin-Oberfläche

Falls im Projekt bereits Entscheidungen getroffen wurden, sollen diese respektiert werden.

---

# Reihenfolge der Umsetzung

## Sprint 1 – Projektfundament
Ziel: lauffähiges Grundgerüst mit Datenbank, Auth und Grundlayout

## Sprint 2 – Kampagnen und Templates
Ziel: Kampagnen anlegen, PDFs hochladen, Templates speichern

## Sprint 3 – Flyer-Generierung
Ziel: individuelle Flyer und druckfertige PDFs erzeugen

## Sprint 4 – Aktivierung und Redirect
Ziel: aufgehängte Flyer aktivieren und öffentliche Scans tracken

## Sprint 5 – Dashboard
Ziel: erste auswertbare Kennzahlen anzeigen

## Sprint 6 – Stabilisierung
Ziel: Cleanup, Fehlerbehandlung, Tests, Dokumentation

---

# Tickets

## T001 – Projekt-Grundgerüst anlegen

**Ziel**  
Ein sauberes Next.js-Projekt mit TypeScript, App Router und sinnvoller Grundstruktur anlegen.

**Aufgaben**
- Next.js-Projekt initialisieren
- TypeScript aktivieren
- ESLint/Formatierung einrichten
- sinnvolle Ordnerstruktur anlegen
- Basislayout für Admin-App anlegen
- README mit Setup-Schritten ergänzen

**Akzeptanzkriterien**
- Projekt startet lokal fehlerfrei
- `npm run dev` funktioniert
- Basislayout rendert
- Grundstruktur ist dokumentiert

---

## T002 – UI-Basis mit Design-System aufsetzen

**Ziel**  
Eine minimal saubere UI-Basis für das Admin-Interface schaffen.

**Aufgaben**
- shadcn/ui oder vergleichbares Setup integrieren
- globale Styles definieren
- Basis-Komponenten vorbereiten:
  - Button
  - Card
  - Input
  - Table
  - Dialog
  - Form-Komponenten
- einfache Admin-Navigation anlegen

**Akzeptanzkriterien**
- UI-Komponenten sind nutzbar
- Admin-Layout hat Sidebar oder Top-Navigation
- Stil ist konsistent und erweiterbar

---

## T003 – Datenbank und Prisma aufsetzen

**Ziel**  
Eine funktionierende PostgreSQL-Anbindung mit Prisma herstellen.

**Aufgaben**
- Prisma einrichten
- Datenbankverbindung konfigurieren
- erste Migration vorbereiten
- `.env.example` ergänzen
- lokales Entwickler-Setup dokumentieren

**Akzeptanzkriterien**
- Prisma Client lässt sich generieren
- Migration läuft lokal durch
- Datenbankverbindung funktioniert

---

## T004 – Prisma-Datenmodell für Kernobjekte erstellen

**Ziel**  
Das MVP-Datenmodell in Prisma definieren.

**Objekte**
- User
- Workspace
- WorkspaceMember
- Campaign
- Template
- Flyer
- Location
- Activation
- ScanEvent

**Aufgaben**
- Prisma-Schema modellieren
- Relationen sauber definieren
- sinnvolle Enums anlegen, z. B. FlyerStatus
- Timestamps und IDs konsistent definieren
- erste Migration erzeugen

**Akzeptanzkriterien**
- Prisma-Schema validiert fehlerfrei
- Relationen passen zum Datenmodell
- Migration läuft erfolgreich

---

## T005 – Authentifizierung integrieren

**Ziel**  
Login, Session und geschützte Admin-Bereiche ermöglichen.

**Aufgaben**
- Auth-System integrieren
- Login/Logout implementieren
- geschützte Routen für Admin-Bereich einrichten
- Nutzer beim ersten Login automatisch anlegen
- Standard-Workspace für neue Nutzer erzeugen

**Akzeptanzkriterien**
- Nutzer können sich anmelden
- Admin-Bereich ist geschützt
- neuer Nutzer erhält automatisch einen Workspace

---

## T006 – Workspace-Kontext und Zugriffsschutz einbauen

**Ziel**  
Sicherstellen, dass Daten sauber einem Workspace zugeordnet und gefiltert werden.

**Aufgaben**
- Workspace-Kontext im Backend etablieren
- Datenabfragen auf Workspace-Ebene absichern
- Hilfsfunktionen für aktuellen Workspace erstellen
- versehentlichen Zugriff auf fremde Daten verhindern

**Akzeptanzkriterien**
- alle relevanten Daten sind Workspace-gebunden
- kein unscoped Datenzugriff in Campaign- oder Template-Endpunkten

---

## T007 – Campaign-Domain und CRUD-Endpunkte bauen

**Ziel**  
Kampagnen im MVP anlegen, bearbeiten, auflisten und löschen können.

**Aufgaben**
- Campaign-Service oder Repository anlegen
- API- oder Server-Action-Endpoints bauen
- Validierung für Name und Ziel-URL einbauen
- Liste, Detailansicht und Formular vorbereiten

**Akzeptanzkriterien**
- Kampagnen lassen sich erstellen, anzeigen, bearbeiten und löschen
- nur Kampagnen des aktuellen Workspaces sind sichtbar
- Ziel-URL wird validiert

---

## T008 – Campaign-UI im Admin-Bereich bauen

**Ziel**  
Eine benutzbare Oberfläche für Kampagnen schaffen.

**Aufgaben**
- Kampagnenübersicht bauen
- Create/Edit-Form bauen
- Detailseite mit Grunddaten anzeigen
- Empty States und Fehlerzustände ergänzen

**Akzeptanzkriterien**
- Nutzer kann Kampagnen vollständig über die UI verwalten
- UI ist klar und ohne technische Überladung nutzbar

---

## T009 – Dateispeicher-Abstraktion einführen

**Ziel**  
Eine austauschbare Storage-Schicht für PDF-Dateien und später generierte Assets schaffen.

**Aufgaben**
- Storage-Interface definieren
- lokale Dev-Implementierung anlegen
- S3-kompatible Implementierung vorbereiten
- Upload-/Download-Helfer abstrahieren

**Akzeptanzkriterien**
- App kann Dateien über eine zentrale Storage-Schnittstelle speichern
- lokaler Entwicklungsmodus funktioniert ohne echten Cloud-Storage

---

## T010 – Template-Upload implementieren

**Ziel**  
PDF-Vorlagen zu Kampagnen hochladen und speichern können.

**Aufgaben**
- PDF-Upload-Flow bauen
- Upload validieren (Dateityp, Größe)
- Template-Datensatz anlegen
- Datei im Storage speichern
- Template mit Campaign verknüpfen

**Akzeptanzkriterien**
- PDF kann erfolgreich hochgeladen werden
- Template erscheint in der Campaign-Ansicht
- nur gültige PDFs werden akzeptiert

---

## T011 – Template-Metadaten und Seiteninformationen speichern

**Ziel**  
Die wichtigsten technischen Template-Daten speichern.

**Aufgaben**
- PDF-Seitenanzahl auslesen
- Seitengröße erfassen
- Template-Metadaten im Datenmodell speichern
- ggf. erste Vorschau-Metadaten vorbereiten

**Akzeptanzkriterien**
- Template speichert Seitenanzahl und Grundmetadaten
- diese Daten sind im Admin-Bereich sichtbar

---

## T012 – QR-Positionsmodell definieren

**Ziel**  
Ein klar definiertes Datenmodell für QR-Positionen pro Template schaffen.

**Aufgaben**
- festlegen, wie QR-Positionen gespeichert werden
- mindestens speichern:
  - pageIndex
  - x
  - y
  - width
  - height
  - optional textPosition oder labelOffset
- Koordinatensystem dokumentieren

**Akzeptanzkriterien**
- QR-Position ist eindeutig definierbar
- Datenstruktur ist erweiterbar
- technische Doku erklärt das Koordinatensystem

---

## T013 – UI zum Definieren von QR-Positionen bauen

**Ziel**  
Nutzer sollen QR-Positionen für ein Template setzen können.

**Aufgaben**
- einfache Template-Vorschau oder Platzhalteransicht bauen
- Eingabemaske für QR-Positionen erstellen
- Speichern und Laden der Positionen ermöglichen
- zunächst numerische Eingabe ausreichend; visuelles Drag-and-Drop optional später

**Akzeptanzkriterien**
- Nutzer kann QR-Positionen speichern
- Positionen sind pro Template persistent
- Koordinaten sind nachvollziehbar editierbar

---

## T014 – Shortcode-Generierung implementieren

**Ziel**  
Eindeutige Shortcodes für Flyer erzeugen.

**Aufgaben**
- Shortcode-Strategie festlegen
- Kollisionen absichern
- Helferfunktion zur Code-Generierung schreiben
- Tests oder Sicherheitschecks ergänzen

**Akzeptanzkriterien**
- erzeugte Shortcodes sind eindeutig
- Kollisionen werden abgefangen
- Codes sind URL-tauglich

---

## T015 – Flyer-Domain und Generierungslogik aufbauen

**Ziel**  
Aus einer Campaign und einem Template individuelle Flyer-Datensätze erzeugen.

**Aufgaben**
- Service für Flyer-Generierung schreiben
- definierte Anzahl Flyer erzeugen
- Shortcodes zuweisen
- Status initial auf `generated` setzen
- Flyer der Campaign und dem Template zuordnen

**Akzeptanzkriterien**
- Nutzer kann N Flyer für eine Campaign generieren
- jeder Flyer hat einen eindeutigen Shortcode
- Datensätze werden korrekt gespeichert

---

## T016 – QR-Code-Erzeugung als Infrastrukturmodul bauen

**Ziel**  
Für jeden Flyer einen QR-Code aus seinem Tracking-Link generieren.

**Aufgaben**
- QR-Code-Service anlegen
- Tracking-URL aus Shortcode erzeugen
- PNG oder SVG generieren
- Dateiausgabe oder In-Memory-Weitergabe definieren

**Akzeptanzkriterien**
- aus jedem Flyer kann ein gültiger QR-Code erzeugt werden
- Tracking-Link ist korrekt aufgebaut

---

## T017 – PDF-Einbettung von QR-Codes implementieren

**Ziel**  
QR-Code und optional Kurz-ID in PDF-Templates einfügen.

**Aufgaben**
- PDF mit `pdf-lib` laden
- QR-Code an definierter Position platzieren
- optional Shortcode als Text unter/nahe dem QR-Code einfügen
- Resultat als neue PDF-Datei exportieren

**Akzeptanzkriterien**
- generierte PDF enthält korrekt eingebetteten QR-Code
- QR sitzt an der gespeicherten Position
- PDF bleibt druckbar

---

## T018 – Einzelne personalisierte Flyer-PDFs generieren

**Ziel**  
Für jeden Flyer eine individuelle PDF-Datei erzeugen.

**Aufgaben**
- Pipeline von Flyer → QR → PDF implementieren
- generierte Datei im Storage speichern
- Datei mit Flyer-Datensatz verknüpfen

**Akzeptanzkriterien**
- jeder generierte Flyer kann eine eigene PDF-Datei erhalten
- Datei ist downloadbar und dem Flyer zugeordnet

---

## T019 – Sammel-PDF-Export für mehrere Flyer vorbereiten

**Ziel**  
Mehrere personalisierte Flyer als druckfreundlichen Export bereitstellen.

**Aufgaben**
- definieren, ob MVP zuerst ZIP oder Sammel-PDF liefert
- einfache Export-Strategie implementieren
- Export aus Admin-Oberfläche verfügbar machen

**Akzeptanzkriterien**
- Nutzer kann generierte Flyer gesammelt herunterladen
- Export ist druckpraktisch nutzbar

---

## T020 – Flyer-Übersicht im Admin bauen

**Ziel**  
Alle Flyer einer Kampagne sichtbar und verwaltbar machen.

**Aufgaben**
- Liste mit Status, Shortcode und Export-Link bauen
- Filter nach Status vorbereiten
- Detailansicht eines Flyers ergänzen

**Akzeptanzkriterien**
- Nutzer sieht alle Flyer einer Kampagne
- Status und Exportmöglichkeiten sind sichtbar

---

## T021 – Aktivierungs-Domain modellieren

**Ziel**  
Aktivierungen als eigenes Event sauber abbilden.

**Aufgaben**
- Activation-Logik definieren
- Regeln festlegen:
  - Flyer muss existieren
  - Flyer darf aktivierbar sein
  - Aktivierung ist explizite Admin-Aktion
- Statusübergang auf `activated` implementieren

**Akzeptanzkriterien**
- Aktivierungen werden als eigene Datensätze gespeichert
- Flyerstatus ändert sich nachvollziehbar

---

## T022 – Location-Verwaltung implementieren

**Ziel**  
Standorte für aufgehängte Flyer anlegen und auswählen können.

**Aufgaben**
- Location-CRUD oder mindestens Create/Select bauen
- Felder für MVP:
  - Name
  - optional Adresse/Freitext
  - optional Geo-Daten später vorbereiten
- Zuordnung zu Workspace sicherstellen

**Akzeptanzkriterien**
- Standorte können angelegt und ausgewählt werden
- Aktivierungen können einem Standort zugeordnet werden

---

## T023 – Admin-Aktivierungsflow bauen

**Ziel**  
Einen generierten Flyer nach dem Aufhängen administrativ aktivieren können.

**Aufgaben**
- Aktivierungsseite oder Dialog bauen
- Shortcode manuell eingeben oder per URL öffnen
- Standort auswählen oder neu anlegen
- Aktivierung speichern

**Akzeptanzkriterien**
- Admin kann einen Flyer explizit aktivieren
- Standort wird mitgespeichert
- Aktivierung ist vom öffentlichen Scan getrennt

---

## T024 – Redirect-Endpunkt `/r/[shortcode]` implementieren

**Ziel**  
Öffentliche Scans korrekt erfassen und weiterleiten.

**Aufgaben**
- Route `/r/[shortcode]` bauen
- Flyer anhand des Shortcodes laden
- Ziel-URL der zugehörigen Campaign bestimmen
- Redirect ausführen

**Akzeptanzkriterien**
- Aufruf eines gültigen Shortcodes leitet korrekt weiter
- ungültige Codes liefern sinnvolle Fehlerseite oder Status

---

## T025 – ScanEvent-Logging beim Redirect einbauen

**Ziel**  
Jeden öffentlichen Scan als Event speichern.

**Aufgaben**
- ScanEvent beim Redirect erzeugen
- Basisdaten speichern:
  - flyerId
  - campaignId
  - timestamp
  - request metadata im MVP sparsam
- Logging robust gestalten, ohne Redirect unnötig zu blockieren

**Akzeptanzkriterien**
- gültiger Scan erzeugt ScanEvent
- Weiterleitung funktioniert weiterhin zuverlässig

---

## T026 – Einfache Unique-Scan-Strategie ergänzen

**Ziel**  
Ein erstes einfaches Konzept für Unique-Scans einbauen.

**Aufgaben**
- pragmatische MVP-Regel definieren, z. B. Zeitfenster + Cookie/Session/IP-Hash
- Implementierung datensparsam halten
- Strategie dokumentieren

**Akzeptanzkriterien**
- es gibt eine nachvollziehbare Berechnung für `unique scans`
- Umsetzung ist dokumentiert und austauschbar

---

## T027 – Dashboard-KPIs auf Campaign-Ebene bauen

**Ziel**  
Die wichtigsten Kennzahlen für eine Campaign anzeigen.

**Kennzahlen**
- Gesamtscans
- Unique Scans
- Anzahl generierter Flyer
- Anzahl aktivierter Flyer
- Top-Standort

**Aufgaben**
- Aggregationsabfragen erstellen
- Dashboard-Karten bauen
- Daten für UI formatieren

**Akzeptanzkriterien**
- Kennzahlen werden korrekt angezeigt
- nur Daten des aktuellen Workspaces und der gewählten Campaign erscheinen

---

## T028 – Scan-Auswertung pro Standort bauen

**Ziel**  
Den eigentlichen Produktmehrwert sichtbar machen: Leistung pro Standort.

**Aufgaben**
- Scans je Standort aggregieren
- Tabelle oder einfache Liste bauen
- aktivierte Flyer pro Standort anzeigen

**Akzeptanzkriterien**
- Standortbezogene Auswertung ist sichtbar
- Unterschiede zwischen Standorten sind nachvollziehbar

---

## T029 – Zeitlicher Verlauf der Scans darstellen

**Ziel**  
Einen einfachen zeitlichen Überblick über Scan-Entwicklung geben.

**Aufgaben**
- Tages- oder Wochenaggregation bauen
- einfaches Chart oder tabellarische Verlaufsausgabe implementieren

**Akzeptanzkriterien**
- Verlauf ist im Dashboard sichtbar
- Daten stimmen mit den gespeicherten ScanEvents überein

---

## T030 – Fehlerseiten und Systemzustände verbessern

**Ziel**  
Nutzerführung und Robustheit erhöhen.

**Aufgaben**
- 404/Fehlerzustände für ungültige Shortcodes
- Upload-Fehler sauber behandeln
- Formular-Fehlermeldungen verbessern
- leere Zustände in Listen ergänzen

**Akzeptanzkriterien**
- zentrale Fehlerfälle werden sauber behandelt
- UI bleibt verständlich

---

## T031 – Basis-Logging und Monitoring vorbereiten

**Ziel**  
Technische Nachvollziehbarkeit im MVP schaffen.

**Aufgaben**
- strukturiertes Server-Logging einführen
- kritische Stellen loggen:
  - Upload
  - Flyer-Generierung
  - PDF-Erzeugung
  - Redirect-Fehler
- Logging dokumentieren

**Akzeptanzkriterien**
- wichtige Systempfade sind nachvollziehbar
- Fehler lassen sich besser debuggen

---

## T032 – Seed-Daten und Demo-Daten bereitstellen

**Ziel**  
Lokale Entwicklung und manuelle Tests beschleunigen.

**Aufgaben**
- Prisma Seed anlegen
- Demo-User, Workspace, Campaign und Beispiel-Templates erzeugen

**Akzeptanzkriterien**
- lokale Testumgebung lässt sich schnell mit Beispieldaten befüllen

---

## T033 – E2E-Manuallauf dokumentieren

**Ziel**  
Den vollständigen MVP-Flow dokumentieren und testbar machen.

**Ablauf**
- Login
- Campaign anlegen
- PDF hochladen
- QR-Position setzen
- Flyer generieren
- PDF exportieren
- Flyer aktivieren
- Shortcode aufrufen
- Scan im Dashboard prüfen

**Akzeptanzkriterien**
- der vollständige End-to-End-Flow ist dokumentiert
- ein Entwickler kann den MVP manuell testen

---

## T034 – Technische Schulden und Cleanup

**Ziel**  
Vor echter Eigennutzung die Codebasis bereinigen.

**Aufgaben**
- doppelte Logik entfernen
- unklare Typen verbessern
- TODOs sichten
- Module stärker trennen, wenn nötig
- Dokumentation angleichen

**Akzeptanzkriterien**
- Codebasis ist sauber genug für reale Tests
- offensichtliche MVP-Schulden sind reduziert

---

# Optionale Tickets nach MVP

## T101 – GPS bei Aktivierung
- Standortkoordinaten beim Aktivieren erfassen

## T102 – Foto-Upload bei Aktivierung
- Nachweisfoto zum Aushang speichern

## T103 – Team-Mitglieder im Workspace
- mehrere Nutzer pro Workspace in der UI verwalten

## T104 – Erweiterte Analytics
- Conversion-Vergleiche, Standort-Rankings, Zeitfilter

## T105 – Anti-Fraud-Mechanismen
- heuristische Mehrfachscan-Erkennung

## T106 – Verteiler-/Mission-System
- Aktivierungen durch externe Verteiler mit Nachweis

## T107 – Billing / Freemium
- bezahlte Pläne und Limits

---

# Empfohlene erste Reihenfolge für echte Codex-Prompts

Wenn du direkt starten willst, dann in dieser Reihenfolge:

1. T001 – Projekt-Grundgerüst anlegen  
2. T003 – Datenbank und Prisma aufsetzen  
3. T004 – Prisma-Datenmodell für Kernobjekte erstellen  
4. T005 – Authentifizierung integrieren  
5. T006 – Workspace-Kontext und Zugriffsschutz einbauen  
6. T007 – Campaign-Domain und CRUD-Endpunkte bauen  
7. T008 – Campaign-UI im Admin-Bereich bauen  
8. T009 – Dateispeicher-Abstraktion einführen  
9. T010 – Template-Upload implementieren  
10. T012 – QR-Positionsmodell definieren  
11. T013 – UI zum Definieren von QR-Positionen bauen  
12. T014 – Shortcode-Generierung implementieren  
13. T015 – Flyer-Domain und Generierungslogik aufbauen  
14. T016 – QR-Code-Erzeugung als Infrastrukturmodul bauen  
15. T017 – PDF-Einbettung von QR-Codes implementieren  
16. T018 – Einzelne personalisierte Flyer-PDFs generieren  
17. T023 – Admin-Aktivierungsflow bauen  
18. T024 – Redirect-Endpunkt `/r/[shortcode]` implementieren  
19. T025 – ScanEvent-Logging beim Redirect einbauen  
20. T027 – Dashboard-KPIs auf Campaign-Ebene bauen

---

# Empfehlung für die praktische Arbeit mit Codex

Am besten jeweils nur **ein Ticket auf einmal** oder höchstens einen kleinen Block zusammen geben.

Gute Blöcke sind zum Beispiel:
- T001–T004
- T005–T008
- T009–T013
- T014–T019
- T021–T029

Zu jedem Ticket oder Block sollte Codex zusätzlich angewiesen werden:
- bestehende Dateien zu respektieren,
- neue Architekturentscheidungen zu dokumentieren,
- nur notwendige Dependencies hinzuzufügen,
- nach Abschluss eine kurze Änderungsübersicht auszugeben.

