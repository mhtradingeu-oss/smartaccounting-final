# Log Inspection Playbook

## Goal
Rapidly surface application errors, auditing signals, and infrastructure events without mutating records.

## Procedure
1. Gather the time window and affected service (backend, worker, AI engine).
2. Use the health endpoints (`/health`, `/api/system/info`, `/api/system/version`) to confirm service metadata before diving into logs.
3. Pull structured server logs from the container with `docker compose logs backend --since 15m --tail 200`. Include `--follow` if you are monitoring in real time.
4. For persisted audit or telemetry issues, download the `GET /api/exports/audit-logs?format=json&from=<ISO>&to=<ISO>` export to inspect `hash`, `previousHash`, and reason fields.
5. Link log lines to correlation IDs by cross-referencing `requestId` headers emitted in structured logs.

## Command examples
```bash
# Tail backend logs for the last 200 entries
docker compose logs backend --tail 200

# Inspect Kubernetes logs (if deployed in k8s)
kubectl logs -l app=smartaccounting -n production --tail=100

# Download audit logs for a given day
curl -H "Authorization: Bearer $TOKEN" -G "https://mydomain/api/exports/audit-logs" \
  --data-urlencode "format=json" \
  --data-urlencode "from=2025-02-01T00:00:00Z" \
  --data-urlencode "to=2025-02-01T23:59:59Z" > /tmp/audit-export.json

# Inspect logs quickly with jq
jq '.logs[] | {id, action, reason, timestamp}' /tmp/audit-export.json
```

## Notes
- Fix GCL/GCP/LogRocket exports for long-term retention; download them regularly as part of the backup run book.
- Always avoid editing logs directly; treat them as immutable evidence for compliance.
