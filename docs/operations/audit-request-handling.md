# Audit Request Handling

## Purpose
Process external audit requests in a way that keeps GoBD traceability intact and demonstrates legal defensibility.

## Steps
1. **Authenticate the request** by verifying the auditor's identity (signed letter, audit ID) and log the request in the compliance tracker.
2. **Determine scope & timeframe.** Document company ID, fiscal period, and specific audit area (journal, VAT, AI decisions).
3. **Use the export endpoints** to pull read-only data:
   - `/api/exports/audit-logs` for hashed entries.
   - `/api/exports/accounting-records` for journals.
   - `/api/exports/vat-summaries` for UStVA data.
   - `/api/exports/ai-decisions` for AI explainability.
4. **Verify the exported data** matches GoBD expectations (hash chain is intact, `records` contain invoice/expense data). Use the verification checklist in `docs/operations/backup-restore.md` to show the dataset was consistent.
5. **Share data via secure channel**, encrypting the export if it contains sensitive fields. Include metadata (export time, filters applied, environment, `buildMetadata.commitHash`).
6. **Document the response** in the compliance log, referencing the release tag and export file paths for future audits.

## Command examples
```bash
# Download VAT summaries for January
curl -H "Authorization: Bearer $TOKEN" -G "https://mydomain/api/exports/vat-summaries" \
  --data-urlencode "format=json" \
  --data-urlencode "from=2025-01-01T00:00:00Z" \
  --data-urlencode "to=2025-01-31T23:59:59Z" \
  -o vat-summary-jan2025.json

# Provide auditors with CSV journal snapshot
curl -H "Authorization: Bearer $TOKEN" -G "https://mydomain/api/exports/accounting-records" \
  --data-urlencode "format=csv" \
  --data-urlencode "from=2025-01-01" \
  --data-urlencode "to=2025-01-31" \
  > january-journal.csv
```
