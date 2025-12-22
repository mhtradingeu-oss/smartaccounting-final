
# SmartAccounting — FINAL RELEASE RUNBOOK
Version: v1.0.0  
Status: Production-Ready  
Audience: Founder, CTO, DevOps, QA, Investors  
Language: English  
Last Updated: 2025

---

## 0. PURPOSE OF THIS DOCUMENT

This document is the **single source of truth** for:

- Verifying SmartAccounting is 100% production-ready
- Running **secure technical audits**
- Testing the full application (backend, frontend, AI, security)
- Validating Docker and deployment artifacts
- Confirming legal, compliance, and documentation readiness
- Deploying safely to a production server
- Preparing for commercial launch (Germany / EU)

❗ **Rule**:  
Do NOT skip steps.  
Do NOT deploy unless all gates are marked **PASS**.

---

## 1. PRE-FLIGHT CHECKLIST (MANDATORY)

Before starting:

- [ ] You are on the correct Git branch (e.g. `main`)
- [ ] Working tree is clean (`git status`)
- [ ] You have Docker installed (latest)
- [ ] You have Node.js LTS installed
- [ ] You have access to the production domain & server (later step)

---

## 2. PHASE A — DOCKER CLEANUP & RESET

### Goal
Ensure **no old images, containers, volumes, or caches** exist.

### Commands
```bash
docker ps -a
docker images
docker volume ls

docker stop $(docker ps -aq) || true
docker rm $(docker ps -aq) || true
docker rmi -f $(docker images -aq) || true
docker volume rm $(docker volume ls -q) || true
docker system prune -af

Gate A

 No containers running

 No old images

 No orphan volumes

➡️ Gate A Result: PASS / FAIL

3. PHASE B — FULL SHELL / CODE AUDIT
Goal

Verify code health, tests, and dependencies.

Commands
git status
npm ci
npm run lint
npm test


Frontend:

cd client
npm ci
npm run lint --max-warnings=0
npm run build
npm run test
cd ..

Additional Checks
npm audit

Gate B

 No failing tests

 No skipped tests

 Lint passes

 Build passes

 No critical vulnerabilities

➡️ Gate B Result: PASS / FAIL

4. PHASE C — DOCKER PRODUCTION BUILD VERIFICATION
Goal

Ensure Docker build equals production behavior.

Commands
docker build -t smartaccounting:prod .
docker run -p 3000:3000 smartaccounting:prod


Test in browser:

http://localhost:3000

Validate

App loads

API responds

No console errors

No debug logs

Gate C

 Docker build successful

 App works inside container

➡️ Gate C Result: PASS / FAIL

5. PHASE D — SECURITY & PERMISSION AUDIT
Goal

Ensure zero security bypasses.

Manual Tests

Try accessing endpoints without auth

Try cross-company access

Try AI mutation prompts

Try role escalation

Confirm

401 / 403 correctly returned

AI is read-only

Company isolation enforced

Gate D

 No unauthorized access

 No cross-company leakage

 AI mutation impossible

➡️ Gate D Result: PASS / FAIL

6. PHASE E — FULL USER FLOW TEST (UI)
Goal

Test the app like a real customer.

Checklist

 Register user

 Login

 Create company

 Create invoice

 Change invoice status

 View analytics

 Use AI insights

 Logout / relogin

Gate E

 All flows work

 No crashes

 UX understandable

➡️ Gate E Result: PASS / FAIL

7. PHASE F — WEBSITE & LANDING PAGE AUDIT
Goal

Ensure public-facing readiness.

Required Pages

Landing page

Pricing

Terms & Conditions

Privacy Policy (GDPR)

Documentation / Help

Contact

Decision

If not implemented → create before launch

Gate F

 All pages exist

 Content is accurate

 No legal claims mismatch

➡️ Gate F Result: PASS / FAIL

8. PHASE G — DOCUMENTATION FINALIZATION
Required Docs

SYSTEM_GUARANTEES.md

AI_READINESS.md

COMPLIANCE_SECURITY_SUMMARY.md

ARCHITECTURE_OVERVIEW

USER_GUIDE

API_DOCS

INVESTOR_OVERVIEW

Gate G

 Docs complete

 Docs updated

 No contradictions

➡️ Gate G Result: PASS / FAIL

9. PHASE H — PRODUCTION DEPLOYMENT
Steps

Setup server

Install Docker

Pull repository

Build production image

Configure env vars

Setup SSL

Setup monitoring

Commands (example)
docker compose up -d --build

Gate H

 App reachable via domain

 HTTPS enabled

 Logs clean

➡️ Gate H Result: PASS / FAIL

10. FINAL GO / NO-GO DECISION
ALL gates must be PASS.

If YES:
✅ Tag release: v1.0.0-production
✅ Announce launch
✅ Start sales & marketing

If NO:
❌ Fix issues
❌ Repeat affected phase

11. WHAT COMES NEXT (OPTIONAL)

Investor pitch

Marketing campaign

v1.1 roadmap

ELSTER / DATEV execution (optional)

FINAL STATEMENT

SmartAccounting is designed to be:

Audit-safe

AI-governed

Regulation-ready

Enterprise-grade

This runbook ensures zero guesswork and maximum confidence.

END OF DOCUMENT