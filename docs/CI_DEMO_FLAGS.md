# CI/DEMO Mode Flags

To run SmartAccounting in CI or demo mode, set the following environment variables:

```
export SMARTACCOUNTING_CI=true
export DEMO_MODE=true
export ALLOW_DEMO_SEED=true
```

These flags are required for safe demo seeding and automated test environments.

- `DEMO_MODE=true` enables demo features and disables production-only logic.
- `ALLOW_DEMO_SEED=true` allows demo data to be seeded.
- `SMARTACCOUNTING_CI=true` signals CI/test automation context.

See scripts/seed-demo-prod.js for enforcement details.
