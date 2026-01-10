const PLAN_ORDER = ['demo', 'basic', 'pro', 'enterprise'];

const PLAN_ALIASES = {
  demo: 'demo',
  free: 'demo',
  starter: 'basic',
  basic: 'basic',
  professional: 'pro',
  pro: 'pro',
  business: 'enterprise',
  enterprise: 'enterprise',
};

const PLAN_CATALOG = {
  demo: {
    id: 'demo',
    name: 'Demo',
    badge: 'Kostenlos',
    description: 'Für Evaluierung, Demos und interne Entscheidungsrunden.',
    price: {
      monthlyCents: 0,
      yearlyCents: 0,
      currency: 'EUR',
    },
    billingUnit: 'pro Unternehmen / Monat',
    included: {
      users: 1,
      companies: 1,
    },
    trial: {
      available: false,
      label: 'Demozugang auf Anfrage',
      days: 0,
    },
    highlights: [
      'Kernfunktionen für Belege, Rechnungen und Ausgaben',
      'Bankabgleich mit nachvollziehbarem Prüfpfad',
      'Lesende KI-Erklärungen (nur Beratung)',
    ],
    limits: [
      'Nutzungsrahmen für Exporte und KI auf Anfrage',
      'Keine SLA oder dedizierter Support',
    ],
    features: {
      bankReconciliation: true,
      auditTrail: true,
      exports: false,
      aiRead: true,
      aiAssistant: false,
      aiInsights: true,
      aiSuggestions: false,
      multiCompany: false,
      dedicatedSuccess: false,
    },
    cta: {
      label: 'Demo anfragen',
      path: '/request-access',
    },
  },
  basic: {
    id: 'basic',
    name: 'Starter',
    badge: 'Beliebt',
    description: 'Für kleine Teams mit klaren Prozessen und solider Governance.',
    price: {
      monthlyCents: 9900,
      yearlyCents: 99000,
      currency: 'EUR',
    },
    billingUnit: 'pro Unternehmen / Monat',
    included: {
      users: 3,
      companies: 1,
    },
    trial: {
      available: false,
      label: 'Pilotphase nach Freigabe',
      days: 0,
    },
    highlights: [
      'Rechnungen, Ausgaben, Bankabgleich und Audit Trail',
      'Exports für Steuerberatung (CSV/PDF)',
      'KI-Auswertungen mit Advisory-Hinweis',
    ],
    limits: [
      'Nutzungsrahmen für Exporte und KI inklusive (Fair-Use)',
      'Erweiterung von Nutzern jederzeit möglich',
    ],
    features: {
      bankReconciliation: true,
      auditTrail: true,
      exports: true,
      aiRead: true,
      aiAssistant: false,
      aiInsights: true,
      aiSuggestions: false,
      multiCompany: false,
      dedicatedSuccess: false,
    },
    cta: {
      label: 'Zugang anfragen',
      path: '/request-access',
    },
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    badge: 'Beste Wahl',
    description: 'Für skalierende Finance-Teams mit mehreren Mandanten.',
    price: {
      monthlyCents: 24900,
      yearlyCents: 249000,
      currency: 'EUR',
    },
    billingUnit: 'pro Unternehmen / Monat',
    included: {
      users: 8,
      companies: 3,
    },
    trial: {
      available: false,
      label: 'Pilotphase nach Freigabe',
      days: 0,
    },
    highlights: [
      'Mehrere Unternehmen, konsolidierte Ansichten',
      'KI-Assistent mit kontextbezogenen Auswertungen',
      'Audit- und Exportfunktionen für Prüfungen',
    ],
    limits: [
      'Erweiterte Exporte und KI-Nutzung nach Bedarf',
      'Priorisierter Support',
    ],
    features: {
      bankReconciliation: true,
      auditTrail: true,
      exports: true,
      aiRead: true,
      aiAssistant: true,
      aiInsights: true,
      aiSuggestions: true,
      multiCompany: true,
      dedicatedSuccess: false,
    },
    cta: {
      label: 'Zugang anfragen',
      path: '/request-access',
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Business',
    badge: 'Individuell',
    description: 'Für größere Organisationen mit erweiterten Governance-Anforderungen.',
    price: {
      monthlyCents: null,
      yearlyCents: null,
      currency: 'EUR',
    },
    billingUnit: 'individuelle Vereinbarung',
    included: {
      users: 'Individuell',
      companies: 'Individuell',
    },
    trial: {
      available: false,
      label: 'Pilotphase nach Vereinbarung',
      days: 0,
    },
    highlights: [
      'Erweiterte Audit- und Compliance-Workflows',
      'Dedizierte Einführung und Success-Begleitung',
      'Angepasste Vertrags- und SLA-Optionen',
    ],
    limits: [
      'Kontingente und Datenhaltung nach Vertrag',
      'Integration & Sicherheitsabnahmen auf Anfrage',
    ],
    features: {
      bankReconciliation: true,
      auditTrail: true,
      exports: true,
      aiRead: true,
      aiAssistant: true,
      aiInsights: true,
      aiSuggestions: true,
      multiCompany: true,
      dedicatedSuccess: true,
    },
    cta: {
      label: 'Beratung anfragen',
      path: '/request-access',
    },
  },
};

const FEATURE_MATRIX = [
  {
    key: 'bankReconciliation',
    label: 'Bankabgleich & Kontoumsatzprüfung',
  },
  {
    key: 'auditTrail',
    label: 'Audit Trail & Änderungsnachweise',
  },
  {
    key: 'exports',
    label: 'Exports für Steuerberatung (CSV/PDF)',
  },
  {
    key: 'aiRead',
    label: 'KI-Auswertungen (nur Beratung)',
  },
  {
    key: 'aiAssistant',
    label: 'KI-Assistent (Frage-Antwort)',
  },
  {
    key: 'multiCompany',
    label: 'Mehrere Unternehmen verwalten',
  },
  {
    key: 'dedicatedSuccess',
    label: 'Dedizierte Einführung & Success',
  },
];

const PRICING_COPY = {
  eyebrow: 'Preise & Pläne',
  headline: 'Preise, die Vertrauen schaffen.',
  subhead:
    'Konservativ kalkuliert, nachvollziehbar erklärt und auf deutsche Buchhaltungsprozesse ausgelegt. Alle Pläne bieten Audit Trail, sichere Datenhaltung in der EU und klare Verantwortlichkeiten.',
  trustHighlights: [
    'DSGVO-konforme Verarbeitung und EU-Hosting',
    'Audit Trail mit nachvollziehbaren Änderungsnachweisen',
    'Rollenbasierte Zugriffssteuerung für Teams',
  ],
  ctaPrimary: 'Zugang anfragen',
  ctaSecondary: 'Zur Startseite',
  comparisonTitle: 'Funktionsvergleich',
  comparisonNote: 'Ausbau und individuelle Limits sind jederzeit möglich.',
  customTitle: 'Individuelle Einführung gewünscht?',
  customBody:
    'Gemeinsam definieren wir Plan, Governance und Rollout – ohne Überversprechen oder intransparente Vertragsklauseln.',
  customCta: 'Beratung anfragen',
  customEmail: 'sales@smartaccounting.de',
  legalNotes: [
    'Es wird keine DATEV-, ELSTER- oder Finanzamt-Zertifizierung oder -Übermittlung zugesichert.',
    'KI-Funktionen liefern ausschließlich beratende Hinweise und ersetzen keine fachliche Prüfung.',
  ],
};

module.exports = {
  PLAN_ORDER,
  PLAN_ALIASES,
  PLAN_CATALOG,
  FEATURE_MATRIX,
  PRICING_COPY,
};
