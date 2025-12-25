# scripts/

Automation and operational scripts for SmartAccounting.

- `auth-readiness.js` — Checks authentication readiness
- `check-migrations.js` — Verifies DB migrations
- `ops/` — Operational scripts for backup, restore, and verification

**Purpose:**

- Used for DevOps, CI/CD, and operational automation
- Not required at runtime, but essential for maintenance and compliance

**Note:**

- Scripts should be documented and safe to run in dev/prod
- No secrets or credentials should be present in scripts
