# SalesCrew DSGVO Operations Runbook

Stand: 2026-08-28<br>
Geltung: SalesCrew Nespresso App, Produktion<br>
Bezug: [DSGVO_AUSTRIA_LIVING.md](./DSGVO_AUSTRIA_LIVING.md)

Dieses Runbook beschreibt den technischen Ablauf. Rechtsgrundlagen,
Aufbewahrungsfristen, DSFA, Betriebsvereinbarung und Entscheidungen ueber
Loeschung oder Einschraenkung muessen durch die verantwortliche Stelle
freigegeben werden.

## 1. Rollen und Vier-Augen-Prinzip

- Fallverantwortlich: nimmt Betroffenenanfragen an, prueft Identitaet und
  dokumentiert die Entscheidung.
- Technisch ausfuehrend: erstellt Export, setzt Legal Holds und fuehrt nach
  Freigabe technische Massnahmen aus.
- Freigebend: bestaetigt Loeschung, Ablehnung, Fristverlaengerung und die
  Aufhebung eines Legal Holds.
- Datenschutz-/Incident-Verantwortung: bewertet Risiken und entscheidet ueber
  Meldungen an DSB, Betroffene und Aufsichtsbehoerde.
- Kritische Entscheidungen werden nie von derselben Person beantragt und
  freigegeben.

## 2. Betroffenenanfragen

1. Anfrage in der App unter `Datenschutz` erfassen; Eingangsdatum und Typ
   werden unveraenderlich protokolliert.
2. Identitaet mit dem mildesten ausreichenden Mittel pruefen. Keine neue
   Ausweiskopie speichern, wenn Konto-, Rueckruf- oder bestehende
   Onboardingdaten ausreichen.
3. Umfang, Datenquellen, Empfaenger, Rechtsgrundlagen, Fristen und moegliche
   Rechte Dritter pruefen. Monatsfrist ab Eingang kalendergenau notieren.
4. Bei komplexen/zahlreichen Anfragen eine gesetzlich zulaessige Verlaengerung
   vor Ablauf begruenden und der betroffenen Person rechtzeitig mitteilen.
5. Export erst nach dokumentierter Identitaetspruefung erzeugen. Der Export
   enthaelt keine Klartextpasswoerter und keine Daten anderer Personen, soweit
   sie nicht rechtmaessig offengelegt werden duerfen.
6. Export ueber einen authentisierten, zeitlich begrenzten Kanal zustellen;
   Download und Adminzugriff werden im Data-Access-Audit erfasst.
7. Berichtigung direkt an der fachlich fuehrenden Quelle vornehmen. Bei
   Einschraenkung, Widerspruch oder Loeschung zuerst Rechtsgrundlage,
   Aufbewahrung, Drittrechte und Legal Holds pruefen.
8. Fall erst nach dokumentierter Entscheidung und Mitteilung abschliessen.

Die App automatisiert bewusst keine Profil- oder Einsatzloeschung aus einer
Anfrage. Dadurch kann eine ungepruefte Anfrage keine Produktionsdaten
vernichten.

## 3. Legal Holds

- Zulaessige Scopes: global, betroffene Person oder definierte Datenklasse.
- Grund, Fall-/Verfahrensreferenz, verantwortliche Person und geplantes
  Pruefdatum dokumentieren.
- Vor jeder Loeschung den aktiven Hold pruefen. Ein Hold stoppt Loeschung,
  erweitert aber keine Zugriffsrechte.
- Aufhebung nur nach dokumentierter Freigabe; Aufhebung und Ersteller bleiben
  im Audit erhalten.

## 4. Aufbewahrung

- `get_retention_preview()` ist read-only und liefert nur Mengen fuer die
  vorgeschlagenen Fristen.
- Ausser Eddie werden keine Bestandsdaten automatisch geloescht, bevor Matrix,
  Rechtsgrundlage und Vier-Augen-Freigabe abgeschlossen sind.
- Eddie-Nachrichten werden nach 15 Minuten per Datenbank-Cron hard-geloescht,
  sofern kein einschlaegiger Legal Hold aktiv ist.
- Spaetere Loeschjobs muessen idempotent, in kleinen Batches, hold-aware und
  mit Anzahl sowie Lauf-ID protokolliert sein. Vor Aktivierung ist ein
  dokumentierter Dry Run erforderlich.
- Backups und Wiederherstellungsfenster sind in die Fristbewertung
  einzubeziehen; geloeschte Daten duerfen nicht still in den Livebetrieb
  zurueckgespielt werden.

## 5. Datenschutzvorfall

1. Vorfallzeit, Entdeckungszeit, Systeme und erste Fakten sichern. Keine
   sensiblen Inhalte in Tickets oder ungeschuetzte Chats kopieren.
2. Zugriff eindämmen: Token/Keys rotieren, betroffene Konten sperren,
   Fehlkonfiguration schliessen. Beweise und Auditdaten erhalten.
3. Kategorien, Umfang, betroffene Personen, Folgen und Gegenmassnahmen
   bewerten. Entscheidungen und Unsicherheiten fortlaufend protokollieren.
4. Datenschutzverantwortung sofort einbeziehen. Bei meldepflichtigem Risiko
   Meldung an die Datenschutzbehoerde moeglichst binnen 72 Stunden ab
   Kenntniserlangung; bei hohem Risiko Betroffene unverzueglich informieren.
5. Auch die begruendete Entscheidung gegen eine Meldung dokumentieren.
6. Nachbereitung: Ursache, Timeline, Korrektur, Wirksamkeitspruefung und
   Verbesserungen im Verzeichnis festhalten.

DSB-Kontakt: `dsb@dsb.gv.at`, Barichgasse 40-42, 1030 Wien. Der konkrete
interne Incident- und Datenschutzkontakt ist organisatorisch noch einzutragen.

## 6. Produktionsrollout dieser Haertung

Die Reihenfolge ist zwingend, weil bestehender Code permanente Foto-URLs
erwartet und der neue Code private Einsatzfotos per Signed URL ausliefert:

1. Commit gegen den aktuellen Stand von `origin/master` pruefen und pushen.
2. Vercel-/Railway-Deployment nur ueber Deployment-Metadaten auf Erfolg
   pruefen. Keine produktiven Daten-Smoke-Tests ausfuehren.
3. Erst nach aktivem Code-Deployment die einzelne Supabase-Migration
   `20260828123318_harden_dsgvo_access_boundaries.sql` anwenden.
4. Danach ausschliesslich Metadaten pruefen: Migrationseintrag, RLS-Flags,
   Grants/Policies, Bucket-Privacy, Funktionen und Cron-Definition.
5. Bei Codefehlern vor der Migration Deployment zurueckrollen. Nach der
   Migration keinen destruktiven Rollback ausfuehren; per Forward Fix beheben,
   damit keine Daten oder Auditeintraege verloren gehen.

Die Migration loescht keine bestehenden operativen Einsatz-, Profil-,
Dokument- oder Fotodaten. Sie aktiviert lediglich den dokumentierten
15-Minuten-Cron fuer Eddie-Inhalte.

Rollout-Stand 2026-08-28: Code-Deployment und Migration wurden in dieser
Reihenfolge produktiv aktiviert und ausschliesslich ueber Metadaten geprueft.
Der Supabase-Advisor-Hinweis fuer die ungenutzte exponierte
`is_user_admin`-Hilfsfunktion wurde mit einer separaten Forward-Fix-Migration
behoben.

## 7. Betriebsgeheimnisse und Provider

- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CRON_SECRET` und Kartenkeys
  nur als geschuetzte Umgebungsvariablen, nie im Browser, Repo oder Log.
- `GOOGLE_MAPS_API_KEY` ist ausschliesslich serverseitig und auf Geocoding zu
  begrenzen. `GOOGLE_MAPS_BROWSER_API_KEY` ist separat, referrer-beschraenkt
  und nur fuer die Admin-Karte bestimmt.
- `ALLOWED_ORIGIN`/`APP_ORIGIN` muessen die reale Web-App begrenzen; Socket.IO
  akzeptiert keine beliebigen Origins mehr.
- OpenAI erst nach dokumentiertem AVV/DPA-, Transfer-, Region- und
  Datenkontrollen-Check produktiv fuer personenbezogene Inhalte freigeben.
- Quartalsweise Provider, Unterauftragsverarbeiter, Regionen, Keys und nicht
  mehr benoetigte Zugriffe pruefen.

## 8. Access Review

- Monatlich Adminrollen, Service-Accounts und ausgeschiedene Nutzer pruefen.
- Quartalsweise RLS, Tabellen-/Funktions-Grants, Storage-Policies und
  Data-Access-Audit stichprobenartig kontrollieren.
- Adminzugriff auf Dokumente, Vertraege, Klartext-Zugangsdaten,
  Standortdetails und DSAR-Exporte besonders pruefen.
- Keine Rollenautorisierung aus aenderbaren JWT-`user_metadata` ableiten.
- Session-Revoke und Login-Sperre sind beim Offboarding sofort auszufuehren;
  fachliche Daten werden erst nach Retention-/Hold-Pruefung minimiert.

## 9. Bekannte Restrisiken

- SheetJS wird als vom Hersteller empfohlenes, repariertes
  `xlsx@0.20.3`-Tarball von `cdn.sheetjs.com` bezogen, weil das gleichnamige
  npm-Registry-Paket bei `0.18.5` stehen geblieben ist. Version, Integritaet
  und Herstellerquelle sind bei Dependency-Updates erneut zu pruefen.
- `@supabase/ssr@0.4.1`: zwei Low-Advisories ueber `cookie@0.6.0`. Cookie-Namen
  werden nicht aus Nutzereingaben erzeugt. Das Major-Upgrade auf die aktuelle
  SSR-/Supabase-JS-Kombination wird separat mit Login-, Refresh- und
  Recovery-Regressionstests durchgefuehrt.
- Profilbilder und einige Legacy-Medien bleiben oeffentlich, bis Call-Sites,
  Alt-URLs und Migration separat vollstaendig erfasst sind.
- Vor dem Release erzeugte Chat-Signed-URLs koennen bis zu ihrem bestehenden
  Ablaufzeitpunkt extern gueltig bleiben. Die App gibt sie nicht mehr aus und
  normalisiert gespeicherte Referenzen beim Lesen auf den authentisierten
  60-Sekunden-Proxy.
- Klartext-Zugangsdaten im Fachprozess sind trotz strenger API-Grenzen ein
  hohes Restrisiko. Zielbild ist ein Passwortmanager/Secret Vault mit
  zeitbegrenztem Reveal und Rotation.
- Formale DSGVO-Konformitaet kann technisch nicht allein erklaert werden;
  DSFA, Betriebsrat, Rechtsgrundlagen, Fristen, AVV und Kontakte bleiben
  fachliche Freigaben.
