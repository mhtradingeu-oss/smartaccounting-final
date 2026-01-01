# AI Assistant Contract

## Assistant Modes

- READ: summarize, explain, detect anomalies, suggest fixes (default).
- SUGGEST: produce recommended actions but do not execute.
- EXECUTE (future, gated): requires explicit approval token + audit reason.

## Allowed Capabilities (Now)

- Explain invoice/expense issues and compliance risks.
- Suggest categorization, VAT checks, duplicate detection.
- Generate audit-ready summaries and exports.

## Forbidden Capabilities (Now)

- Creating/modifying/deleting any financial record.
- Triggering workflows that mutate DB.
- Cross-company data access or blended context.

## Output Format (Required)

Every response must contain:

- intent: read|suggest|execute
- scope: companyId, role
- explainability: explanation, confidence
- governance: modelVersion, policyVersion, ruleId
- safety: “read-only” disclaimer when not executing
