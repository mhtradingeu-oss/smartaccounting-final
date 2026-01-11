# GOBD_COMPLIANCE_STATEMENT

Dieses Statement basiert ausschließlich auf den im Repository dokumentierten Datenbankschemata; ORM-Modelle oder Services werden nur insofern berücksichtigt, als sie sich in Constraint-Definitionen und Spaltenkonfigurationen widerspiegeln.

## 1. Nachweis der GoBD-Anforderungen

### Unveränderbarkeit

- Die Tabelle `audit_logs` (database/migrations/20251225000400-create-audit-logs.js:5) protokolliert `timestamp`, `oldValues`, `newValues`, `hash` und `previousHash` für jeden Änderungsversuch; jede Zeile enthält zudem den verantwortlichen `userId`, den `resourceType`/`resourceId` und einen Default-`reason`, sodass der ursprüngliche Zustand nachvollziehbar bleibt.
- Mit der Ergänzung der Spalte `immutable` (database/migrations/20260106000000-add-audit-log-immutable.js:5) und der CHECK-Bedingung `immutable IS TRUE` plus Default-`CURRENT_TIMESTAMP` für `createdAt`/`updatedAt` (database/migrations/20260109001000-lock-audit-immutability.js:6) ist jede Audit-Zeile dauerhaft auf TRUE fixiert, wodurch nachträgliche Modifikationen oder das Zurücksetzen auf `false` scheitern.
- Die Audit-Tabelle verwaltet seit der Nachrüstung von `companyId`, `requestId` und `metadata` (database/migrations/20260112000000-add-audit-log-company-requestid.js:13) obligatorisch die zugehörige Firma, eine fortlaufende Request-ID sowie optionale Metadaten, was revisionssichere Schreibvorgänge ermöglicht.

### Nachvollziehbarkeit

- Sämtliche Buchungssätze und Stammdaten referenzieren Benutzer und Firmen: `expenses` speichern `userId`, `companyId` und seit der Übergangsphase `createdByUserId` mit `onDelete CASCADE` (database/migrations/20251227000000-extend-demo-schema.js:18) sowie nicht mehr nullbare Beziehungen (database/migrations/20260109000000-lock-expenses-accountability.js:7), `invoices` und `invoice_items` zitieren `users`, `companies` und `invoices` (database/migrations/20251225000500-create-invoices.js:41, database/migrations/20251225000600-create-invoice-items.js:18) und `transactions` sind über `company_id`, `user_id` und `bank_transaction_id` eindeutig verknüpft (database/migrations/20251228000100-create-transactions.js:19).
- Die Audit-Entries liefern neben `timestamp` auch `resourceType`, `resourceId` sowie `requestId` und `metadata` (database/migrations/20260112000000-add-audit-log-company-requestid.js:24), sodass beliebige Änderungen einem konkreten Anfragekontext zugeordnet werden können.

### Vollständigkeit

- Die Auswertung von Beträgen folgt festen Regeln: Das Constraint-Set `expenses_net_vat_gross_consistency`, `invoice_items_line_consistency` und `transactions_vat_credit_debit_checks` stellt sicher, dass alle erforderlichen Felder befüllt, nicht-negativ und logisch miteinander verknüpft sind (database/migrations/20260108001000-add-financial-integrity-checks.js:3).
- Vor diesem Constraint wurden in der `expenses`-Tabelle alle historischen Null-Werte auf gültige Defaults zurückgeführt und `netAmount`/`vatAmount`/`grossAmount`/`vatRate` mit Mandatory-Checks ausgestattet, sodass bei bestehender Buchung keine Felder ohne Wert bleiben (database/migrations/20260110000000-lock-expenses-accountability-and-vat.js:1).
- Die erweiterte `tax_reports`-Tabelle bewahrt neben dem Berichtstyp und Status auch strukturierte `data` (JSON), `generatedAt`/`submittedAt`, den verantwortlichen `submittedBy` sowie ELSTER-bezogene Metadaten als interne Workflow-Daten, ohne eine tatsächliche ELSTER-Einreichung zu behaupten (database/migrations/20251228000200-update-tax-reports-schema.js:29).

### Richtigkeit

- Die Basistabellen `invoices` und `invoice_items` verlangen eindeutige Rechnungsnummern und Pflichtfelder wie `subtotal`, `total`, `vatRate` sowie `lineNet`/`lineVat`/`lineGross`, sodass abweichende oder falsch zusammengesetzte Belege physisch nicht gespeichert werden können (database/migrations/20251225000500-create-invoices.js:11, database/migrations/20251225000600-create-invoice-items.js:9).
- Für jede Transaktion ist `transaction_date` zwingend und `amount` darf nicht negativ sein; `vat_rate`/`vat_amount` werden über Default-Werte plus Integritätscheck validiert, so dass jede Buchung korrekt mit ihrer VAT-Logik verknüpft ist (database/migrations/20251228000100-create-transactions.js:39).
- Die Tax-Reports akzeptieren nur definierte Statuswerte (database/migrations/20260109002000-lock-tax-report-status.js:7) und schreiben Datum/Uhrzeit für Erstellung und interne Statuswechsel fest; dies beschreibt Workflow-Zustände, keine externe Übermittlung (database/migrations/20251228000200-update-tax-reports-schema.js:38).

### Zeitgerechte Buchung

- `transactions.created_at`/`updated_at` sowie `audit_logs.createdAt`/`updatedAt` basieren auf `CURRENT_TIMESTAMP` (database/migrations/20251228000100-create-transactions.js:107, database/migrations/20260109001000-lock-audit-immutability.js:6), womit jeder Buchungsvorgang und jede Audit-Änderung sofort mit dem aktuellen Zeitpunkt dokumentiert wird.
- Jede Buchung verlangt ein `transaction_date` (database/migrations/20251228000100-create-transactions.js:39), Bankauszugimporte erfassen ein verpflichtendes `importDate` (database/migrations/20251227000000-extend-demo-schema.js:134) und die VAT-Reports führen `generatedAt`/`submittedAt` (database/migrations/20251228000200-update-tax-reports-schema.js:38), wodurch alle Datenströme zeitnah verbucht bleiben.
- Audit-Logs notieren `timestamp` bei jeder Eintragung (database/migrations/20251225000400-create-audit-logs.js:41) und verhindern damit verzögerte oder nachträgliche Erfassung unhistorischer Zustände.

## 2. Verfahrensbeschreibung

### Expenses

Jede Spesenbuchung wird unmittelbar mit `expenseDate`, `category`, `netAmount`, `vatAmount`, `grossAmount` und `vatRate` festgehalten (database/migrations/20251227000000-extend-demo-schema.js:32), einem festen `status` von `draft` (database/migrations/20251227000000-extend-demo-schema.js:60) und der Quelle `manual` (database/migrations/20251227000000-extend-demo-schema.js:65). Nachträgliche Veränderungen müssen von einem identifizierten Benutzer (`createdByUserId`, spätestens auf non-null gesetzt durch database/migrations/20260109000000-lock-expenses-accountability.js:7) vorgenommen werden, und die oben beschriebene CHECK-Kette verhindert unvollständige oder rechenlogisch falsche Beträge (database/migrations/20260108001000-add-financial-integrity-checks.js:3).

### Invoices

Rechnungen werden mit zwingenden Feldern wie `invoiceNumber`, `subtotal`, `total`, `currency`, `status` (ENUM-Werte) und einem `date` verfasst (database/migrations/20251225000500-create-invoices.js:11). Der Beleg ist auf Firma und Benutzer festgelegt (`companyId`/`userId`, database/migrations/20251225000500-create-invoices.js:41) und kann über optionale `dueDate`, `clientName` und `notes` erweitert werden (database/migrations/20251227000000-extend-demo-schema.js:5). Alle Positionen sind in `invoice_items` mit `lineNet`/`lineVat`/`lineGross` definiert, sodass keine Rechnung ohne vollständige Summen gespeichert wird (database/migrations/20251225000600-create-invoice-items.js:9).

### VAT

Alle Mehrwertsteuerangaben werden entweder über `transactions` (`vat_rate`, `vat_amount`, `amount`) oder über die automatisierten `expenses`-Summen erfasst; beide Tabellen sind an Firmen und Benutzer gebunden und erlauben nur valide Kombinationen (database/migrations/20260108001000-add-financial-integrity-checks.js:3). Das monatliche Reporting speichert den vollständigen Datensatz im JSON-`data`-Feld, dokumentiert `generatedAt`/`submittedAt` und schreibt den verantwortlichen Mitarbeiter in `submittedBy`, sodass eine durchgängige VAT-Auditspur vorliegt (database/migrations/20251228000200-update-tax-reports-schema.js:29).

### Audit Logs

Jeder Schreibzugriff erzeugt einen Audit-Eintrag mit `action`, `resourceType`, `resourceId`, `oldValues`, `newValues`, `userId`, `companyId` und `requestId` (database/migrations/20251225000400-create-audit-logs.js:5, database/migrations/20260112000000-add-audit-log-company-requestid.js:13). Die Einträge erhalten Hash- und Vorheriger-Hash-Ketten (database/migrations/20251225000400-create-audit-logs.js:61) und bleiben durch `immutable` fest auf TRUE gesetzt (database/migrations/20260106000000-add-audit-log-immutable.js:5), weshalb jeder Audit-Datensatz gegen missbräuchliche Änderung geschützt und jederzeit nachvollziehbar ist.

## 3. Schutz gegen Manipulation

- Die Datenbank erzwingt über `immutable`-Checks und Default-Timestamps, dass Audit-Logs weder nachträglich zurückgesetzt noch ohne Zeitstempel editiert werden können (database/migrations/20260109001000-lock-audit-immutability.js:6).
- Die Hash-Kette (`hash`, `previousHash`) in Kombination mit `requestId`/`companyId` verhindert das heimliche Überschreiben oder Entfernen von Audit-Einträgen, da jeder Eintrag eine schreibgeschützte Verbindung zu seinem Vorgänger erhält (database/migrations/20251225000400-create-audit-logs.js:61, database/migrations/20260112000000-add-audit-log-company-requestid.js:24).
- Spread-Summen und Status-Enum-Checks in `expenses`, `invoices`, `transactions` und `tax_reports` verbieten stille Änderungen, da inkonsistente Beträge, leere `status`-Werte oder nicht definierte Tax-Report-Zustände nicht gespeichert werden dürfen (database/migrations/20260108001000-add-financial-integrity-checks.js:3, database/migrations/20260109002000-lock-tax-report-status.js:7).

Basierend auf den implementierten Kontrollen belegt dieses Dokument, dass die GoBD-relevanten Datenstrukturen und Audit-Prinzipien im System verankert sind; eine externe Zertifizierung oder behördliche Bestätigung wird nicht behauptet.
