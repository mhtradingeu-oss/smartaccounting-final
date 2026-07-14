'use strict';

const ROW_TYPES = Object.freeze({
  ACCOUNT_SUM: 'ACCOUNT_SUM',
  FORMULA: 'FORMULA',
});

function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }

  return value;
}

const SKR03_BWA_01_V1 = deepFreeze({
  id: 'de-bwa-01-skr03',
  version: 1,
  jurisdiction: 'DE',
  chartSystem: 'SKR03',
  fiscalYearMode: 'calendar_year',
  title: 'Betriebswirtschaftliche Auswertung',
  preliminary: true,
  rows: [
    {
      id: 'umsatzerloese',
      label: 'Umsatzerlöse',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [
        {
          roles: ['revenue_19', 'revenue_7'],
          accountCodes: ['8400', '8300'],
        },
      ],
    },
    {
      id: 'bestandsveraenderungen',
      label: 'Bestandsveränderungen',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'aktivierte_eigenleistungen',
      label: 'Aktivierte Eigenleistungen',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'gesamtleistung',
      label: 'Gesamtleistung',
      type: ROW_TYPES.FORMULA,
      formula: [
        { rowId: 'umsatzerloese', factor: 1 },
        { rowId: 'bestandsveraenderungen', factor: 1 },
        { rowId: 'aktivierte_eigenleistungen', factor: 1 },
      ],
    },
    {
      id: 'material_wareneinkauf',
      label: 'Material-/Wareneinkauf',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'rohertrag',
      label: 'Rohertrag',
      type: ROW_TYPES.FORMULA,
      formula: [
        { rowId: 'gesamtleistung', factor: 1 },
        { rowId: 'material_wareneinkauf', factor: -1 },
      ],
    },
    {
      id: 'sonstige_betriebliche_erloese',
      label: 'Sonstige betriebliche Erlöse',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'betrieblicher_rohertrag',
      label: 'Betrieblicher Rohertrag',
      type: ROW_TYPES.FORMULA,
      formula: [
        { rowId: 'rohertrag', factor: 1 },
        {
          rowId: 'sonstige_betriebliche_erloese',
          factor: 1,
        },
      ],
    },
    {
      id: 'personalkosten',
      label: 'Personalkosten',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'raumkosten',
      label: 'Raumkosten',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [
        {
          roles: ['rent_expense'],
          accountCodes: ['4210'],
        },
      ],
    },
    {
      id: 'betriebliche_steuern',
      label: 'Betriebliche Steuern',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'versicherungen_beitraege',
      label: 'Versicherungen / Beiträge',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'fahrzeugkosten',
      label: 'Fahrzeugkosten',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'werbe_reisekosten',
      label: 'Werbe- / Reisekosten',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'kosten_warenabgabe',
      label: 'Kosten der Warenabgabe',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'abschreibungen',
      label: 'Abschreibungen',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'reparatur_instandhaltung',
      label: 'Reparatur / Instandhaltung',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'sonstige_kosten',
      label: 'Sonstige Kosten',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [
        {
          roles: [
            'general_expense',
            'other_operating_expense',
          ],
          accountCodes: ['4930', '4980'],
        },
      ],
    },
    {
      id: 'summe_kosten',
      label: 'Summe Kosten',
      type: ROW_TYPES.FORMULA,
      formula: [
        { rowId: 'personalkosten', factor: 1 },
        { rowId: 'raumkosten', factor: 1 },
        { rowId: 'betriebliche_steuern', factor: 1 },
        {
          rowId: 'versicherungen_beitraege',
          factor: 1,
        },
        { rowId: 'fahrzeugkosten', factor: 1 },
        { rowId: 'werbe_reisekosten', factor: 1 },
        { rowId: 'kosten_warenabgabe', factor: 1 },
        { rowId: 'abschreibungen', factor: 1 },
        {
          rowId: 'reparatur_instandhaltung',
          factor: 1,
        },
        { rowId: 'sonstige_kosten', factor: 1 },
      ],
    },
    {
      id: 'betriebsergebnis',
      label: 'Betriebsergebnis',
      type: ROW_TYPES.FORMULA,
      formula: [
        { rowId: 'betrieblicher_rohertrag', factor: 1 },
        { rowId: 'summe_kosten', factor: -1 },
      ],
    },
    {
      id: 'neutraler_aufwand',
      label: 'Neutraler Aufwand',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'neutraler_ertrag',
      label: 'Neutraler Ertrag',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'ergebnis_vor_steuern',
      label: 'Ergebnis vor Steuern',
      type: ROW_TYPES.FORMULA,
      formula: [
        { rowId: 'betriebsergebnis', factor: 1 },
        { rowId: 'neutraler_aufwand', factor: -1 },
        { rowId: 'neutraler_ertrag', factor: 1 },
      ],
    },
    {
      id: 'steuern_einkommen_ertrag',
      label: 'Steuern Einkommen und Ertrag',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
    {
      id: 'vorlaeufiges_ergebnis',
      label: 'Vorläufiges Ergebnis',
      type: ROW_TYPES.FORMULA,
      formula: [
        { rowId: 'ergebnis_vor_steuern', factor: 1 },
        {
          rowId: 'steuern_einkommen_ertrag',
          factor: -1,
        },
      ],
    },
  ],
});

module.exports = {
  ROW_TYPES,
  SKR03_BWA_01_V1,
  deepFreeze,
};
