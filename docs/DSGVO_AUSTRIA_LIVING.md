# SalesCrew Nespresso App: DSGVO Austria Living Document

Stand: 2026-08-28<br>
Status: technische Haertung lokal umgesetzt; Produktionsrollout ausstehend<br>
Owner: Sales Crew Verkaufsfoerderung GmbH (fachliche Freigaben offen)

> Dieses Dokument ist eine technische Compliance-Arbeitsgrundlage und keine
> Rechtsberatung. Rechtsgrundlagen, konkrete Fristen, Betriebsvereinbarung,
> Auftragsverarbeiter und Betroffeneninformationen muessen durch die fachlich
> verantwortliche Stelle und gegebenenfalls oesterreichische Rechtsberatung
> freigegeben werden.

## 1. Ziel und Leitplanken

Die App plant Nespresso-Einsaetze, verwaltet Promotor:innen, Arbeitszeiten,
Standorte, Dokumente, Vertraege, Zugangsdaten, Fotos, Kommunikation, KPI- und
Entgeltdaten. Sie verarbeitet damit umfangreiche Beschaeftigtendaten und teils
besonders missbrauchsanfällige Daten.

Technische Leitplanken:

- Datenminimierung und Zweckbindung pro Workflow.
- Least Privilege in API, Datenbank, Storage und Realtime.
- Private Dateien mit kurzlebigen, autorisierten Download-Links.
- Keine produktiven Test- oder Seed-Daten und keine Smoke-Tests gegen die
  Produktionsdatenbank.
- Keine automatische Loeschung bestehender Daten, bevor Fristen, Legal Holds
  und Verantwortlichkeiten freigegeben und ein Dry-Run geprueft wurden.
- Schemaaenderungen sind additiv, wiederholbar und zuerst rueckwaertskompatibel.

## 2. Verbindliche Primaerquellen

### EU und Oesterreich

- DSGVO, insbesondere Art. 5, 6, 12-23, 25, 28, 30, 32-35 und 44 ff.:
  https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679
- Oesterreichische Datenschutzbehoerde, Pflichten Verantwortlicher:
  https://dsb.gv.at/rechte-pflichten/ihre-pflichten-als-verantwortlicher
- DSB Data-Breach-FAQ (Risikopruefung, Meldung moeglichst binnen 72 Stunden):
  https://dsb.gv.at/faqs/data-breach-verfahren
- Oesterreichische DSFA-V, insbesondere Standortdaten als Risikokriterium:
  https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20010375
- ArbVG Paragraph 96a zu automationsunterstuetzter Verarbeitung und
  Beurteilung von Arbeitnehmer:innen:
  https://ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10008329&Paragraf=96a
- OGH 6 ObA 1/22y zu Kontrollsystemen, die die Menschenwuerde beruehren:
  https://www.ris.bka.gv.at/JustizEntscheidung.wxe?Abfrage=Justiz&Dokumentnummer=JJT_20230628_OGH0002_006OBA00001_22Y0000_000&IncludeSelf=True
- TKG 2021 Paragraph 165 fuer Endgeraetezugriff/Storage:
  https://ris.bka.gv.at/eli/bgbl/i/2021/190/P165/NOR40238623
- USP Arbeitszeitaufzeichnungen (allgemein mindestens ein Jahr; Sonderregeln
  sind zu pruefen):
  https://www.usp.gv.at/themen/mitarbeiter-und-gesundheit/urlaub-und-arbeitszeit/weitere-informationen-zu-urlaub-und-arbeitszeit/arbeitszeitaufzeichnungen.html
- USP Aufbewahrung betrieblicher Unterlagen (typisch sieben Jahre fuer
  Rechnungs-/Buchhaltungsunterlagen):
  https://www.usp.gv.at/themen/steuern-finanzen/steuerliche-gewinnermittlung/weitere-informationen-zur-steuerlichen-gewinnermittlung/betriebliches-rechnungswesen/aufbewahrungspflicht.html
- EDPB Guidelines 05/2020 zu Einwilligung; im Beschaeftigungsverhaeltnis ist
  Freiwilligkeit wegen des Ungleichgewichts regelmaessig problematisch:
  https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en
- EDPB Guidelines 4/2019 zu Datenschutz durch Technikgestaltung und
  datenschutzfreundliche Voreinstellungen:
  https://www.edpb.europa.eu/documents/guideline/guidelines-42019-on-article-25-data-protection-by-design-and-by-default_en
- EDPB Guidelines 01/2022 zum Auskunftsrecht:
  https://www.edpb.europa.eu/documents/guideline/guidelines-012022-on-data-subject-rights-right-of-access_ga
- EDPB Guidelines 07/2020 zu Verantwortlichem und Auftragsverarbeiter:
  https://www.edpb.europa.eu/documents/guideline/guidelines-072020-on-the-concepts-of-controller-and-processor-in-the-gdpr_en
- EDPB Empfehlungen 01/2020 zu Drittlandtransfers und Zusatzmassnahmen:
  https://www.edpb.europa.eu/documents/recommendation/recommendations-012020-on-measures-that-supplement-transfer-tools-to_en

### Technische Dienstleister

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage Access Control:
  https://supabase.com/docs/guides/storage/security/access-control
- OpenAI API Data Controls:
  https://platform.openai.com/docs/models/default-usage-policies-by-endpoint
- OpenAI DPA (Stand 2026-01-01):
  https://openai.com/policies/data-processing-addendum/
- Google Maps Platform EEA Terms:
  https://cloud.google.com/terms/maps-platform/eea
- Google Geocoding Policies (Privacy Policy, Attribution, Storage):
  https://developers.google.com/maps/documentation/geocoding/policies

## 3. Uebernommene Muster aus Coke Spark

Der Coke-Spark-Stand wurde als Referenz gelesen, nicht blind kopiert. Relevante
Muster:

- Backend-vermittelter Datenzugriff; keine pauschalen Browser-Grants.
- RLS auf jeder exponierten Tabelle und `security_invoker` fuer Views.
- Private Foto-Buckets und kurzlebige Signed URLs.
- Identitaetsgebundene lokale Caches mit TTL und Purge bei Logout/Nutzerwechsel.
- DSAR-Fallakte mit Frist, Status, Identitaetspruefung und Exportpaket.
- Dokumentierte Aufbewahrung, Legal Holds, Incident- und Export-Governance.
- Technische Deaktivierung/Anonymisierung als kontrollierter Offboarding-Prozess.

## 4. Dateninventar SalesCrew

| Bereich | Beispiele | Hauptrisiko |
| --- | --- | --- |
| Identitaet/Bewerbung | Name, Telefon, Adresse, Geburtsdatum, SV-Nummer, Staatsbuergerschaft, Arbeitserlaubnis | Identitaetsdiebstahl, arbeitsrechtliche Folgen |
| Bank/Entgelt | IBAN, BIC, Kontoinhaber, Bonus, KPI, Vertragsstunden | Finanzmissbrauch, Profiling |
| Dokumente | Ausweis, Strafregister, Arbeitserlaubnis, Vertrag | hochsensible Dokumentinhalte |
| Einsatz/Zeit | Soll-/Ist-Zeit, Abweichungsgrund, Krankenstand, Urlaub | Beschaeftigtenkontrolle, Gesundheitsbezug |
| Standort | Markt-, Start- und Endkoordinaten, Genauigkeit, Entfernung, Zeitstempel | Bewegungs-/Kontrolldaten |
| Bilder | Profil-, Markt-, POS- und Chatbilder | biometrische/kontextuelle Identifizierbarkeit |
| Kommunikation | Direkt-/Gruppenchat, Reaktionen, Polls, Attachments, Eddie-Chat | private und arbeitsbezogene Inhalte |
| Drittsysteme | E-Mail/Benutzername und Klartextpasswoerter | Account-Uebernahme |
| KI | Matching, Textverbesserung, Eddie-Kontext | Offenlegung an Auftragsverarbeiter/Drittland |

## 5. Verifizierte technische Findings

### P0: sofort zu schliessen

- Fuenf produktive Tabellen haben RLS deaktiviert:
  `chat_conversations`, `chat_participants`, `chat_messages`,
  `freed_assignments_log`, `anmeldestatus_entries`.
- Mehrere `SECURITY DEFINER`-Funktionen sind fuer `PUBLIC`, `anon` und
  `authenticated` ausfuehrbar und mutieren Daten ohne eigene Autorisierung,
  darunter Special-Status-Freigaben, Buddy-Annahme und Message-Loeschung.
- Dokument-Routen akzeptieren fremde `user_id`-Werte und erzeugen mit der
  Service Role Listen-, Upload- oder Signed-URL-Zugriff ohne Self/Admin-Check.
- Mehrere Service-Role-Routen fuer Einsatzmutation und KI haben keine oder nur
  eine Login-Pruefung, aber keine Admin-Pruefung.
- Der Empfehlungs-Endpunkt liest breite Mitarbeiterdaten und sendet Namen,
  Telefon, Privatadresse und interne Notizen an OpenAI.
- Eddie sendet unter anderem Bankdaten, SV-Nummer, Geburtsdatum,
  Dokumentmetadaten und Klartext-Zugangspasswoerter an OpenAI.

### P1: kurzfristig

- Sieben exponierte Views laufen mit Eigentuemerechten statt
  `security_invoker`: `user_assignment_processes`, `messages_with_recipients`,
  `my_messages`, `assignment_details_with_participants`, `market_visits`,
  `assignments_with_buddy_info`, `todays_assignments`.
- RLS-Policies verwenden teils veränderbares `user_metadata` fuer Adminrechte.
- `einsatz-photos` ist ein oeffentlicher Bucket und Tracking-Zeilen speichern
  permanente Public URLs.
- Produktionslogs enthalten IDs, Namen, Nachrichten-Vorschauen, Profildaten,
  Empfehlungslisten und teilweise Upstream-Fehlerantworten.
- Eddie loescht 15-Minuten-Nachrichten nur beim naechsten Request; aufgegebene
  Chats bleiben ohne Retention-Job unbegrenzt.
- Externe Zugangspasswoerter werden im Klartext gespeichert.
- Debug-/Diagnose-Endpunkte und breite Tabellen-Grants muessen entfernt oder
  streng begrenzt werden.

### P2: Governance und UX

- Es gibt keine oeffentliche, app-spezifische Datenschutzerklaerung.
- Eine Verarbeitungsverzeichnis-/Rechtsgrundlagenmatrix ist nicht im Repo
  dokumentiert.
- Kein vollstaendiger DSAR-, Berichtigungs-, Einschraenkungs-, Widerspruchs-
  und Loeschworkflow.
- Kein freigegebener Incident-Runbook-/Breach-Register-Prozess.
- Die pauschale Einwilligungsklausel im Dienstvertrag zu Bildern, Ton, Video,
  Daten, Werbung und Veroeffentlichung braucht gesonderte rechtliche Pruefung.

## 6. Standortpruefung und Google Maps

Aktueller Workflow:

1. Browser-Geolocation wird beim Einsatzstart aktiv angefordert.
2. Die Marktadresse wird serverseitig ueber Google geocodiert.
3. Start ist nur innerhalb von 300 Metern moeglich.
4. Exakte Startkoordinaten, Genauigkeit, Entfernung und Zeit werden gespeichert
   und Admins auf einer Google-Karte angezeigt. Das Schema und die Admin-UI
   koennen auch einen Endpunkt darstellen; die Promotor-UI erfasst diesen noch
   nicht und darf bis dahin nicht als bestehende Verarbeitung beschrieben
   werden.

Bewertung:

- Wegen systematischer Beschaeftigtenkontrolle, Standortdaten, KPI-/Zeitbezug
  und moeglicher arbeitsrechtlicher Wirkung ist vor fortgesetztem Rollout eine
  DSFA sehr wahrscheinlich erforderlich.
- Betriebsrat/Zustimmung nach ArbVG und eine klare, nicht auf Einwilligung
  gestuetzte Rechtsgrundlage sind fachlich zu pruefen.
- Zweck muss auf Einsatzstart/-ende und Betrugs-/Plausibilitaetspruefung
  begrenzt sein; kein Hintergrundtracking.
- Adminzugriff wird protokolliert und auf benoetigte Rollen begrenzt.
- Exakte Koordinaten werden getrennt und kuerzer als notwendige
  Arbeitszeit-/Abrechnungsdaten aufbewahrt.
- Google Maps muss in Datenschutzerklaerung und Verarbeitungsverzeichnis stehen.
  Geocoding-Ergebnisse duerfen nur im vertraglich erlaubten Umfang gespeichert
  werden; die derzeit dauerhafte Speicherung wird rechtlich/vertraglich
  freigegeben oder durch eigene Marktreferenzkoordinaten ersetzt.

## 7. Rechtsgrundlagen-Matrix (Entwurf, Freigabe offen)

| Verarbeitung | Primaerer Ansatz | Offene Entscheidung |
| --- | --- | --- |
| Konto, Profil, Einsatzplanung | Vertrag/vorvertraglich, Art. 6(1)(b) | notwendige Felder je Rolle |
| Arbeitszeit, Payroll | rechtliche Pflicht und Vertrag, Art. 6(1)(c)/(b) | konkrete oesterr. Fristen |
| Dokumente/Arbeitserlaubnis | rechtliche Pflicht/Vertrag | Dokumenttyp und Loeschzeitpunkt |
| Chat/operative Kommunikation | Vertrag/berechtigtes Interesse | private Nutzung und Moderation |
| KPI/Bonus/Matching | Vertrag/berechtigtes Interesse | Transparenz, menschliche Entscheidung, ArbVG |
| Standort-Check | berechtigtes Interesse/Vertrag nur nach Notwendigkeitspruefung | DSFA, Betriebsrat, Alternativen |
| Marketing-/Veroeffentlichungsbilder | getrennte, freiwillige, widerrufbare Einwilligung | kein Koppeln an Arbeitsvertrag |
| KI-Text/Matching | jeweilige Ausgangsrechtsgrundlage plus Art. 28/44 ff. | EU-Region/ZDR, AVV, Transferprüfung |

## 8. Aufbewahrung (Entwurf; ausser Eddie noch nicht produktiv loeschen)

| Datenklasse | Vorgeschlagene aktive Frist | Danach |
| --- | --- | --- |
| Eddie-Chats | 15 Minuten | automatisch hard delete |
| KI-Request-Metadaten ohne Inhalt | 90 Tage | aggregieren/loeschen |
| Exporte/Signed-URL-Artefakte | maximal 30 Tage / URL 5-30 Minuten | hard delete/ablaufen |
| Standort-Rohkoordinaten | 90 Tage nach Einsatz, vorbehaltlich DSFA/Freigabe | Koordinaten loeschen, Ergebnis behalten |
| POS-Fotos | 3 Jahre nach Einsatz als Ausgangsvorschlag | loeschen, sofern kein Hold |
| Operative Einsatzdaten | 3 Jahre als Ausgangsvorschlag | anonymisieren/loeschen |
| Arbeitszeitnachweise | mindestens 1 Jahr; Payroll-/Anspruchsbedarf pruefen | rechtssicher loeschen |
| Buchhaltungs-/abrechnungsrelevante Daten | 7 Jahre, falls einschlaegig | rechtssicher loeschen |
| Bewerbungen abgelehnt/zurueckgezogen | 6 Monate als Ausgangsvorschlag | loeschen/anonymisieren |
| Offboarding-Profil | Konto sofort sperren; 30 Tage operativer Puffer | minimieren/anonymisieren |
| Sicherheits-/Admin-Auditlog | 24 Monate als Ausgangsvorschlag | loeschen/aggregieren |

Legal Holds setzen automatische Loeschung aus. Der erste Retention-Job erzeugt
nur einen Dry-Run-Bericht mit Anzahl und aeltestem/neuestem Datensatz.

## 9. Technischer Rollout

### Phase A: Zugriff und Datenminimierung

- [x] Zentrale `requireUser`, `requireAdmin`, `requireSelfOrAdmin` Guards.
- [x] Admin-Seiten und `/api/admin/*` zentral fail-closed absichern.
- [x] Dokument-/Vertrags-Routen auf Self/Admin und zulaessige Pfade begrenzen.
- [x] Schreibende Einsatz-Routen rollenbezogen absichern.
- [x] KI-Endpunkte admin-/self-gebunden machen, Input minimieren, Logs redigieren.
- [x] Debug-Endpunkte in Produktion deaktivieren.

### Phase B: Datenbank- und Storage-Grenzen

- [x] RLS fuer alle exponierten Tabellen mit migrationssicheren Policies.
- [x] Views auf `security_invoker` umstellen und Browserzugriff entziehen.
- [x] Gefaehrliche `SECURITY DEFINER`-Execute-Grants entziehen; fixe
  `search_path` und interne Helper verwenden.
- [x] `user_metadata` aus Autorisierung entfernen.
- [x] Einsatzfotos privat machen; Pfade statt permanenter Public URLs und
  autorisierte Signed-URL-Ausgabe.
- [x] Bestehende Legacy-URLs weiterhin lesbar machen, ohne Dateien zu
  verschieben oder zu loeschen.

### Phase C: Betroffenenrechte und Governance

- [x] Datenschutzerklaerung mit Controller-Kontakt, Zwecken, Rechtsgrundlagen,
  Empfaengern, Transfers, Fristen und Rechten veroeffentlichen.
- [x] DSAR-Fallakte fuer Anfrage, Identitaetspruefung, Monatsfrist, Status und
  dokumentierte Entscheidung bereitstellen.
- [x] Datenexport strukturiert, authentisiert und mit Zugriffsprotokoll.
- [ ] Berichtigung, Einschraenkung, Widerspruch und Loeschentscheidung als
  freigegebene operative Verfahren abschliessen; keine ungepruefte
  automatische Loeschung.
- [ ] Offboarding mit Session-Revoke, Login-Sperre, Aufgabenuebergabe,
  Legal-Hold-Pruefung und spaeterer Anonymisierung.
- [x] Incident-/DSAR-/Legal-Hold-Runbook dokumentieren.
- [ ] Verantwortliches Breach-Register und interne Kontakte benennen.
- [ ] Verarbeitungsverzeichnis, AVV-/Subprocessor-/Transfer-Register.
- [ ] DSFA Standort/KPI/KI und Betriebsratsfreigabe.

### Phase D: Retention und Betrieb

- [x] Retention-Entwurf pro Datenklasse und Legal-Hold-Modell.
- [x] Read-only Dry-Run-Report technisch bereitstellen.
- [ ] Fristen und Vier-Augen-Freigabe fachlich bestaetigen.
- [ ] Idempotente Batch-Jobs mit Audit und Legal Holds.
- [ ] Regelmaessige Access Reviews, MFA-/Passwortschutz und Restore-Uebungen.

## 10. Produktions-Gates

Vor jedem produktiven Schema- oder Storage-Schritt:

1. Exakte Abhaengigkeiten und aktive Call-Sites nachweisen.
2. Additive/rueckwaertskompatible Migration und Rollback-/Forward-Fix planen.
3. Build, TypeScript und statische Route-/SQL-Checks lokal ausfuehren.
4. Keine produktiven Insert-/Update-/Delete-Smoke-Tests.
5. Code zuerst pushen und das aktive Deployment ueber Metadaten bestaetigen.
6. Erst danach die Migration einzeln anwenden und nur Metadaten/Advisors lesen;
   keine fremden lokalen Aenderungen einschliessen.

## 11. Fachlich offene Pflichtangaben

- Datenschutzkontakt bzw. DSB und erreichbare E-Mail.
- Vollstaendiger Controller-/Impressumsdatensatz.
- Bestehender Betriebsrat und einschlaegige Betriebsvereinbarungen.
- Freigegebene Rechtsgrundlage je Verarbeitung.
- AVV/DPA und Subprocessor-Liste fuer Supabase, Vercel/Railway, OpenAI, Google,
  Easyname und weitere Tools.
- Google-Maps-Billing-Sitz und EEA-Vertragsvariante.
- OpenAI-Projekt: EU Data Residency, ZDR/MAM-Status und genehmigte Modelle.
- Konkrete gesetzliche/vertragliche Aufbewahrung je Dokument und KPI-Datensatz.
- Verantwortliche Personen fuer DSAR, Incident Response und Legal Holds.

## 12. Aenderungsprotokoll

- 2026-08-28: Coke-Spark-Muster, SalesCrew-Code und produktive Supabase-Metadaten
  auditiert; offizielle EU-/AT-/Provider-Quellen aktualisiert; P0-P2 und
  migrationssicherer Rollout dokumentiert.
- 2026-08-28: Zentrale Guards, RLS-/Grant-Haertung, private Einsatzfotos,
  KI-Datenminimierung, DSAR-Fallakte/Export, Legal Holds, Data-Access-Audit,
  Retention-Preview, Eddie-TTL, Datenschutzhinweise und Operations-Runbook
  umgesetzt. Dependency-Audit von 23 Findings (1 Critical) auf zwei bekannte
  Low-Risiken reduziert; SheetJS wurde auf das offizielle `0.20.3`-Tarball
  aktualisiert. Neue Chat-Anhaenge verwenden keine gespeicherten Langzeitlinks
  mehr; Abrufe laufen mit Mitgliedschaftspruefung ueber 60-Sekunden-Links und
  Legacy-Links werden bei der Ausgabe normalisiert. Produktivmigration bleibt bis zum aktiven
  Code-Deployment gesperrt.
