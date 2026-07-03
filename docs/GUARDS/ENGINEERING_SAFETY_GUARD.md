# SmartAccounting Engineering Safety Guard

This file is the mandatory guardrail for all future development phases.

## Non-negotiable workflow

Every phase must follow this order:

1. Truth scan first
2. Classify findings
3. Decide patch or no-patch
4. Patch only the smallest safe scope
5. Syntax validation
6. Targeted tests
7. Runtime smoke when routes/features are touched
8. Full status check
9. Commit only reviewed files
10. Push
11. Lock report

Do not skip scan.
Do not patch blindly.
Do not use risky broad replacements.
Do not edit unrelated files.
Do not commit raw logs, secrets, tokens, private env files, or huge terminal dumps.

## Terminal safety

Use safe commands.
Prefer `grep`, `nl -ba`, `sed -n`, `git diff`, `node -c`, targeted tests.
Avoid destructive shell commands unless explicitly reviewed.
Never run broad deletion commands without listing targets first.
Never overwrite generated files unless the exact target is known.

## Tax / DATEV / ELSTER wording guard

Allowed wording:

- DATEV-compatible export preparation
- Prepare export
- Download for Steuerberater review
- UStVA preparation data
- ELSTER preparation
- No direct submission
- No certification
- Review with qualified Steuerberater

Forbidden wording unless an official integration is actually implemented and legally reviewed:

- DATEV certified
- ELSTER connected
- Submit to ELSTER
- Send to Finanzamt
- Tax filing completed
- Officially filed
- Direct DATEV upload
- Automatic tax submission

## Runtime route guard

Direct tax/ELSTER submission routes must stay disabled unless a dedicated future official integration phase is approved.

Expected safe behavior:

- `/api/tax-bridge/readiness` returns `mode:"preparation_only"`
- `/api/vat/ustva` returns `mode:"preparation_only"` and `X-Export-Disclaimer`
- `/api/exports/datev` returns `X-Export-Disclaimer`
- `/api/elster/*` returns disabled/501
- `/api/tax-reports/*` returns disabled/501
- direct German tax submit routes return disabled/501

## Commit guard

Before every commit:

```bash
git status --branch --short
git diff --stat
git diff --name-only
git diff --cached --stat
git diff --cached --name-only

Only stage files belonging to the current phase.

Required quality gates

Minimum gates unless phase scope says otherwise:

npm run runtime:check
npm run env:check
npm run voice:check
npm run lint

Frontend changes also require:

npm run build --prefix client

Tax Bridge / DATEV / VAT changes require:

npm run test --prefix client -- src/pages/__tests__/TaxBridge.test.jsx src/tests/routeConfig.test.jsx src/tests/sidebar.test.jsx
npx jest tests/vatUstva.test.js tests/routes/taxBridgeReadiness.test.js tests/routes/datevExport.test.js tests/datev/datev.formatter.test.js --runInBand
Definition of done

A phase is complete only when:

The actual current system state is known.
Any patch is scoped and reviewed.
Tests/build/smoke match the touched area.
git status is clean.
Commit is pushed.
A short lock note exists in the chat or docs.
