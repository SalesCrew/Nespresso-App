"use client";

interface DienstvertragTemplateProps {
  promotorName: string;
  promotorBirthDate: string;
  promotorAddress: string;
  hoursPerWeek: string;
  monthlyGross: string;
  startDate: string;
  endDate: string;
  isTemporary: boolean;
}

export function DienstvertragTemplate({
  promotorName,
  promotorBirthDate,
  promotorAddress,
  hoursPerWeek,
  monthlyGross,
  startDate,
  endDate,
  isTemporary
}: DienstvertragTemplateProps) {
  return (
    <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
      <h2 className="text-center text-lg font-bold text-gray-900 mb-8">DIENSTVERTRAG</h2>
      
      {/* Contract parties - Updated formatting */}
      <div className="space-y-6">
        <div>
          <p className="mb-2">Die Firma</p>
          <p className="font-semibold">Sales Crew Verkaufsförderung GmbH</p>
          <p>Wagenseilgasse 5/EG</p>
          <p>1120 Wien</p>
        </div>
        
        <div className="mt-6">
          <p>stellt die</p>
          <p>Arbeitskraft (Angestellte/Angestellter – im folgenden „Arbeitnehmer" genannt)</p>
        </div>
        
        <div className="mt-8 ml-8">
          <div className="grid grid-cols-[150px_1fr] gap-4">
            <p>Frau/Herr:</p>
            <p className="font-semibold">{promotorName || "Keine Daten gefunden"}</p>

            <p>geboren am:</p>
            <p className="font-semibold">{promotorBirthDate || "Keine Daten gefunden"}</p>

            <p>wohnhaft in:</p>
            <p className="font-semibold">{promotorAddress || "Keine Daten gefunden"}</p>
          </div>
        </div>
        
        <p className="mt-6">zu folgenden Bedingungen ein:</p>
      </div>
      
      {/* Section 1 */}
      <div className="space-y-3">
        <h3 className="font-bold">1. Art der Arbeitsleistung</h3>
        <p className="indent-8">Der Arbeitnehmer tritt als FachberaterIn in die Firma Sales Crew Verkaufsförderung GmbH ein.</p>
        <p>Der Arbeitnehmer ist verpflichtet, alle ihm vom Arbeitgeber aufgetragenen Tätigkeiten gewissenhaft zu verrichten. Dem Arbeitgeber bleibt die vorübergehende oder dauernde Heranziehung des Arbeitnehmers zu anderen Aufgaben ausdrücklich vorbehalten.</p>
        <p>Zu Tätigkeiten, die im Vergleich zu der grundsätzlich vereinbarten Tätigkeit des Arbeitnehmers als geringwertiger anzusehen sind, kann der Arbeitnehmer nur kurzfristig und nur soweit herangezogen werden, als betriebliche Erfordernisse des Arbeitgebers dies verlangen. Es tritt dadurch keine Kürzung des vereinbarten Entgeltes ein.</p>
      </div>
      
      {/* Section 2 */}
      <div className="space-y-3">
        <h3 className="font-bold">2. Arbeitszeit</h3>
        <p className="indent-8">Das zeitliche Ausmaß der Arbeitsverpflichtung beträgt <span className="font-semibold">{hoursPerWeek || "Keine Daten gefunden"}</span> Wochenstunden.</p>
        <p>Die Aufteilung dieser Arbeitszeit auf die einzelnen Wochentage wird zwischen dem Arbeitgeber und dem Arbeitnehmer vereinbart Der Arbeitnehmer erklärt sich ausdrücklich mit der jederzeitigen Änderung der vereinbarten Arbeitszeiteinteilung durch den Arbeitgeber unter Beachtung der arbeitszeitrechtlichen Grenzen und Beschränkungen des § 19 c Abs. 2 und 3 AZG (bei Teilzeitarbeit § 19 d AZG) einverstanden.</p>
        <p>Mehr- und Überstunden sind nur über ausdrückliche Anordnung des Arbeitgebers oder des Dienstgebers zu leisten. Der Arbeitnehmer erklärt sich zur Leistung von Mehr- und Überstunden auf Verlangen des Arbeitgebers bereit.</p>
        <p>Der Arbeitnehmer ist zudem verpflichtet, die geleisteten Arbeitsstunden inkl. aller Mehr- und Überstunden sowie die Fehl- und Zeitausgleichstunden aufzuzeichnen und auf Nachfrage an den Arbeitgeber zu übermitteln. Für den Fall, dass der Arbeitnehmer gar keine Zeitbestätigungen oder unkorrekte oder unvollständige Zeitbestätigungen abgibt, wird daher bereits vorab festgehalten, dass der Arbeitgeber nicht zur Bezahlung der davon betroffenen Zeiten verpflichtet ist.</p>
      </div>

      {/* Section 3 */}
      <div className="space-y-3">
        <h3 className="font-bold">3. Einstufung und Entgelt</h3>
        <p>Die Einstufung des Arbeitnehmers erfolgt nach den Bestimmungen des Kollektivvertrages für Angestellte in Werbung und Marktkommunikation Wien in die Verwendungsgruppe II.</p>
        <p>Der Arbeitnehmer bestätigt ausdrücklich, dass er vom Arbeitgeber ausdrücklich aufgefordert wurde, allfällige Vordienstzeiten (Verwendungsgruppenjahre) bekannt zu geben bzw. nachzuweisen sowie allfällige Ausbildungsnachweise vorzulegen. Der Arbeitnehmer erklärt, dass er auf Basis der von ihm dem Arbeitgeber mitgeteilten Informationen richtig eingestuft ist.</p>
        <p>Das Gehalt beträgt Brutto <span className="font-semibold">{monthlyGross ? `€ ${monthlyGross},--` : "Keine Daten gefunden"}</span> pro Kalendermonat.</p>
        <p>Die Abrechnung und Auszahlung des Gehalts erfolgt jeweils zum 30. des aktuellen Monats. Die Zahlung allfälliger variabler Entgeltbestandteile einschließlich Verkaufsprovision erfolgt mit der Abrechnung des Folgemonats.</p>
        <p>Sonderzahlungen gebühren nach Maßgabe des Kollektivvertrages für Angestellte in Werbung und Marktkommunikation. Die Auszahlung der Weihnachtsremuneration und des Urlaubsgeldes erfolgt halbjährlich.</p>
        <p>Bei unterjährigem Eintritt und/oder Austritt des Arbeitnehmers gebühren die Sonderzahlungen gemäß den kollektivvertraglichen Bestimmungen bloß zeitanteilig; anteilsmäßig zu viel ausbezahlte Sonderzahlungen können vom Arbeitgeber zurückverrechnet bzw. zurückgefordert werden.</p>
        <p>Für den Fall, dass dem Arbeitnehmer künftig im Rahmen dieses Dienstverhältnisses allfällige sonstige Leistungen gewährt werden, wie beispielsweise Überzahlungen gesetzlicher oder kollektivvertraglicher Ansprüche, Sachbezüge, Prämien, Zulagen, Gratifikationen, etc. wird bereits jetzt festgehalten, dass derartige Leistungen absolut freiwillig erfolgen. Sie begründen keinen rechtlichen Anspruch des Arbeitnehmers, weder dem Grunde nach der Höhe nach, weder für die Vergangenheit noch für die Zukunft und führen auch für den Fall der wiederholten Leistung ohne ausdrückliche Wiederholung dieses Freiwilligkeitsvorbehaltes zu keinem Anspruch des Arbeitnehmers. In jedem Fall sind derartige Leistungen jederzeit durch den Arbeitgeber einseitig widerrufbar.</p>
        <p>Der Arbeitnehmer darf Entgeltansprüche oder sonstige gegenüber dem Arbeitgeber bestehende Ansprüche ohne die vorherige schriftliche Zustimmung des Arbeitgebers nicht abtreten. Jede entgegen diesem Verbot erfolgende Abtretung ist unabhängig davon, ob es sich um eine Sicherungszession oder eine Vollzession handelt, unzulässig und für den Arbeitgeber daher nicht verbindlich.</p>
        <p>Der Arbeitnehmer ist verpflichtet, dem Arbeitgeber bei Dienstantritt ein Konto bei einer inländischen Kreditunternehmung bekannt zu geben, auf das der Arbeitgeber alle mit diesem Dienstvertrag in Zusammenhang stehenden Zahlungen mit schuldbefreiender Wirkung überweisen kann.</p>
      </div>

      {/* Section 4 */}
      <div className="space-y-3">
        <h3 className="font-bold">4. Vertragsdauer/Beendigung</h3>
        <p className="pdf-break-after">Das Dienstverhältnis beginnt am <span className="font-semibold">{startDate || "Keine Daten gefunden"}</span>. {isTemporary ? `Das Dienstverhältnis ist bis zum ${endDate || "Keine Daten gefunden"} befristet; wird es auch darüber hinaus fortgesetzt, geht es in ein unbefristetes über.` : 'Das Dienstverhältnis wird auf unbestimmte Zeit abgeschlossen.'}</p>
        <p>Der Arbeitnehmer kann das Dienstverhältnis unter Einhaltung einer einmonatigen Kündigungsfrist jeweils zum Letzten jeden Monats aufkündigen. Der Arbeitgeber kann das Dienstverhältnis unter Einhaltung der gesetzlichen Kündigungsfrist gemäß § 20 Abs 3 Angestelltengesetz jeweils zum Fünfzehnten oder Monatsletzten beenden.</p>
        <p>Während der gesetzlichen Kündigungsfrist ist nach Möglichkeit ein allenfalls vorhandener Resturlaub sowie ein allenfalls vorhandenes Zeitguthaben zu konsumieren</p>
      </div>

      {/* Section 5 */}
      <div className="space-y-3">
        <h3 className="font-bold">5. Urlaubsanspruch</h3>
        <p>Das Ausmaß des jährlichen Erholungsurlaubes richtet sich nach den Bestimmungen des Urlaubsgesetzes. Der Zeitpunkt und die Dauer des Urlaubes sind mit dem Arbeitgeber rechtzeitig schriftlich zu vereinbaren. Beide Vertragsteile streben einen periodenkonformen (dh. im Urlaubsjahr des Entstehens des jeweiligen Urlaubs) erfolgenden Urlaubsverbrauch an.</p>
        <p>Es gilt als vereinbart, dass im Zeitraum Oktober bis Dezember und April bis Mai aufgrund der in dieser Phase extrem hohen Auftragsdichte Urlaube nur in besonders berücksichtigungswürdigen Ausnahmefällen und mit Genehmigung der Geschäftsleitung möglich sind. Wir ersuchen Sie, dies bei der Planung Ihrer Urlaubswünsche entsprechend zu berücksichtigen.</p>
        <p>Im Falle einer Teilzeitbeschäftigung wird der gesetzliche Urlaubsanspruch wertneutral, dh. entsprechend dem Ausmaß der Teilzeitbeschäftigung, umgerechnet. Eine derartige Umrechnung des Urlaubsanspruchs erfolgt im Falle eines Wechsels zwischen Vollzeit und Teilzeit (oder umgekehrt) auch für den vor dem Wechsel entstandenen und noch nicht verbrauchten Alturlaub. Gleiches gilt im Falle einer Änderung des Teilzeitausmaßes.</p>
      </div>

      {/* Section 6 */}
      <div className="space-y-3">
        <h3 className="font-bold">6. Dienstverhinderung</h3>
        <p>Bei Krankheit oder Unglücksfall oder im Fall einer sonstigen Dienstverhinderung aus einem wichtigen, die Person des Arbeitnehmers betreffenden Grund, hat der Arbeitnehmer den Arbeitgeber sofort am 1. Tag der Dienstverhinderung oder wenn möglich noch vor Eintritt der Verhinderung zu verständigen. Ist der Arbeitnehmer durch Krankheit an der Erbringung seiner Dienste gehindert, hat er dem Arbeitgeber ab dem 1. Tag der Dienstverhinderung eine Bestätigung des Arztes oder der Gebietskrankenkasse vorzulegen. Nur in jenen Fällen, in denen die Beibringung der Bestätigung eines österreichischen Arztes nicht möglich ist, wird ausnahmsweise eine ausländische Arztbestätigung (inkl. beglaubigter Übersetzung) akzeptiert.</p>
        <p>Kommt der Arbeitnehmer der Pflicht zur unverzüglichen Verständigung von einer Dienstverhinderung nicht nach und/oder legt er die geforderte Bestätigung über die Dienstverhinderung nicht (rechtzeitig) vor, verliert er für die Dauer der Säumnis den Anspruch auf Entgelt. Bei längerer Dienstverhinderung kann der Arbeitgeber nach angemessener Zeit erneut die Vorlage einer Bestätigung verlangen.</p>
      </div>

      {/* Section 7 */}
      <div className="space-y-3">
        <h3 className="font-bold">7. Verschwiegenheitspflicht</h3>
        <p>Der Arbeitnehmer ist zur Wahrung von Betriebs- und Geschäftsgeheimnissen des Arbeitgebers und der Auftraggeber gegenüber jedermann und zu jeder Zeit, somit sowohl bei aufrechtem Dienstverhältnis als auch nach dem Ende des Dienstverhältnisses verpflichtet.</p>
        <p>Inhalte dieses Vertrages, insbesondere das Gehalt unterliegen strenger Geheimhaltung. Die Nichteinhaltung dieser Bestimmung stellt einen wichtigen Grund für die Auflösung des Dienstverhältnisses (Entlassung) gemäß § 27 AngG dar.</p>
      </div>

      {/* Section 8 */}
      <div className="space-y-3">
        <h3 className="font-bold">8. Konkurrenzklausel</h3>
        <p>Für die Dauer des Angestelltenverhältnisses verpflichtet sich der/die DienstnehmerIn vor einer</p>
        <ul className="list-disc list-inside ml-4">
          <li>allfälligen Aufnahme einer Tätigkeit bei einem direkten Mitbewerber des Kunden</li>
          <li>einer direkten oder indirekten Beteiligung an einem Wirtschaftsunternehmen welche im direkten Mitbewerb zum Kunden steht</li>
          <li>einer selbständigen Tätigkeit welche im direkten Mitbewerb zum Kunden steht oder einer beratenden Funktion eine schriftliche Genehmigung bei seinem Vorgesetzten der Sales Crew Verkaufsförderung GmbH einzuholen.</li>
        </ul>
        <p>Mündliche Genehmigungen werden als nicht gültig anerkannt. Ein Verstoß gegen Punkt 8 lässt auf eine Vertrauensunwürdigkeit des Dienstnehmers schließen, welche einen Entlassungsgrund darstellt.</p>
      </div>

      {/* Section 9 */}
      <div className="space-y-3">
        <h3 className="font-bold">9. Meldepflichten und sonstige Pflichten</h3>
        <p>Der Arbeitnehmer hat dem Arbeitgeber jede beabsichtigte Aufnahme einer anderen Beschäftigung oder sonstigen Erwerbstätigkeit zu melden. Die Aufnahme einer anderen Beschäftigung oder sonstigen Erwerbstätigkeit setzt die Zustimmung des Arbeitgebers voraus.</p>
        <p>Der Arbeitnehmer ist verpflichtet, alle Änderungen seiner Personalien (Name, Adresse, Familienstand, Zahl der Kinder etc) und seiner Wohn- bzw Zustelladresse dem Arbeitgeber ehestmöglich bekannt zu geben.</p>
      </div>

      {/* Section 10 */}
      <div className="space-y-3">
        <h3 className="font-bold">10. Konventionalstrafe</h3>
        <p className="indent-8">Der Arbeitnehmer und der Arbeitgeber vereinbaren einvernehmlich für den Fall einer vom Arbeitnehmer verschuldeten fristlosen Entlassung, eines unberechtigten vorzeitigen Austritts oder einer frist-/terminwidrigen Kündigung durch den Arbeitnehmer, weiters für den Fall, dass der Arbeitnehmer das Nebenbeschäftigungsverbot für Mitbewerber oder die Verschwiegenheitspflicht verletzt, einen pauschalierten, somit von der tatsächlichen Schadenshöhe unabhängigen Schadenersatz in Höhe von 3 Monatsbezügen (Monatsgehalt zuzüglich anteilige Sonderzahlungen, variable Bezüge im 3-Monatsschnitt, etwaige Sachbezüge etc).</p>
        <p>Die Vertragsstrafe wird soweit möglich von den zustehenden Geldbezügen abgezogen. Ein nicht auf diese Weise (= durch Abzug von den Geldbezügen) entrichteter Restbetrag ist binnen 14 Tagen ab Aufforderung auf das Konto des Arbeitgebers einzubezahlen.</p>
      </div>

      {/* Section 11 */}
      <div className="space-y-3">
        <h3 className="font-bold">11. Anwendbare Rechtsvorschriften</h3>
        <p>Für dieses Dienstverhältnis gelten neben den allgemeinen arbeitsrechtlichen Bestimmungen (Angestelltengesetz, Urlaubsgesetz, etc) der Kollektivvertrag für Angestellte in Werbung und Marktkommunikation Wien. Der Kollektivvertrag liegt im Büro der Sales Crew Verkaufsförderung GmbH zur Einsichtnahme auf.</p>
        <p>Es gelten weiters die Bestimmungen des BMVG.</p>
        <p>Mitarbeitervorsorgekasse: Die Abfertigungsbeiträge nach § 6 Abs. 1 BMVG werden an die Valida Plus AG, MVK Leitzahl 71300, Beitr. Nr. S970491261 weitergeleitet.</p>
      </div>

      {/* Section 12 */}
      <div className="space-y-3">
        <h3 className="font-bold">12. Bild- und Tonaufnahmen</h3>
        <p>Hiermit gibt der/die ArbeitnehmerIn die Einwilligung dazu, dass Bilder, Ton- und Videoaufnahmen oder Daten (z.B.: elektronische Datenverarbeitung) der eigenen Person in unveränderter oder geänderter Version von Sales Crew Verkaufsförderung GmbH für Werbezwecke oder Administrationszwecke verwendet und veröffentlicht werden dürfen. Hiermit bestätigt der/die DienstnehmerIn, dass alle zustehenden Ansprüche von der Sales Crew oder von Dritten, die bei der Anfertigung, Verbreitung und Veröffentlichung der Bilder oder Videos entstehen, mit dieser Einverständniserklärung abgegolten sind. Aus der Zustimmung zur Veröffentlichung leitet der/die DienstnehmerIn keine Rechte (wie z.B. das Recht auf Entgelt) ab. Die Sales Crew kann für die widerrechtliche Verbreitung der Foto- und Videoaufnahmen seitens Dritter keine Haftung übernehmen.</p>
      </div>

      {/* Section 13 */}
      <div className="space-y-3">
        <h3 className="font-bold">13. Standorttracking</h3>
        <p>In Bezug auf die Ausführung der vereinbarten Dienstleistung, erklärt sich der Arbeitnehmer hiermit einverstanden, dem Arbeitgeber bei Dienstantritt seinen Standort via Whatsapp Live Standort bekannt zu geben.</p>
        <p>Das Standort Tracking dient ausschließlich dazu, die Einsatzzeiten zu dokumentieren.</p>
        <p>Der Arbeitnehmer bestätigt, dass er über das Standort Tracking informiert wurde und dieser Maßnahme zustimmt.</p>
        <p>Es wird darauf hingewiesen, dass die erhobenen Daten ausschließlich für interne Zwecke verwendet werden und vertraulich behandelt werden.</p>
        <p>Es erfolgt keine Weitergabe an Dritte, es sei denn, dies ist gesetzlich vorgeschrieben oder wird vom Arbeitnehmer ausdrücklich genehmigt.</p>
        <p>Diese Vereinbarung über das Standort Tracking während der Arbeitszeit tritt mit der Unterzeichnung des Dienstvertrags in Kraft und bleibt während der Laufzeit des Vertrages gültig.</p>
      </div>

      {/* Section 14 */}
      <div className="space-y-3">
        <h3 className="font-bold">14. Sonstige Vereinbarungen</h3>
        <p>Der Arbeitnehmer ist über Aufforderung des Arbeitgebers zur Vorlage einer aktuellen (maximal 3 Monate alten) Strafregisterbescheinigung („Leumundszeugnis") verpflichtet. Die dafür anfallenden Kosten werden dem Arbeitnehmer vom Arbeitgeber ersetzt.</p>
        <p>Der Arbeitnehmer ist verpflichtet, sich jeweils zeitgerecht um die Verlängerung der allenfalls erforderlichen Aufenthaltstitel und Arbeitsgenehmigungen zu kümmern. Unterlässt der Arbeitnehmer schuldhaft die rechtzeitige Verlängerung der erforderlichen Aufenthaltstitel und/oder Arbeitsgenehmigungen, berechtigt dies den Arbeitgeber zur fristlosen Entlassung.</p>
        <p>Mündliche Nebenabreden wurden zum vorliegenden Dienstvertrag nicht getroffen. Änderungen und Ergänzungen dieses Dienstvertrages bedürfen zu ihrer Rechtswirksamkeit der Schriftform.</p>
        <p>Sollte sich eine Bestimmung dieses Vertrages als unwirksam, ungültig oder nicht durchsetzbar erweisen, kommen die Parteien überein, die ungültig gewordene Bestimmung durch eine wirksame und durchsetzbare zu ersetzen.</p>
        <p>Die dem wirtschaftlichen oder ideellen Gehalt weit gehend entspricht oder am nächsten kommt. Die übrigen Vertragsbestimmungen werden durch die Unwirksamkeit einzelner Bestimmungen nicht berührt.</p>
        <p>Der Arbeitnehmer erklärt mit seiner Unterschrift, dass er den gesamten Vertragsinhalt gelesen, diesen in all seinen Teilen verstanden hat und mit diesem einverstanden ist. Der Arbeitnehmer bestätigt eine Ausfertigung dieses Dienstvertrages erhalten zu haben.</p>
      </div>

      {/* Signature Section */}
      <div className="mt-12 pt-8 border-t border-gray-300">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="mb-8">________________________</div>
            <p>Sales Crew Verkaufsförderung GmbH</p>
            <p className="mt-4">Datum: ……………</p>
          </div>
          <div className="text-center">
            <div className="mb-8">________________________</div>
            <p>Arbeitnehmer</p>
            <p className="mt-4">Datum: ……………</p>
          </div>
        </div>
      </div>

      {/* Additional agreement for part-time work */}
      <div className="mt-12 pt-8 border-t border-gray-300 space-y-4">
        <p>In Ergänzung zum bestehenden Dienstvertrag wird zwischen der</p>
        <p className="font-semibold">Sales Crew Verkaufsförderung GmbH, Wagenseilgasse 5, 1120 Wien</p>
        <p>(nachstehend „Arbeitgeber/in" genannt)</p>
        <p>und <span className="font-semibold">Frau {promotorName || 'Keine Daten gefunden'}, {promotorAddress || 'Keine Daten gefunden'}</span></p>
        <h3 className="font-bold text-center">Vereinbarung über durchrechenbare Arbeitszeit (Teilzeit)</h3>
        <p>geschlossen:</p>
        
        <div className="space-y-3">
          <h4 className="font-semibold">Durchrechnungsmodell</h4>
          <p>Es wird eine regelmäßige Arbeitszeit von <span className="font-semibold">{hoursPerWeek || "Keine Daten gefunden"}</span> Stunden pro Woche vereinbart. Die Arbeitszeiteinteilung erfolgt durch Dienstplan auf Grundlage einer Arbeitszeitdurchrechnung gemäß § 19d Abs. 3b Z. 1 AZG.</p>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold">Durchrechnungszeitraum</h4>
          <p>Der Durchrechnungszeitraum, innerhalb dessen Plus- und Minusstunden gegeneinander verrechnet werden können, beträgt entsprechend den gesetzlichen Vorgaben drei Monate.</p>
          <p>Die Stichtage für den Beginn der dreimonatigen Durchrechnungszeiträume werden wie folgt festgelegt: jeweils der Beginn des Kalendervierteljahres.</p>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold">Schwankungsbreite der Arbeitszeit</h4>
          <p>Innerhalb des vorgenannten Durchrechnungszeitraumes kann die Arbeitszeit bis zu der für Vollzeitbeschäftigte im Betrieb geltenden Höchstgrenze der täglichen und wöchentlichen Normalarbeitszeitgrenze ausgedehnt werden, ohne dass Mehrarbeitszuschläge entstehen. Voraussetzung ist allerdings, dass die dienstvertragliche Soll-Arbeitszeit innerhalb des Durchrechnungszeitraumes im Durchschnitt nicht überschritten wird.</p>
          <p>Im Falle der Überschreitung der für Vollzeitbeschäftigte im Betrieb geltenden Höchstgrenzen der Normalarbeitszeit entstehen sofort Überstunden, die im selben Ausmaß (Überstundenzuschläge) abzugelten sind wie bei Vollzeitbeschäftigten.</p>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold">Zeitsaldo bei Ende des Durchrechnungszeitraumes</h4>
          <p>Ein am Ende eines Durchrechnungszeitraumes bestehendes Zeitguthaben auf dem Durchrechnungskonto wird in Form von Zeitausgleich abgegolten. Aus diesem Grund wird das Guthaben bei Ende des Durchrechnungszeitraumes zuzüglich des gesetzlichen Zuschlags von 25 % (sofern kollektivvertraglich kein anderer Zuschlag oder die Zuschlagsfreiheit vorgesehen ist) auf einem eigenen Mehrstundenkonto erfasst. Der konkrete Zeitpunkt für den Ausgleich der auf dem Mehrstundenkonto verbuchten Zeitguthaben ist einvernehmlich zwischen Arbeitgeber/in und Arbeitnehmer/in festzulegen.</p>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold">Dienstplan</h4>
          <p>Der Dienstplan wird vom/von der Arbeitgeber/in unter Berücksichtigung der kollektivvertraglichen Rahmenbedingungen erstellt. Bei der Erstellung des Dienstplans wird nach Möglichkeit auf Wünsche des/der Arbeitnehmers/in Rücksicht genommen.</p>
          <p>Der/Die Arbeitgeber/in hat dafür Sorge zu tragen, dass der Dienstplan jeweils rechtzeitig bekannt gegeben wird.</p>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold">Änderungen der Lage der Arbeitszeit</h4>
          <p>Dem/Der Arbeitgeber/in bleibt die Abänderung der Arbeitszeiteinteilung (z.B. Änderungen des Durchrechnungsmodells, Wechsel zu anderen Arbeitszeitformen etc.) ausdrücklich vorbehalten (§ 19c Abs. 2 und 3 AZG). Dies gilt insbesondere auch für eine allfällige Einteilung zu Samstags- und Sonntagsarbeiten, soweit solche rechtlich zulässig sind.</p>
        </div>
        
        {/* Second Signature Section */}
        <div className="mt-12 pt-8 border-t border-gray-300">
          <div className="mb-4">............................................................</div>
          <p className="mb-8">Ort, Datum</p>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="mb-8">............................................................</div>
              <p>Unterschrift Arbeitgeber/in</p>
            </div>
            <div className="text-center">
              <div className="mb-8">............................................................</div>
              <p>Unterschrift Arbeitnehmer/in</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 