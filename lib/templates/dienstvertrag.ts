// Dienstvertrag HTML template with placeholders
// New version as of October 2025

interface DienstvertragData {
  promotorName: string;
  promotorBirthDate: string;
  promotorAddress: string;
  hoursPerWeek: string;
  monthlyGross: string;
  startDate: string;
  endDate: string;
  isTemporary: boolean;
}

export function generateDienstvertragHTML(data: DienstvertragData): string {
  const {
    promotorName,
    promotorBirthDate,
    promotorAddress,
    hoursPerWeek,
    monthlyGross,
    startDate,
    endDate,
    isTemporary
  } = data;

  // Generate current date for Sales Crew signature
  const today = new Date();
  const signatureDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

  // Calculate default end date (start date + 1 month) if not provided
  let displayEndDate = endDate;
  if (!endDate && startDate) {
    try {
      // Parse start date (format: DD.MM.YYYY)
      const parts = startDate.split('.');
      if (parts.length === 3) {
        const startDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        // Add 1 month
        const endDateObj = new Date(startDateObj);
        endDateObj.setMonth(endDateObj.getMonth() + 1);
        displayEndDate = `${endDateObj.getDate().toString().padStart(2, '0')}.${(endDateObj.getMonth() + 1).toString().padStart(2, '0')}.${endDateObj.getFullYear()}`;
      }
    } catch (error) {
      displayEndDate = "bis zum Ende des Probemonats";
    }
  }

  return `
    <div class="space-y-6 text-sm text-gray-700 leading-relaxed">
      <h2 class="text-center text-lg font-bold text-gray-900 mb-8">DIENSTVERTRAG</h2>
      
      <!-- Contract parties header -->
      <div class="space-y-6">
        <div>
          <p class="mb-2">Die Firma</p>
          <p class="font-semibold">Sales Crew Verkaufsförderung GmbH</p>
          <p>campus 21, Liebermannstraße A01 303-6</p>
          <p>2345 Brunn am Gebirge</p>
        </div>
        
        <div class="mt-6">
          <p>stellt die</p>
          <p>Arbeitskraft (Angestellte/Angestellter – im folgenden „Arbeitnehmer" genannt)</p>
        </div>
        
        <div class="mt-8 ml-8">
          <div class="grid grid-cols-[150px_1fr] gap-4">
            <p>Frau/Herr:</p>
            <p class="font-semibold">${promotorName || "Keine Daten gefunden"}</p>

            <p>geboren am:</p>
            <p class="font-semibold">${promotorBirthDate || "Keine Daten gefunden"}</p>

            <p>wohnhaft in:</p>
            <p class="font-semibold">${promotorAddress || "Keine Daten gefunden"}</p>
          </div>
        </div>
        
        <p class="mt-6">zu folgenden Bedingungen ein:</p>
      </div>
      
      <!-- Section 1: Art der Arbeitsleistung -->
      <div class="space-y-3">
        <h3 class="font-bold">1. Art der Arbeitsleistung</h3>
        <p class="indent-8">Der Arbeitnehmer tritt als FachberaterIn in die Firma Sales Crew Verkaufsförderung GmbH ein.</p>
        <p>Der Arbeitnehmer ist verpflichtet, alle ihm vom Arbeitgeber aufgetragenen Tätigkeiten gewissenhaft zu verrichten. Dem Arbeitgeber bleibt die vorübergehende oder dauerhafte Heranziehung des Arbeitnehmers zu anderen Aufgaben ausdrücklich vorbehalten.</p>
        <p>Zu Tätigkeiten, die im Vergleich zu der grundsätzlich vereinbarten Tätigkeit des Arbeitnehmers als geringwertiger anzusehen sind, kann der Arbeitnehmer nur kurzfristig und nur so weit herangezogen werden, als betriebliche Erfordernisse des Arbeitgebers dies verlangen. Es tritt dadurch keine Kürzung des vereinbarten Entgeltes ein.</p>
      </div>
      
      <!-- Section 2: Arbeitszeit -->
      <div class="space-y-3">
        <h3 class="font-bold">2. Arbeitszeit</h3>
        <p class="indent-8">Das zeitliche Ausmaß der Arbeitsverpflichtung beträgt <span class="font-semibold">${hoursPerWeek || "Keine Daten gefunden"}</span> Wochenstunden.</p>
        <p>Die Normalarbeitszeit liegt im Zeitraum von Montag bis Samstag, jeweils zwischen 06:00 Uhr und 20:00 Uhr („Normalarbeitszeitfenster").</p>
        <p>Arbeitsleistungen, die außerhalb dieses Zeitfensters erbracht werden, insbesondere an Sonn- und Feiertagen oder zwischen 20:00 Uhr und 06:00 Uhr gelten als zuschlagspflichtige Leistungen und werden mit einem Zuschlag von 100 % zum Normalstundenlohn abgegolten.</p>
        <p>Die Aufteilung dieser Arbeitszeit auf die einzelnen Wochentage wird zwischen dem Arbeitgeber und dem Arbeitnehmer vereinbart. Mehr- und Überstunden sind nur über ausdrückliche Anordnung des Arbeitgebers oder des Dienstgebers zu leisten. Der Arbeitnehmer erklärt sich zur Leistung von Mehr- und Überstunden auf Verlangen des Arbeitgebers bereit.</p>
        
        <h4 class="font-semibold mt-4">Durchrechnungsmodell</h4>
        <p>Es wird eine regelmäßige Arbeitszeit im oben angeführten Ausmaß pro Woche vereinbart. Die Arbeitszeiteinteilung erfolgt durch Dienstplan auf Grundlage einer Arbeitszeitdurchrechnung gemäß § 19d Abs. 3b Z. 1 AZG.</p>
        
        <h4 class="font-semibold mt-4">Zeitsaldo bei Ende des Durchrechnungszeitraumes</h4>
        <p>Zeitschulden werden nur abgezogen, wenn sie auf vom Arbeitnehmer zu vertretende Fehlzeiten zurückzuführen sind.</p>
        
        <h4 class="font-semibold mt-4">Dienstplan</h4>
        <p>Der Dienstplan wird vom Arbeitgeber erstellt. Bei der Erstellung des Dienstplans wird nach Möglichkeit auf Wünsche des Arbeitnehmers Rücksicht genommen. Der Arbeitgeber hat dafür Sorge zu tragen, dass der Dienstplan jeweils mit einem Vorlauf von mindestens 14 Tagen bekannt gegeben wird.</p>
        
        <h4 class="font-semibold mt-4">Änderungen der Lage der Arbeitszeit</h4>
        <p>Dem Arbeitgeber bleibt die Abänderung der Arbeitszeiteinteilung (z.B. Änderungen des Durchrechnungsmodells, Wechsel zu anderen Arbeitszeitformen etc.) ausdrücklich vorbehalten (§ 19c Abs. 2 und 3 AZG).</p>
        
        <p>Der Arbeitnehmer ist zudem verpflichtet, die geleisteten Arbeitsstunden sowie die Fehl- und Zeitausgleichstunden aufzuzeichnen und auf Nachfrage an den Arbeitgeber zu übermitteln. Für den Fall, dass der Arbeitnehmer gar keine Zeitbestätigungen oder unkorrekte oder unvollständige Zeitbestätigungen abgibt, wird daher bereits vorab festgehalten, dass der Arbeitgeber nicht zur Bezahlung der davon betroffenen Zeiten verpflichtet ist.</p>
        
        <h4 class="font-semibold mt-4">Zeitgutschrift bei Feiertagen, Urlaub und Dienstverhinderung</h4>
        <p>Die Arbeitszeitverteilung erfolgt flexibel und bedarfsabhängig, sodass keine fixen Wochentage als regelmäßige Arbeitstage vereinbart sind. Die tatsächlichen Einsatztage können sich je nach monatlicher Einsatzplanung und Kundenanforderung laufend ändern.</p>
        <p>Für gesetzliche Feiertage, an denen keine Arbeitsleistung erbracht wird, erfolgt eine Gutschrift im Stundenausmaß von 1/6 der vertraglich vereinbarten Wochenarbeitszeit pro betroffenen Werktag (Montag bis Samstag) im Zeitkonto. Diese Regelung stellt eine sachlich angemessene Durchschnittsbetrachtung im Sinne der Gleichbehandlung bei flexibler Arbeitseinteilung dar und dient der transparenten und einheitlichen Zeiterfassung.</p>
      </div>

      <!-- Section 3: Einstufung und Entgelt -->
      <div class="space-y-3">
        <h3 class="font-bold">3. Einstufung und Entgelt</h3>
        <p class="indent-8">Das Gehalt beträgt Brutto <span class="font-semibold">${monthlyGross ? `€ ${monthlyGross},--` : "Keine Daten gefunden"}</span> pro Kalendermonat.</p>
        <p>Die Abrechnung und Auszahlung des Gehalts erfolgt jeweils zum 30. des aktuellen Monats. Die Zahlung allfälliger variabler Entgeltbestandteile einschließlich Verkaufsprovision erfolgt mit der Abrechnung des Folgemonats.</p>
        <p>Der Arbeitnehmer erhält jährlich zwei Sonderzahlungen in Form eines Urlaubsentgelts und einer Weihnachtsremuneration. Diese betragen jeweils ein Bruttomonatsentgelt (auf Basis des vereinbarten regelmäßigen Monatslohns). Anspruch auf die Sonderzahlungen besteht nur bei aufrechtem Dienstverhältnis zum Auszahlungszeitpunkt. Bei unterjährigem Ein- oder Austritt oder Gehaltsänderungen erfolgt eine Aliquotierung entsprechend der Dauer des Dienstverhältnisses und der Höhe des Gehalts im Kalenderjahr.</p>
        <p>Die Auszahlung der Weihnachtsremuneration und des Urlaubsgeldes erfolgt halbjährlich.</p>
        <p>Anteilsmäßig zu viel ausbezahlte Sonderzahlungen können vom Arbeitgeber zurückverrechnet bzw. zurückgefordert werden.</p>
        <p>Für den Fall, dass dem Arbeitnehmer künftig im Rahmen dieses Dienstverhältnisses allfällige sonstige Leistungen gewährt werden, wie beispielsweise Überzahlungen gesetzlicher oder kollektivvertraglicher Ansprüche, Sachbezüge, Prämien, Zulagen, Gratifikationen, etc. wird bereits jetzt festgehalten, dass derartige Leistungen absolut freiwillig erfolgen. Sie begründen keinen rechtlichen Anspruch des Arbeitnehmers, weder dem Grunde nach der Höhe nach, weder für die Vergangenheit noch für die Zukunft und führen auch für den Fall der wiederholten Leistung ohne ausdrückliche Wiederholung dieses Freiwilligkeitsvorbehaltes zu keinem Anspruch des Arbeitnehmers. In jedem Fall sind derartige Leistungen jederzeit durch den Arbeitgeber einseitig widerrufbar.</p>
        <p>Der Arbeitnehmer darf Entgeltansprüche oder sonstige gegenüber dem Arbeitgeber bestehende Ansprüche ohne die vorherige schriftliche Zustimmung des Arbeitgebers nicht abtreten. Jede entgegen diesem Verbot erfolgende Abtretung ist unabhängig davon, ob es sich um eine Sicherungszession oder eine Vollzession handelt, unzulässig und für den Arbeitgeber daher nicht verbindlich.</p>
        <p>Der Arbeitnehmer ist verpflichtet, dem Arbeitgeber bei Dienstantritt ein Konto bei einer inländischen Kreditunternehmung bekannt zu geben, auf das der Arbeitgeber alle mit diesem Dienstvertrag in Zusammenhang stehenden Zahlungen mit schuldbefreiender Wirkung überweisen kann.</p>
      </div>

      <!-- Section 4: Vertragsdauer/Beendigung -->
      <div class="space-y-3">
        <h3 class="font-bold">4. Vertragsdauer/Beendigung</h3>
        <p class="indent-8">Das Dienstverhältnis beginnt am <span class="font-semibold">${startDate || "Keine Daten gefunden"}</span> und ist bis zum <span class="font-semibold">${displayEndDate || "bis zum Ende des Probemonats"}</span> befristet. Es wird eine Probezeit von der Dauer eines Monats vereinbart, während der das Dienstverhältnis von jeder Vertragspartei ohne Angabe von Gründen jederzeit mit sofortiger Wirkung gelöst werden kann. Wird das Dienstverhältnis nicht innerhalb des Probemonats bzw. mit Ende der Befristung gelöst, geht es in ein unbefristetes Dienstverhältnis über.</p>
        <p>Der Arbeitnehmer kann das Dienstverhältnis unter Einhaltung einer einmonatigen Kündigungsfrist jeweils zum Letzten jeden Monats aufkündigen. Der Arbeitgeber kann das Dienstverhältnis unter Einhaltung der gesetzlichen Kündigungsfrist gemäß § 20 Abs 3 Angestelltengesetz jeweils zum Fünfzehnten oder Monatsletzten beenden. Während der gesetzlichen Kündigungsfrist ist nach Möglichkeit ein allenfalls vorhandener Resturlaub sowie ein allenfalls vorhandenes Zeitguthaben zu konsumieren.</p>
      </div>

      <!-- Section 5: Urlaubsanspruch -->
      <div class="space-y-3">
        <h3 class="font-bold">5. Urlaubsanspruch</h3>
        <p>Das Ausmaß des jährlichen Erholungsurlaubes richtet sich nach den Bestimmungen des Urlaubsgesetzes. Der Zeitpunkt und die Dauer des Urlaubes sind mit dem Arbeitgeber rechtzeitig schriftlich zu vereinbaren. Beide Vertragsteile streben einen periodenkonformen (dh. im Urlaubsjahr des Entstehens des jeweiligen Urlaubs) erfolgenden Urlaubsverbrauch an. Es gilt als vereinbart, dass im Zeitraum Oktober bis Dezember und April bis Mai aufgrund der in dieser Phase extrem hohen Auftragsdichte Urlaube nur in besonders berücksichtigungswürdigen Ausnahmefällen und mit Genehmigung der Geschäftsleitung möglich sind. Wir ersuchen Sie, dies bei der Planung Ihrer Urlaubswünsche entsprechend zu berücksichtigen.</p>
        <p>Im Falle einer Teilzeitbeschäftigung wird der gesetzliche Urlaubsanspruch wertneutral, dh. entsprechend dem Ausmaß der Teilzeitbeschäftigung, umgerechnet. Eine derartige Umrechnung des Urlaubsanspruchs erfolgt im Falle eines Wechsels zwischen Vollzeit und Teilzeit (oder umgekehrt) auch für den vor dem Wechsel entstandenen und noch nicht verbrauchten Alturlaub. Gleiches gilt im Falle einer Änderung des Teilzeitausmaßes.</p>
      </div>

      <!-- Section 6: Dienstverhinderung -->
      <div class="space-y-3">
        <h3 class="font-bold">6. Dienstverhinderung</h3>
        <p>Bei Krankheit oder Unglücksfall oder im Fall einer sonstigen Dienstverhinderung aus einem wichtigen, die Person des Arbeitnehmers betreffenden Grund, hat der Arbeitnehmer den Arbeitgeber sofort am 1. Tag der Dienstverhinderung oder wenn möglich noch vor Eintritt der Verhinderung zu verständigen. Ist der Arbeitnehmer durch Krankheit an der Erbringung seiner Dienste gehindert, hat er dem Arbeitgeber ab dem 1. Tag der Dienstverhinderung eine Bestätigung des Arztes oder der Gebietskrankenkasse vorzulegen. Nur in jenen Fällen, in denen die Beibringung der Bestätigung eines österreichischen Arztes nicht möglich ist, wird ausnahmsweise eine ausländische Arztbestätigung (inkl. beglaubigter Übersetzung) akzeptiert.</p>
        <p>Kommt der Arbeitnehmer der Pflicht zur unverzüglichen Verständigung von einer Dienstverhinderung nicht nach und/oder legt er die geforderte Bestätigung über die Dienstverhinderung nicht (rechtzeitig) vor, verliert er für die Dauer der Säumnis den Anspruch auf Entgelt. Bei längerer Dienstverhinderung kann der Arbeitgeber nach angemessener Zeit erneut die Vorlage einer Bestätigung verlangen.</p>
      </div>

      <!-- Section 7: Verschwiegenheitspflicht -->
      <div class="space-y-3">
        <h3 class="font-bold">7. Verschwiegenheitspflicht</h3>
        <p>Der Arbeitnehmer ist zur Wahrung von Betriebs- und Geschäftsgeheimnissen des Arbeitgebers und der Auftraggeber gegenüber jedermann und zu jeder Zeit, somit sowohl bei aufrechtem Dienstverhältnis als auch nach dem Ende des Dienstverhältnisses verpflichtet.</p>
        <p>Inhalte dieses Vertrages, insbesondere das Gehalt unterliegen strenger Geheimhaltung. Die Nichteinhaltung dieser Bestimmung stellt einen wichtigen Grund für die Auflösung des Dienstverhältnisses (Entlassung) gemäß § 27 AngG dar.</p>
      </div>

      <!-- Section 8: Konkurrenzklausel -->
      <div class="space-y-3">
        <h3 class="font-bold">8. Konkurrenzklausel</h3>
        <p>Für die Dauer des Angestelltenverhältnisses verpflichtet sich der Arbeitnehmer vor einer</p>
        <ul class="list-disc list-inside ml-4">
          <li>allfälligen Aufnahme einer Tätigkeit bei einem direkten Mitbewerber des Kunden</li>
          <li>einer direkten oder indirekten Beteiligung an einem Wirtschaftsunternehmen welche im direkten Mitbewerb zum Kunden steht</li>
          <li>einer selbständigen Tätigkeit welche im direkten Mitbewerb zum Kunden steht oder einer beratenden Funktion eine schriftliche Genehmigung bei seinem Vorgesetzten der Sales Crew Verkaufsförderung GmbH einzuholen. Mündliche Genehmigungen werden als nicht gültig anerkannt. Ein Verstoß gegen Punkt 8 lässt auf eine Vertrauensunwürdigkeit des Dienstnehmers schließen, welche einen Entlassungsgrund darstellt.</li>
        </ul>
      </div>

      <!-- Section 9: Meldepflichten und sonstige Pflichten -->
      <div class="space-y-3">
        <h3 class="font-bold">9. Meldepflichten und sonstige Pflichten</h3>
        <p>Der Arbeitnehmer hat dem Arbeitgeber jede beabsichtigte Aufnahme einer anderen Beschäftigung oder sonstigen Erwerbstätigkeit zu melden. Die Aufnahme einer anderen Beschäftigung oder sonstigen Erwerbstätigkeit setzt die Zustimmung des Arbeitgebers voraus.</p>
        <p>Der Arbeitnehmer ist verpflichtet, alle Änderungen seiner Personalien (Name, Adresse, Familienstand, Zahl der Kinder etc) und seiner Wohn- bzw Zustelladresse dem Arbeitgeber ehestmöglich bekannt zu geben.</p>
      </div>

      <!-- Section 10: Konventionalstrafe -->
      <div class="space-y-3">
        <h3 class="font-bold">10. Konventionalstrafe</h3>
        <p class="indent-8">Der Arbeitnehmer und der Arbeitgeber vereinbaren einvernehmlich für den Fall einer vom Arbeitnehmer verschuldeten fristlosen Entlassung, eines unberechtigten vorzeitigen Austritts oder einer frist-/terminwidrigen Kündigung durch den Arbeitnehmer, weiters für den Fall, dass der Arbeitnehmer das Nebenbeschäftigungsverbot für Mitbewerber oder die Verschwiegenheitspflicht verletzt, einen pauschalierten, somit von der tatsächlichen Schadenshöhe unabhängigen Schadenersatz in Höhe von 3 Monatsbezügen (Monatsgehalt zuzüglich anteilige Sonderzahlungen, variable Bezüge im 3-Monatsschnitt, etwaige Sachbezüge etc).</p>
        <p>Die Vertragsstrafe wird soweit möglich von den zustehenden Geldbezügen abgezogen. Ein nicht auf diese Weise (= durch Abzug von den Geldbezügen) entrichteter Restbetrag ist binnen 14 Tagen ab Aufforderung auf das Konto des Arbeitgebers einzubezahlen.</p>
      </div>

      <!-- Section 11: Anwendbare Rechtsvorschriften -->
      <div class="space-y-3">
        <h3 class="font-bold">11. Anwendbare Rechtsvorschriften</h3>
        <p>Für dieses Dienstverhältnis gelten die allgemeinen arbeitsrechtlichen Bestimmungen (Angestelltengesetz, Urlaubsgesetz, etc)</p>
        <p>Es gelten weiters die Bestimmungen des BMVG.</p>
        <p>Mitarbeitervorsorgekasse: Die Abfertigungsbeiträge nach § 6 Abs. 1 BMVG werden an die Valida Plus AG, MVK Leitzahl 71300, Beitr. Nr. S970491261 weitergeleitet.</p>
      </div>

      <!-- Section 12: Bild- und Tonaufnahmen -->
      <div class="space-y-3">
        <h3 class="font-bold">12. Bild- und Tonaufnahmen</h3>
        <p>Hiermit gibt der Arbeitnehmer die Einwilligung dazu, dass Bilder, Ton- und Videoaufnahmen oder Daten (z.B.: elektronische Datenverarbeitung) der eigenen Person in unveränderter oder geänderter Version von Sales Crew Verkaufsförderung GmbH für Werbezwecke oder Administrationszwecke verwendet und veröffentlicht werden dürfen. Hiermit bestätigt der Arbeitnehmer, dass alle zustehenden Ansprüche von der Sales Crew oder von Dritten, die bei der Anfertigung, Verbreitung und Veröffentlichung der Bilder oder Videos entstehen, mit dieser Einverständniserklärung abgegolten sind. Aus der Zustimmung zur Veröffentlichung leitet der Arbeitnehmer keine Rechte (wie z.B. das Recht auf Entgelt) ab. Die Sales Crew kann für die widerrechtliche Verbreitung der Foto- und Videoaufnahmen seitens Dritter keine Haftung übernehmen.</p>
      </div>

      <!-- Section 13: Dienstkleidung -->
      <div class="space-y-3">
        <h3 class="font-bold">13. Dienstkleidung</h3>
        <p>Der Arbeitgeber stellt dem Arbeitnehmer für die Ausübung seiner Tätigkeit die erforderliche Dienstkleidung zur Verfügung und ist berechtigt, deren Tragen während der Dienstzeiten verbindlich vorzuschreiben. Der Arbeitnehmer ist verpflichtet, die vom Arbeitgeber vorgegebene Dienstkleidung während sämtlicher Arbeitseinsätze zu tragen und diese in ordentlichem Zustand zu halten.</p>
        <p>Wird die Dienstkleidung ohne berechtigten Grund nicht getragen, ist der Arbeitnehmer an diesem Tag nicht zur Arbeitsleistung gemäß den Vorgaben des Auftraggebers ordnungsgemäß erschienen, sodass kein Anspruch auf Entgelt für diesen Tag besteht.</p>
      </div>

      <!-- Section 14: Standorttracking -->
      <div class="space-y-3">
        <h3 class="font-bold">14. Standorttracking</h3>
        <p>In Bezug auf die Ausführung der vereinbarten Dienstleistung, erklärt sich der Arbeitnehmer hiermit einverstanden, dem Arbeitgeber bei Dienstantritt seinen Standort via Whatsapp Live Standort bekannt zu geben. Das Standort Tracking dient ausschließlich dazu, die Einsatzzeiten zu dokumentieren.</p>
        <p>Der Arbeitnehmer bestätigt, dass er über das Standort Tracking informiert wurde und dieser Maßnahme zustimmt. Es wird darauf hingewiesen, dass die erhobenen Daten ausschließlich für interne Zwecke verwendet werden und vertraulich behandelt werden.</p>
        <p>Es erfolgt keine Weitergabe an Dritte, es sei denn, dies ist gesetzlich vorgeschrieben oder wird vom Arbeitnehmer ausdrücklich genehmigt. Diese Vereinbarung über das Standort Tracking während der Arbeitszeit tritt mit der Unterzeichnung des Dienstvertrags in Kraft und bleibt während der Laufzeit des Vertrages gültig.</p>
      </div>

      <!-- Section 15: Sonstige Vereinbarungen -->
      <div class="space-y-3">
        <h3 class="font-bold">15. Sonstige Vereinbarungen</h3>
        <p>Der Arbeitnehmer ist über Aufforderung des Arbeitgebers zur Vorlage einer aktuellen (maximal 3 Monate alten) Strafregisterbescheinigung („Leumundszeugnis") verpflichtet. Die dafür anfallenden Kosten werden dem Arbeitnehmer vom Arbeitgeber ersetzt.</p>
        <p>Der Arbeitnehmer ist verpflichtet, sich jeweils zeitgerecht um die Verlängerung der allenfalls erforderlichen Aufenthaltstitel und Arbeitsgenehmigungen zu kümmern. Unterlässt der Arbeitnehmer schuldhaft die rechtzeitige Verlängerung der erforderlichen Aufenthaltstitel und/oder Arbeitsgenehmigungen, berechtigt dies den Arbeitgeber zur fristlosen Entlassung.</p>
        <p>Mündliche Nebenabreden wurden zum vorliegenden Dienstvertrag nicht getroffen. Änderungen und Ergänzungen dieses Dienstvertrages bedürfen zu ihrer Rechtswirksamkeit der Schriftform.</p>
        <p>Sollte sich eine Bestimmung dieses Vertrages als unwirksam, ungültig oder nicht durchsetzbar erweisen, kommen die Parteien überein, die ungültig gewordene Bestimmung durch eine wirksame und durchsetzbare zu ersetzen.</p>
        <p>Die dem wirtschaftlichen oder ideellen Gehalt weit gehend entspricht oder am nächsten kommt. Die übrigen Vertragsbestimmungen werden durch die Unwirksamkeit einzelner Bestimmungen nicht berührt.</p>
        <p>Der Arbeitnehmer erklärt mit seiner Unterschrift, dass er den gesamten Vertragsinhalt gelesen, diesen in all seinen Teilen verstanden hat und mit diesem einverstanden ist. Der Arbeitnehmer bestätigt eine Ausfertigung dieses Dienstvertrages erhalten zu haben.</p>
      </div>

      <!-- Signature Section -->
      <div class="mt-12 pt-8 border-t border-gray-300" style="page-break-inside: avoid;">
        <div class="grid grid-cols-2 gap-8">
          <div class="text-center relative">
            <div class="relative" style="height: 80px; margin-bottom: 8px;">
              <img 
                src="/contracts/signature-stamp.png" 
                alt="Unterschrift Sales Crew" 
                style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); width: 180px; height: auto; display: block; z-index: 10;"
                crossorigin="anonymous"
              />
              <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);">________________________</div>
            </div>
            <p>Sales Crew Verkaufsförderung GmbH</p>
            <p class="mt-4">Datum: ${signatureDate}</p>
          </div>
          <div class="text-center">
            <div style="height: 80px; margin-bottom: 8px; display: flex; align-items: flex-end; justify-content: center;">________________________</div>
            <p>Arbeitnehmer</p>
            <p class="mt-4">Datum: ……………</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
