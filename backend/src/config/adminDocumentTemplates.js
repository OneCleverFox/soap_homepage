const DOCUMENT_TYPES = {
  // Schmuck, Werkstücke, Seife (GPSR/REACH)
  gpsr_konformitaetsblatt: 'GPSR – Produktsicherheits- & Konformitaetsblatt',
  gpsr_risikoanalyse_art9: 'GPSR – Interne Risikoanalyse (Art. 9)',
  reach_info_art33: 'REACH – Informationsdokument (Art. 33)',
  reach_verbraucherinfo_45_tage: 'REACH – Verbraucherinformation (45-Tage-Regel)',
  lieferanten_dokumentencheck: 'Lieferanten-Dokumentencheck (REACH/GPSR)',
  rueckverfolgbarkeitsregister: 'Rueckverfolgbarkeitsregister (Chargen / Komponenten)',
  beschwerde_vorfallregister: 'Beschwerde- & Vorfallregister (GPSR)',
  webshop_compliance_schmuck: 'Webshop-Compliance-Checkliste (Schmuck)',
  
  // Kosmetik (Kosmetik-VO)
  pif_kosmetik: 'PIF – Nachweis der Produktinformationen (Kosmetik)',
  cpsr_kosmetik: 'CPSR – Kosmetik-Sicherheitsbericht',
  cpnp_kosmetik: 'CPNP-Anmeldung & Verwaltung',
  gmp_kosmetik_check: 'GMP-Plausibilitaetspruefung (Produktion/Lagerung)',
  kosmetik_etiketten_check: 'Kosmetik Etikett-Compliance Check',
  vigilanz_unerwuenschte_wirkungen: 'Vigilanz & unerwuenschte Wirkungen (Kosmetik)'
};

const DOCUMENT_TYPE_GUIDANCE = {
  gpsr_konformitaetsblatt: {
    purpose: 'Dokumentiert Produktangaben, Warnhinweise und den aktuellen Umsetzungsstand fuer das Inverkehrbringen.',
    whenToUse: 'Vor erstmaligem Verkauf und bei relevanten Produkt- oder Kennzeichnungsaenderungen aktualisieren.',
    legalReference: 'GPSR (EU) 2023/988 – allgemeine Produktsicherheit',
    practicalExamples: [
      'Neues Produkt geht online',
      'Warnhinweise wurden angepasst',
      'Materialaenderung beim Produkt'
    ]
  },
  gpsr_risikoanalyse_art9: {
    purpose: 'Interne Gefaehrdungsbeurteilung mit Risikoabschaetzung und konkreten Minderungsmassnahmen.',
    whenToUse: 'Bei neuen oder geaenderten Produkten sowie nach Beschwerden oder Sicherheitsvorfaellen pflegen.',
    legalReference: 'GPSR Art. 9 – interne Risikoanalyse und Bewertung',
    practicalExamples: [
      'Produkt mit Kleinteilen',
      'Neue Zielgruppe',
      'Vorfallmeldung mit moeglicher Verletzungsgefahr'
    ]
  },
  reach_info_art33: {
    purpose: 'Hinterlegt die aus der Lieferkette stammenden Stoffinformationen fuer Erzeugnisse.',
    whenToUse: 'Bei neuer Lieferantenauskunft oder geaenderter Materialzusammensetzung aktualisieren.',
    legalReference: 'REACH Art. 33 – Informationspflicht in der Lieferkette',
    practicalExamples: [
      'Neue Materialcharge',
      'Aktualisierte Lieferantenerklaerung'
    ]
  },
  reach_verbraucherinfo_45_tage: {
    purpose: 'Nachvollziehbare Bearbeitung von Verbraucheranfragen inklusive 45-Tage-Frist.',
    whenToUse: 'Immer dann nutzen, wenn Verbraucher eine REACH-Auskunft anfordern.',
    legalReference: 'REACH Art. 33 Abs. 2 – Antwort innerhalb von 45 Tagen',
    practicalExamples: [
      'E-Mail-Anfrage eines Kunden zur Stoffauskunft',
      'Nachverfolgung offener Anfragefaelle'
    ]
  },
  lieferanten_dokumentencheck: {
    purpose: 'Prueft je Lieferant, ob erforderliche Unterlagen fuer GPSR/REACH vorliegen und plausibel sind.',
    whenToUse: 'Vor Freigabe neuer Lieferanten und regelmaessig im Bestand (z. B. quartalsweise).',
    legalReference: 'Sorgfaltspflichten entlang der Lieferkette (GPSR/REACH)',
    practicalExamples: [
      'Onboarding neuer Lieferant',
      'Ablauf/Erneuerung von Nachweisen'
    ]
  },
  rueckverfolgbarkeitsregister: {
    purpose: 'Dokumentiert Chargen, Komponenten und Zuordnungen fuer schnelle Rueckverfolgbarkeit.',
    whenToUse: 'Laufend bei Wareneingang und Produktions-/Konfektionsschritten fuehren.',
    legalReference: 'Rueckverfolgbarkeitspflichten aus Produktsicherheitsrecht',
    practicalExamples: [
      'Charge einer Seife',
      'Komponentenliste fuer Schmuckstueck'
    ]
  },
  beschwerde_vorfallregister: {
    purpose: 'Zentrale Erfassung von Beschwerden, Vorfaellen und abgeleiteten Korrekturmassnahmen.',
    whenToUse: 'Sofort bei Eingang sicherheitsrelevanter Rueckmeldungen und bis zum Abschluss pflegen.',
    legalReference: 'GPSR – Marktueberwachung, Vorfall- und Risikobehandlung',
    practicalExamples: [
      'Meldung ueber allergische Reaktion',
      'Produktbeschaedigung mit Sicherheitsbezug'
    ]
  },
  webshop_compliance_schmuck: {
    purpose: 'Prueft, ob rechtlich relevante Pflichtangaben fuer Schmuck im Shop korrekt sichtbar sind.',
    whenToUse: 'Vor Shop-Livegang und nach Aenderungen an Produktseiten oder Warnhinweisen nutzen.',
    legalReference: 'GPSR/Verbraucherinformationen fuer Online-Angebote',
    practicalExamples: [
      'Neue Schmuck-Kategorie live geschaltet',
      'Template/Produktdetailseite geaendert'
    ]
  },
  pif_kosmetik: {
    purpose: 'Nachweis, dass Sicherheits- und Produktinformationen fuer jedes Kosmetik-Erzeugnis vorliegen.',
    whenToUse: 'Vor Markteinführung jedes Kosmetik-Produkts und bei relevanten Aenderungen aktualisieren.',
    legalReference: 'Kosmetik-VO (EU) 1223/2009 – PIF = Produktinformationsdatei',
    practicalExamples: [
      'Neue Kosmetik-Linie wird eingefuehrt',
      'Rezeptur oder Komponentenliste geaendert',
      'Neuer Lieferant fuer Rohstoffe'
    ]
  },
  cpsr_kosmetik: {
    purpose: 'Umfassender Sicherheitsbericht dokumentiert alle verfügbaren Sicherheitsdaten der Kosmetik.',
    whenToUse: 'Ausfuehrlich vor erster Markteinführung; bei groesseren Aenderungen aktualisieren.',
    legalReference: 'Kosmetik-VO Art. 15 – Sicherheitsbericht (CPSR)',
    practicalExamples: [
      'Kosmetik-Creme/Lotion wird entwickelt',
      'Vertraeg mit neuem Fertigungsanlagen-Betreiber'
    ]
  },
  cpnp_kosmetik: {
    purpose: 'Anmeldung und Verwaltung kosmetischer Produkte im nationalen CPNP-Portal.',
    whenToUse: 'Vor Vertrieb in jedem Markt; regelmaessig pruefe auf Aenderungsmitteilungen.',
    legalReference: 'Kosmetik-VO Art. 27 – CPNP-Anmeldefrist 28 Tage vor Vertrieb',
    practicalExamples: [
      'Neues Kosmetik-Produkt soll in DE/EU vertrieben werden',
      'Zustaendige Behörden wechsel / Bestandteile aendern sich'
    ]
  },
  gmp_kosmetik_check: {
    purpose: 'Plausibilitaetspruefung, dass Produktion und Lagerung die Gute-Herstellungs-Praxis einhalten.',
    whenToUse: 'Regelmaessig (z. B. jährlich) oder bei Aenderungen an Produktion/Lagerung.',
    legalReference: 'Kosmetik-VO Art. 9 – Gute-Herstellungs-Praxis (GMP)',
    practicalExamples: [
      'Neuer Produktionspart startet',
      'Fremdfertiger wird geprueft'
    ]
  },
  kosmetik_etiketten_check: {
    purpose: 'Prueft, dass Etikett fuer Kosmetik alle Pflichtangaben (Inhalt, Warnhinweise, etc.) richtig sind.',
    whenToUse: 'Vor Etikett-Druck und nach Aenderung einer Pflichtangabe.',
    legalReference: 'Kosmetik-VO Art. 15 & 16 – Kennzeichnungspflicht',
    practicalExamples: [
      'Erste Charge eines neuen Produkts wird etikettiert',
      'Warnhinweis zur Anwendung aktualisiert'
    ]
  },
  vigilanz_unerwuenschte_wirkungen: {
    purpose: 'Zentrales Register fuer nach Markteinführung gemeldete unerwuenschte Wirkungen von Kosmetika.',
    whenToUse: 'Laufend gepflegt; bei jedem Kundenfeedback zu Hautreaktionen/Allergien dokumentieren.',
    legalReference: 'Kosmetik-VO Art. 27c – Vigilanz und Meldung unerwuenschten Nebenwirkungen',
    practicalExamples: [
      'Kunde meldet Rötung nach Anwendung',
      'Häufung von ähnlichen Reaktionen auf Charge X'
    ]
  }
};
const DOCUMENT_TYPE_CLASSIFICATION = {
  gpsr_konformitaetsblatt: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Sollte fuer jede relevante Produktgruppe laufend gepflegt werden.',
    productFamily: 'gpsr'
  },
  gpsr_risikoanalyse_art9: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Bei neuen/geaenderten Produkten und Vorfaellen verbindlich fortschreiben.',
    productFamily: 'gpsr'
  },
  reach_info_art33: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Erforderlich zur belastbaren Lieferketten-Dokumentation.',
    productFamily: 'gpsr'
  },
  reach_verbraucherinfo_45_tage: {
    complianceLevel: 'optional',
    complianceLabel: 'Anlassbezogen',
    complianceHint: 'Wird nur bei eingehenden Verbraucheranfragen aktiv genutzt.',
    productFamily: 'gpsr'
  },
  lieferanten_dokumentencheck: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Regelmaessig zur Nachweispruefung der Lieferkette einsetzen.',
    productFamily: 'shared'
  },
  rueckverfolgbarkeitsregister: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Laufend fuehren, um Chargen und Komponenten nachvollziehen zu koennen.',
    productFamily: 'shared'
  },
  beschwerde_vorfallregister: {
    complianceLevel: 'optional',
    complianceLabel: 'Anlassbezogen',
    complianceHint: 'Bei Beschwerden/Vorfaellen zwingend nutzen, sonst leer moeglich.',
    productFamily: 'shared'
  },
  webshop_compliance_schmuck: {
    complianceLevel: 'optional',
    complianceLabel: 'Anlassbezogen',
    complianceHint: 'Vor allem bei Schmuck und Shop-Aenderungen relevant.',
    productFamily: 'gpsr'
  },
  // Kosmetik-Dokumente
  pif_kosmetik: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Fuer jedes Kosmetik-Produkt verbindlich vor Markteinführung.',
    productFamily: 'kosmetik'
  },
  cpsr_kosmetik: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Sicherheitsbericht muss disponibel sein; detaillierte Vorabpruefung.',
    productFamily: 'kosmetik'
  },
  cpnp_kosmetik: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Anmeldung im Nationalbericht obligatorisch vor Vertrieb.',
    productFamily: 'kosmetik'
  },
  gmp_kosmetik_check: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Gute-Herstellungs-Praxis must dokumentiert und regelmaessig geprueft sein.',
    productFamily: 'kosmetik'
  },
  kosmetik_etiketten_check: {
    complianceLevel: 'pflicht',
    complianceLabel: 'Pflichtdokument',
    complianceHint: 'Vor jeder Etikett-Aenderung oder Druck durchfuehren.',
    productFamily: 'kosmetik'
  },
  vigilanz_unerwuenschte_wirkungen: {
    complianceLevel: 'optional',
    complianceLabel: 'Anlassbezogen',
    complianceHint: 'Laufend im Betrieb; wird bei Kundenfeedback aktiv genutzt.',
    productFamily: 'kosmetik'
  }
};

const PRODUCT_GROUP_OPTIONS = [
  { value: 'seife', label: 'Seife' },
  { value: 'werkstuck', label: 'Werkstuecke' },
  { value: 'schmuck', label: 'Schmuck' },
  { value: 'kosmetik', label: 'Kosmetik-Produkte' }
];

const DEFAULT_PRODUCT_GROUPS_BY_TYPE = {
  webshop_compliance_schmuck: ['schmuck'],
  // Kosmetik-Dokumente
  pif_kosmetik: ['kosmetik'],
  cpsr_kosmetik: ['kosmetik'],
  cpnp_kosmetik: ['kosmetik'],
  gmp_kosmetik_check: ['kosmetik'],
  kosmetik_etiketten_check: ['kosmetik'],
  vigilanz_unerwuenschte_wirkungen: ['kosmetik']
};

// Produktfamilie-Struktur für Clustering in der UI
const PRODUCT_FAMILIES = {
  gpsr: {
    id: 'gpsr',
    label: 'GPSR & Schmuck',
    description: 'Produktsicherheitsrichtlinie & REACH für Schmuck, Werkstücke, Seifen',
    productGroups: ['seife', 'werkstuck', 'schmuck'],
    color: '#1976d2'
  },
  kosmetik: {
    id: 'kosmetik',
    label: 'Kosmetik',
    description: 'Kosmetik-Verordnung (EU) 1223/2009',
    productGroups: ['kosmetik'],
    color: '#388e3c'
  }
};

// Pflicht-Matrix: Welche Dokumente sind für welche Produktgruppe Pflicht?
const DOCUMENT_FAMILY_MATRIX = {
  gpsr_konformitaetsblatt: { seife: 'pflicht', werkstuck: 'pflicht', schmuck: 'pflicht', kosmetik: 'entfällt' },
  gpsr_risikoanalyse_art9: { seife: 'pflicht', werkstuck: 'pflicht', schmuck: 'pflicht', kosmetik: 'entfällt' },
  reach_info_art33: { seife: 'pflicht', werkstuck: 'optional', schmuck: 'optional', kosmetik: 'entfällt' },
  reach_verbraucherinfo_45_tage: { seife: 'optional', werkstuck: 'optional', schmuck: 'optional', kosmetik: 'entfällt' },
  lieferanten_dokumentencheck: { seife: 'pflicht', werkstuck: 'pflicht', schmuck: 'pflicht', kosmetik: 'pflicht' },
  rueckverfolgbarkeitsregister: { seife: 'pflicht', werkstuck: 'pflicht', schmuck: 'pflicht', kosmetik: 'pflicht' },
  beschwerde_vorfallregister: { seife: 'optional', werkstuck: 'optional', schmuck: 'optional', kosmetik: 'optional' },
  webshop_compliance_schmuck: { seife: 'entfällt', werkstuck: 'entfällt', schmuck: 'optional', kosmetik: 'entfällt' },
  pif_kosmetik: { seife: 'entfällt', werkstuck: 'entfällt', schmuck: 'entfällt', kosmetik: 'pflicht' },
  cpsr_kosmetik: { seife: 'entfällt', werkstuck: 'entfällt', schmuck: 'entfällt', kosmetik: 'pflicht' },
  cpnp_kosmetik: { seife: 'entfällt', werkstuck: 'entfällt', schmuck: 'entfällt', kosmetik: 'pflicht' },
  gmp_kosmetik_check: { seife: 'entfällt', werkstuck: 'entfällt', schmuck: 'entfällt', kosmetik: 'pflicht' },
  kosmetik_etiketten_check: { seife: 'entfällt', werkstuck: 'entfällt', schmuck: 'entfällt', kosmetik: 'pflicht' },
  vigilanz_unerwuenschte_wirkungen: { seife: 'entfällt', werkstuck: 'entfällt', schmuck: 'entfällt', kosmetik: 'optional' }
};

const COMMON_SECTIONS = [
  {
    id: 'anwendungsbereich',
    title: 'Anwendungsbereich',
    fields: [
      {
        key: 'anwendungsbereich_produktgruppen',
        label: 'Anzuwenden fuer Produktgruppen',
        type: 'multiselect',
        options: PRODUCT_GROUP_OPTIONS,
        value: ['seife', 'werkstuck', 'schmuck']
      },
      { key: 'anwendungsbereich_hinweis', label: 'Hinweis zur Anwendbarkeit', type: 'textarea', value: 'Nur anwenden, soweit fuer die jeweilige Produktgruppe erforderlich.' }
    ]
  },
  {
    id: 'stammdaten',
    title: 'Stammdaten',
    fields: [
      { key: 'hersteller_name', label: 'Hersteller / Inverkehrbringer', type: 'text', value: '' },
      { key: 'adresse', label: 'Adresse', type: 'textarea', value: '' },
      { key: 'kontakt_email', label: 'Kontakt (E-Mail)', type: 'text', value: '' },
      { key: 'produktgruppe', label: 'Betroffene Produktgruppe(n)', type: 'text', value: '' }
    ]
  },
  {
    id: 'massnahmen',
    title: 'Massnahmen und Status',
    fields: [
      {
        key: 'status',
        label: 'Dokumentierter Status',
        type: 'select',
        value: 'offen',
        options: [
          { value: 'offen', label: 'offen' },
          { value: 'in_pruefung', label: 'in Pruefung' },
          { value: 'umgesetzt', label: 'umgesetzt' },
          { value: 'abgeschlossen', label: 'abgeschlossen' }
        ]
      },
      { key: 'massnahmen', label: 'Massnahmen / Beobachtungen', type: 'textarea', value: '' },
      { key: 'datum', label: 'Datum', type: 'date', value: '' },
      { key: 'verantwortliche_person', label: 'Verantwortliche Person', type: 'text', value: '' }
    ]
  }
];

const DOCUMENT_SPECIFIC_FIELDS = {
  gpsr_konformitaetsblatt: [
    {
      id: 'produktdaten',
      title: 'Produktdaten und Zweck',
      fields: [
        { key: 'verwendung', label: 'Bestimmungsgemaesse Verwendung', type: 'textarea', value: '' },
        { key: 'produktbeschreibung', label: 'Kurzbeschreibung des Produkttyps', type: 'textarea', value: '' },
        { key: 'materialhinweise', label: 'Material-/Komponentenhinweise', type: 'textarea', value: '' }
      ]
    },
    {
      id: 'sicherheitsangaben',
      title: 'Sicherheitsangaben',
      fields: [
        { key: 'warnung_kleinteile', label: 'Warnung: Kleinteile / Erstickungsgefahr erforderlich', type: 'checkbox', value: false },
        { key: 'warnung_kinder', label: 'Warnung: Nicht fuer Kinder unter 14 Jahren erforderlich', type: 'checkbox', value: false },
        { key: 'warnung_haut', label: 'Warnung: Hinweis auf Hautreaktionen erforderlich', type: 'checkbox', value: false },
        { key: 'zusatzhinweise', label: 'Weitere neutrale Warn-/Sicherheitshinweise', type: 'textarea', value: '' }
      ]
    },
    {
      id: 'nachweise',
      title: 'Nachweise und Referenzen',
      fields: [
        { key: 'lieferantenbezug', label: 'Lieferanten-/Materialnachweise referenziert', type: 'checkbox', value: false },
        { key: 'interne_pruefung', label: 'Interne Plausibilitaetspruefung durchgefuehrt', type: 'checkbox', value: false }
      ]
    }
  ],
  gpsr_risikoanalyse_art9: [
    {
      id: 'risikoidentifikation',
      title: 'Risikoidentifikation',
      fields: [
        { key: 'risikoquelle', label: 'Identifizierte Risikoquelle', type: 'textarea', value: '' },
        { key: 'betroffene_nutzergruppe', label: 'Betroffene Nutzergruppe', type: 'text', value: '' },
        { key: 'nutzungssituation', label: 'Nutzungssituation mit Risiko', type: 'textarea', value: '' }
      ]
    },
    {
      id: 'risikobewertung',
      title: 'Risikobewertung',
      fields: [
        { key: 'eintrittswahrscheinlichkeit', label: 'Eintrittswahrscheinlichkeit', type: 'select', value: 'mittel', options: [
          { value: 'niedrig', label: 'niedrig' },
          { value: 'mittel', label: 'mittel' },
          { value: 'hoch', label: 'hoch' }
        ] },
        { key: 'auswirkung', label: 'Auswirkung/Schweregrad', type: 'select', value: 'mittel', options: [
          { value: 'niedrig', label: 'niedrig' },
          { value: 'mittel', label: 'mittel' },
          { value: 'hoch', label: 'hoch' }
        ] },
        { key: 'gesamtbewertung', label: 'Gesamtbewertung', type: 'text', value: '' }
      ]
    },
    {
      id: 'minderung',
      title: 'Risikominderung',
      fields: [
        { key: 'minderungsmassnahmen', label: 'Konkrete Minderungsmassnahmen', type: 'textarea', value: '' },
        { key: 'restrestrisiko', label: 'Bewertung Restrisiko', type: 'text', value: '' }
      ]
    }
  ],
  reach_info_art33: [
    {
      id: 'stoffinformation',
      title: 'Stoffinformation (Lieferkette)',
      fields: [
        { key: 'erzeugnisbezug', label: 'Erzeugnisbezug / betroffene Produktgruppe', type: 'text', value: '' },
        { key: 'svhc_status', label: 'SVHC-Status laut Lieferkette', type: 'text', value: '' },
        { key: 'informationsquelle', label: 'Informationsquelle (Lieferant/Dokument)', type: 'text', value: '' },
        { key: 'letzte_lieferantenbestaetigung', label: 'Datum letzte Lieferantenbestaetigung', type: 'date', value: '' }
      ]
    },
    {
      id: 'kommunikation',
      title: 'Kommunikation und Dokumentation',
      fields: [
        { key: 'kommunikationsweg', label: 'Interner Ablage-/Kommunikationsweg', type: 'text', value: '' },
        { key: 'offene_punkte', label: 'Offene Punkte/Nachforderungen', type: 'textarea', value: '' }
      ]
    }
  ],
  reach_verbraucherinfo_45_tage: [
    {
      id: 'verbraucher',
      title: 'Anfrage- und Fristensteuerung',
      fields: [
        { key: 'anfragekanal', label: 'Anfragekanal (E-Mail/Kontaktformular/etc.)', type: 'text', value: '' },
        { key: 'anfrageeingang', label: 'Datum Anfrageeingang', type: 'date', value: '' },
        { key: 'antwortfrist', label: 'Antwort bis (45 Tage)', type: 'date', value: '' },
        { key: 'antwortdatum', label: 'Tatsaechliches Antwortdatum', type: 'date', value: '' },
        { key: 'antwortstatus', label: 'Antwortstatus', type: 'select', value: 'offen', options: [
          { value: 'offen', label: 'offen' },
          { value: 'beantwortet', label: 'beantwortet' },
          { value: 'teilbeantwortet', label: 'teilbeantwortet' }
        ] }
      ]
    },
    {
      id: 'antwortinhalt',
      title: 'Antwortinhalt (neutral)',
      fields: [
        { key: 'bereitgestellte_infos', label: 'Bereitgestellte Informationen', type: 'textarea', value: '' },
        { key: 'nachgereichte_infos', label: 'Nachgereichte Informationen', type: 'textarea', value: '' }
      ]
    }
  ],
  lieferanten_dokumentencheck: [
    {
      id: 'lieferant',
      title: 'Lieferantenpruefung und Abdeckung',
      fields: [
        { key: 'lieferant_name', label: 'Lieferant', type: 'text', value: '' },
        { key: 'lieferant_produktbezug', label: 'Belieferte Produktgruppen', type: 'text', value: '' },
        { key: 'letzte_pruefung', label: 'Letzte Dokumentenpruefung', type: 'date', value: '' },
        { key: 'gpsr_nachweis', label: 'GPSR-Nachweis vorhanden', type: 'checkbox', value: false },
        { key: 'reach_nachweis', label: 'REACH-Nachweis vorhanden', type: 'checkbox', value: false }
      ]
    },
    {
      id: 'qualitaet',
      title: 'Qualitaet und Massnahmen',
      fields: [
        { key: 'dokumentenqualitaet', label: 'Dokumentenqualitaet (vollstaendig/plausibel)', type: 'text', value: '' },
        { key: 'nachforderung_noetig', label: 'Nachforderung erforderlich', type: 'checkbox', value: false },
        { key: 'nachforderung_bis', label: 'Frist fuer Nachforderung', type: 'date', value: '' }
      ]
    }
  ],
  rueckverfolgbarkeitsregister: [
    {
      id: 'rueckverfolgung',
      title: 'Chargen- und Komponentenbezug',
      fields: [
        { key: 'produktreferenz', label: 'Produkt-/Produktgruppenreferenz', type: 'text', value: '' },
        { key: 'charge', label: 'Charge', type: 'text', value: '' },
        { key: 'komponenten', label: 'Komponenten / Herkunft', type: 'textarea', value: '' },
        { key: 'eingangsdatum', label: 'Eingangsdatum', type: 'date', value: '' }
      ]
    },
    {
      id: 'zuordnung',
      title: 'Zuordnung und Rueckrufbereitschaft',
      fields: [
        { key: 'verkaufszeitraum', label: 'Verkaufs-/Verwendungszeitraum', type: 'text', value: '' },
        { key: 'zuordnungsstatus', label: 'Komponenten eindeutig zuordenbar', type: 'checkbox', value: false },
        { key: 'rueckrufnotiz', label: 'Hinweise fuer schnelle Rueckverfolgung', type: 'textarea', value: '' }
      ]
    }
  ],
  beschwerde_vorfallregister: [
    {
      id: 'vorfall',
      title: 'Vorfallaufnahme',
      fields: [
        { key: 'eingangsdatum_vorfall', label: 'Eingangsdatum', type: 'date', value: '' },
        { key: 'vorfall_typ', label: 'Vorfalltyp', type: 'text', value: '' },
        { key: 'beschreibung', label: 'Sachverhalt', type: 'textarea', value: '' },
        { key: 'betroffene_produktgruppe', label: 'Betroffene Produktgruppe', type: 'text', value: '' }
      ]
    },
    {
      id: 'bearbeitung',
      title: 'Bewertung und Bearbeitung',
      fields: [
        { key: 'dringlichkeit', label: 'Dringlichkeit', type: 'select', value: 'mittel', options: [
          { value: 'niedrig', label: 'niedrig' },
          { value: 'mittel', label: 'mittel' },
          { value: 'hoch', label: 'hoch' }
        ] },
        { key: 'folgemassnahme', label: 'Folgemassnahme', type: 'textarea', value: '' },
        { key: 'abschlussdatum', label: 'Abschlussdatum', type: 'date', value: '' }
      ]
    }
  ],
  webshop_compliance_schmuck: [
    {
      id: 'webshop_check',
      title: 'Pflichtangaben auf Produktseite (Schmuck)',
      fields: [
        { key: 'warnhinweise_sichtbar', label: 'Warnhinweise im Shop sichtbar', type: 'checkbox', value: false },
        { key: 'zielgruppe_sichtbar', label: 'Zielgruppe im Shop sichtbar', type: 'checkbox', value: false },
        { key: 'kontakt_sichtbar', label: 'Herstellerkontakt im Shop sichtbar', type: 'checkbox', value: false },
        { key: 'letzter_check', label: 'Datum letzter Check', type: 'date', value: '' }
      ]
    },
    {
      id: 'detailcheck',
      title: 'Detail- und Konsistenzcheck',
      fields: [
        { key: 'materialangaben_sichtbar', label: 'Materialangaben sichtbar', type: 'checkbox', value: false },
        { key: 'nickelhinweis_sichtbar', label: 'Nickel-/Allergiehinweise sichtbar (falls zutreffend)', type: 'checkbox', value: false },
        { key: 'bild_text_konsistent', label: 'Bild, Titel und Sicherheitstexte konsistent', type: 'checkbox', value: false },
        { key: 'offene_shop_korrekturen', label: 'Offene Shop-Korrekturen', type: 'textarea', value: '' }
      ]
    }  ],
  pif_kosmetik: [
    {
      id: 'produktinformation',
      title: 'Produktinformationsdatei (PIF)',
      fields: [
        { key: 'produktname', label: 'Handelsname des Kosmetikprodukts', type: 'text', value: '' },
        { key: 'zutat_verzeichnis', label: 'Vollstaendiges Zutatverzeichnis INCI', type: 'textarea', value: '' },
        { key: 'sicherheitsinfo', label: 'Verweis auf Sicherheitsbewertung/CPSR', type: 'text', value: '' },
        { key: 'gmp_gruendung', label: 'GMP-Bestaetigung vom Herst./Lohnhersteller', type: 'checkbox', value: false }
      ]
    }
  ],
  cpsr_kosmetik: [
    {
      id: 'sicherheitsbewertung',
      title: 'Sicherheitsbewertung & CPSR',
      fields: [
        { key: 'bewerter_name', label: 'Name/Institution Sicherheitsbewerter', type: 'text', value: '' },
        { key: 'bewerter_qualifikation', label: 'Qualifikation des Bewerters', type: 'text', value: '' },
        { key: 'bewertungsdatum', label: 'Bewertungsdatum', type: 'date', value: '' },
        { key: 'cpsr_summe', label: 'CPSR-Zusammenfassung verfuegbar', type: 'checkbox', value: false }
      ]
    }
  ],
  cpnp_kosmetik: [
    {
      id: 'anmeldung_portal',
      title: 'CPNP-Anmeldung & Verwaltung',
      fields: [
        { key: 'portal_username', label: 'CPNP-Portalbenutzer', type: 'text', value: '' },
        { key: 'notifikation_nr', label: 'Notifikationsnummer (nach Anmeldung)', type: 'text', value: '' },
        { key: 'anmeldedatum', label: 'Anmeldedatum', type: 'date', value: '' },
        { key: 'bestaetigung_eingegangen', label: 'Bestaetigung von Behoerde eingegangen', type: 'checkbox', value: false }
      ]
    }
  ],
  gmp_kosmetik_check: [
    {
      id: 'herstellungsstandard',
      title: 'Herstellung & GMP-Einhaltung',
      fields: [
        { key: 'fertigungsstaette', label: 'Name Fertigungsstaette', type: 'text', value: '' },
        { key: 'gmp_zertifizierung', label: 'GMP-Zertifikat vorhanden / gueltig', type: 'checkbox', value: false },
        { key: 'qualita_kontrolle', label: 'Qualitaetskontrollen dokumentiert', type: 'checkbox', value: false }
      ]
    }
  ],
  kosmetik_etiketten_check: [
    {
      id: 'etikett_inhalte',
      title: 'Pflichtangaben auf Etikett',
      fields: [
        { key: 'produktname', label: 'Handelsname korrekt & sichtbar', type: 'checkbox', value: false },
        { key: 'inhaltsmenge', label: 'Nettoinhaltsgewicht/Volumen richtig', type: 'checkbox', value: false },
        { key: 'zutaten_inci', label: 'INCI-Verzeichnis vorhanden und lesbar', type: 'checkbox', value: false }
      ]
    }
  ],
  vigilanz_unerwuenschte_wirkungen: [
    {
      id: 'unerwuenschte_wirkung',
      title: 'Meldung unerwuenschter Wirkungen',
      fields: [
        { key: 'meldedatum', label: 'Datum Meldungseingang', type: 'date', value: '' },
        { key: 'melder_kontakt', label: 'Melder (Kunde/Verbraucher)', type: 'text', value: '' },
        { key: 'betroffenes_produkt', label: 'Betroffenes Kosmetik-Produkt & Charge', type: 'text', value: '' }
      ]
    }  ]
};

const LEGAL_GUARDRAIL = 'Nur dokumentierter Status und transparente Aussagen. Keine pauschalen Aussagen wie "konform", "zertifiziert" oder "geprueft".';

const deepClone = (value) => JSON.parse(JSON.stringify(value));

function getTemplateDefinition(documentType) {
  const title = DOCUMENT_TYPES[documentType];
  if (!title) {
    return null;
  }

  const sections = [
    ...deepClone(COMMON_SECTIONS),
    ...deepClone(DOCUMENT_SPECIFIC_FIELDS[documentType] || [])
  ];

  return {
    document_type: documentType,
    title,
    sections,
    legal_guardrail: LEGAL_GUARDRAIL,
    default_product_groups: DEFAULT_PRODUCT_GROUPS_BY_TYPE[documentType] || ['seife', 'werkstuck', 'schmuck']
  };
}

function getDefaultProductGroups(documentType) {
  return DEFAULT_PRODUCT_GROUPS_BY_TYPE[documentType] || ['seife', 'werkstuck', 'schmuck'];
}

module.exports = {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_GUIDANCE,
  DOCUMENT_TYPE_CLASSIFICATION,
  PRODUCT_FAMILIES,
  DOCUMENT_FAMILY_MATRIX,
  LEGAL_GUARDRAIL,
  getTemplateDefinition,
  getDefaultProductGroups
};