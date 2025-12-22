# SmartAccounting – System Audit & Remediation Plan
## Version 1.0 – December 2025

---

# 1. Executive Summary

A full-system audit of the existing SmartAccounting codebase identified **critical architectural, runtime, security, and design failures** across backend, frontend, DevOps, and data layers.

These issues make the current implementation:
- **Unreliable**
- **Unscalable**
- **Non-compliant**
- **Not production-ready**

Before proceeding with the new architecture, the old codebase must be deprecated or corrected based on this remediation plan.

Key findings include:

### Critical Failures:
- Missing middleware exports causing server startup crashes.
- Backend services referencing **non-existent database columns**.
- Frontend calling **API routes that do not exist**.
- Broken authentication and routing.
- Hardcoded secrets and insecure token storage.
- No CI/CD, no migrations, and DB schema drift due to sequelize.sync.

The system in its current form cannot be deployed in a production-grade environment and requires immediate refactoring per this document.

---

# 2. Critical Backend Issues

## 2.1 Missing Middleware / Broken Auth System
Files:
- `src/routes/system.js`
- `src/routes/emailTest.js`
- `src/routes/users.js`
- `src/middleware/auth.js`

They call functions such as:
- `authorize`
- `requireRole`
- `requireAdmin`

But these functions are **NOT exported** from:
