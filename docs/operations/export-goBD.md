# Auditor-ready exports mapped to GoBD

| Requirement | Export | Endpoint | Notes |
| --- | --- | --- | --- |
| Immutable audit trail | Audit logs (JSON + CSV) | `GET /api/exports/audit-logs` | Returns hashed entries filtered by `companyId` + optional `from`/`to`. JSON contains all fields; CSV mirrors the same columns. Sample JSON/CSV in `docs/operations/export-samples/audit-logs-example.*`. |
| Accounting journaling | Accounting records | `GET /api/exports/accounting-records` | Returns invoices and expenses grouped by company and time range; CSV summary includes record type, amounts, and embedded payload metadata. Sample JSON in `docs/operations/export-samples/accounting-records-example.json`. |
| VAT evidence | VAT summaries | `GET /api/exports/vat-summaries` | Pulls `tax_reports` entries so filings can be verified against `UStVA` data; includes `generatedAt`, `submittedAt`, and the raw `data` payload. Sample path `docs/operations/export-samples/vat-summaries-example.json`. |
| Decision traceability | AI decisions + explanations | `GET /api/exports/ai-decisions` | Lists each insight with its `summary`, `why`, `legalContext`, and decisions. CSV includes one row per decision to simplify offline review. Sample JSON is `docs/operations/export-samples/ai-decisions-example.json`. |

## Safety guardrails
- All exports are **read-only GET** endpoints with `authenticate` + `requireRole(['auditor'])` so only trusted roles consume the files.
- Company scope is enforced through `req.companyId`; each query filters data accordingly or joins to keep other tenants isolated.
- Optional `from` and `to` query parameters guarantee time-bounded slices for auditors wanting a specific fiscal period.
- No endpoint mutates data; the API returns cached/exported data from existing models without triggering business logic.

## CSV guidance
- CSV outputs are sanitized via `serializeCsv()` and quoted so auditor tooling can import them directly.
- Clients should set `format=csv` when downloading ledger-friendly snapshots and can pair them with the JSON export for richer context (e.g., `payload` fields).

## Sample output
- Refer to `docs/operations/export-samples/` for concrete JSON/CSV payloads that match the new endpoints.
