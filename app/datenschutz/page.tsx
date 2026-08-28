import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenschutz | SalesCrew App",
  description: "Datenschutzinformation fuer die SalesCrew Nespresso App",
};

const sections = [
  {
    title: "Welche Daten wir verarbeiten",
    paragraphs: [
      "Je nach Rolle und Nutzung verarbeiten wir Konto- und Kontaktdaten, Bewerbungs- und Profildaten, Vertrags- und Abrechnungsdaten, Dokumentstatus und hochgeladene Dokumente, Einsatzplanung, Arbeitszeit, Abweichungsgruende, Einsatzfotos, Kommunikation, Schulungsfortschritt sowie KPI- und Bonusdaten.",
      "Beim Einsatzstart erfassen wir nach einer aktiven Standortfreigabe die aktuelle Position, Genauigkeit, Entfernung zum Markt und den Zeitpunkt. Es gibt kein Hintergrundtracking und keine laufende Wegaufzeichnung.",
    ],
  },
  {
    title: "Zwecke und Rechtsgrundlagen",
    paragraphs: [
      "Wir verwenden die Daten fuer Bewerbung und Onboarding, Durchfuehrung des Arbeits- oder Vertragsverhaeltnisses, Einsatzplanung, Arbeitszeit- und Abrechnungsnachweise, Dokumentenpruefung, operative Kommunikation, Qualitaetssicherung und IT-Sicherheit. Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 lit. b und c DSGVO sowie, nach Interessenabwaegung, lit. f. Wo eine Einwilligung erforderlich ist, wird sie getrennt, freiwillig und widerrufbar eingeholt.",
      "Empfehlungen fuer die Einsatzplanung werden innerhalb der App anhand von Verfuegbarkeit, Region, Vertragsstunden und Stammmarkt nachvollziehbar sortiert. Es erfolgt dabei keine ausschliesslich automatisierte Entscheidung mit rechtlicher oder aehnlich erheblicher Wirkung.",
    ],
  },
  {
    title: "Standort und Google Maps",
    paragraphs: [
      "Ein Einsatz kann nur innerhalb von 300 Metern um den zugeordneten Markt gestartet werden. Die Position wird erst nach Ihrer Browserfreigabe erfasst. Admins koennen Markt- und Startpunkt in der Einsatzdetailansicht pruefen.",
      "Zur Ermittlung und Darstellung der Marktposition nutzen wir Google Maps Platform. Dabei kann Google insbesondere IP-Adresse, technische Nutzungsdaten sowie Karten- und Koordinatenanfragen verarbeiten. Es gelten die Google-Datenschutzbestimmungen und die Google Maps Platform-Bedingungen.",
    ],
  },
  {
    title: "Eddie und Textverbesserung",
    paragraphs: [
      "Eddie verarbeitet Ihre Frage, den kurzen Chatverlauf sowie einen minimierten Self-Service-Kontext zu eigenen Einsaetzen, Dokumentstatus und wenigen Einsatzmerkmalen ueber die OpenAI API. Passwoerter, Bankdaten, SV-Nummer, Geburtsdatum, Privatadresse und Dokumentpfade werden Eddie nicht bereitgestellt.",
      "Eddie-Chatnachrichten werden in der App nach 15 Minuten geloescht. Die Textverbesserung steht nur Admins zur Verfuegung und uebermittelt den eingegebenen Nachrichtentext an die OpenAI API. API-Daten werden laut OpenAI standardmaessig nicht zum Modelltraining verwendet; je nach vereinbarten Datenkontrollen koennen Sicherheitsprotokolle zeitlich begrenzt verarbeitet werden.",
    ],
  },
  {
    title: "Empfaenger und Uebermittlungen",
    paragraphs: [
      "Zugriff erhalten nur Personen, die ihn fuer ihre Aufgabe benoetigen. Als technische Dienstleister kommen insbesondere Hosting-, Datenbank-, Speicher-, Karten-, E-Mail- und KI-Anbieter in Betracht. Dazu gehoeren im aktuellen System Supabase, der Hostinganbieter der App, Google Maps Platform, OpenAI und Easyname.",
      "Soweit Dienstleister Daten ausserhalb des EWR verarbeiten, verwenden wir die anwendbaren Transfermechanismen wie Angemessenheitsbeschluesse oder EU-Standardvertragsklauseln und pruefen erforderliche Zusatzmassnahmen.",
    ],
  },
  {
    title: "Speicherdauer und Sicherheit",
    paragraphs: [
      "Wir speichern personenbezogene Daten nur so lange, wie sie fuer den jeweiligen Zweck, gesetzliche Pflichten oder die Geltendmachung und Abwehr von Anspruechen erforderlich sind. Arbeitszeit- und abrechnungsrelevante Unterlagen koennen gesetzlichen Aufbewahrungsfristen unterliegen. Nicht mehr benoetigte Daten werden geloescht oder anonymisiert; rechtliche Aufbewahrungspflichten und dokumentierte Legal Holds gehen vor.",
      "Dokumente und Chat-Anhaenge liegen in privaten Speicherbereichen und werden nur ueber kurzlebige, autorisierte Links bereitgestellt. Berechtigungen werden rollen- und nutzerbezogen geprueft.",
    ],
  },
  {
    title: "Ihre Rechte",
    paragraphs: [
      "Sie haben nach den gesetzlichen Voraussetzungen Rechte auf Auskunft, Berichtigung, Loeschung, Einschraenkung, Datenuebertragbarkeit und Widerspruch. Eine Einwilligung koennen Sie jederzeit fuer die Zukunft widerrufen. Zur Ausuebung Ihrer Rechte schreiben Sie an client@salescrew.at. Zur Identitaetspruefung koennen notwendige Angaben angefordert werden.",
      "Sie koennen sich ausserdem bei der Oesterreichischen Datenschutzbehoerde beschweren: Barichgasse 40-42, 1030 Wien, dsb@dsb.gv.at, www.dsb.gv.at.",
    ],
  },
];

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="text-sm font-semibold text-gray-900">SalesCrew App</Link>
          <span className="text-xs text-gray-500">Stand 28.08.2026</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <h1 className="text-3xl font-semibold text-gray-950 sm:text-4xl">Datenschutzinformation</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
          Diese Information beschreibt die Verarbeitung personenbezogener Daten in der internen
          SalesCrew Nespresso App.
        </p>

        <section className="mt-10 border-t border-gray-200 pt-7">
          <h2 className="text-lg font-semibold">Verantwortlicher</h2>
          <address className="mt-3 not-italic leading-7 text-gray-700">
            Sales Crew Verkaufsfoerderung GmbH<br />
            Sitz: Liebermannstrasse A01/303-6, 2345 Brunn am Gebirge, Oesterreich<br />
            Betriebsstaette: Wagenseilgasse 5/EG, 1120 Wien, Oesterreich<br />
            Telefon: <a className="text-blue-700 underline" href="tel:+4316999585">+43 1 699 95 85</a><br />
            E-Mail: <a className="text-blue-700 underline" href="mailto:client@salescrew.at">client@salescrew.at</a>
          </address>
        </section>

        {sections.map((section) => (
          <section key={section.title} className="mt-8 border-t border-gray-200 pt-7">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-gray-700 sm:text-base sm:leading-7">
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        ))}

        <section className="mt-8 border-t border-gray-200 pt-7">
          <h2 className="text-lg font-semibold">Weitere Informationen</h2>
          <p className="mt-3 text-sm leading-6 text-gray-700 sm:text-base sm:leading-7">
            Die allgemeine Datenschutzerklaerung von SalesCrew finden Sie unter{" "}
            <a className="text-blue-700 underline" href="https://www.salescrew.at/datenschutz.php" target="_blank" rel="noreferrer">
              salescrew.at/datenschutz.php
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
