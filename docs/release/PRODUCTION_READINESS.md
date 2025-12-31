# Production Readiness: Environment Variable Inventory

## Backend Environment Variables

| Name                          | Required | Default / Example          | Description / Notes                             |
| ----------------------------- | -------- | -------------------------- | ----------------------------------------------- |
| NODE_ENV                      | Yes      | development                | Node environment: development, production, test |
| PORT                          | Yes      | 5000                       | Port for backend server                         |
| DATABASE_URL                  | Yes      | sqlite:database/dev.sqlite | DB connection string (scheme required)          |
| JWT_SECRET                    | Yes      |                            | JWT signing secret (min 32 chars in prod)       |
| FRONTEND_URL                  | Yes      | http://localhost:3000      | Public client URL (must be valid URL)           |
| EMAIL_HOST                    | No       |                            | SMTP host                                       |
| EMAIL_USER                    | No       |                            | SMTP user                                       |
| EMAIL_PASS                    | No       |                            | SMTP password                                   |
| STRIPE_SECRET_KEY             | No       |                            | Stripe API key                                  |
| ELSTER_CERTIFICATE_PATH       | No       |                            | Path to Elster cert                             |
| REDIS_URL                     | No       |                            | Redis connection string                         |
| CACHE_TTL                     | No       |                            | Cache time-to-live                              |
| LOG_LEVEL                     | No       | info (prod), debug (dev)   | Logging verbosity                               |
| METRICS_ENABLED               | No       | false                      | Enable metrics snapshot                         |
| REQUEST_LOGGING               | No       | true                       | Enable HTTP request logs                        |
| LOG_SLOW_REQUEST_MS           | No       | 1000                       | Slow request warning threshold (ms)             |
| USE_SQLITE                    | No       | false                      | Use SQLite instead of other DB                  |
| DB_POOL_MAX                   | No       | 10                         | DB pool max connections                         |
| DB_POOL_MIN                   | No       | 0                          | DB pool min connections                         |
| DB_POOL_ACQUIRE               | No       | 30000                      | DB pool acquire timeout (ms)                    |
| DB_POOL_IDLE                  | No       | 10000                      | DB pool idle timeout (ms)                       |
| DB_SSL                        | No       | false                      | Enable DB SSL                                   |
| SEQUELIZE_LOGGING             | No       | false                      | Enable Sequelize SQL logging                    |
| OCR_PREVIEW_ENABLED           | No       | false                      | Enable OCR preview                              |
| BANK_IMPORT_ENABLED           | No       | false                      | Enable bank import                              |
| AI_ASSISTANT_ENABLED          | No       | true                       | Enable AI assistant features                    |
| AUTH_RATE_LIMIT_RESET_ENABLED | No       | false                      | Enable auth rate limit reset                    |
| TRUST_PROXY                   | No       | false                      | Trust proxy headers                             |
| API_BASE_URL                  | No       | /api                       | API route prefix                                |
| HOST                          | No       | 0.0.0.0                    | Host for backend server                         |
| BUILD_TIME                    | No       |                            | Build timestamp                                 |
| GIT_COMMIT                    | No       |                            | Git commit SHA                                  |
| BUILD_COMMIT_SHA              | No       |                            | Build commit SHA                                |
| BUILD_TIMESTAMP               | No       |                            | Build timestamp                                 |
| BUILD_IMAGE_DIGEST            | No       |                            | Docker image digest                             |
| DOCKER_IMAGE_DIGEST           | No       |                            | Docker image digest                             |
| SQLITE_STORAGE_PATH           | No       | database/dev.sqlite        | Path for SQLite DB file                         |

## Client Environment Variables

| Name                        | Required | Default / Example | Description / Notes                            |
| --------------------------- | -------- | ----------------- | ---------------------------------------------- |
| VITE_API_URL                | Yes      | /api              | API endpoint for client                        |
| VITE_APP_ENV                | Yes      | development       | App environment: development, production, test |
| VITE_STRIPE_PUBLISHABLE_KEY | No       |                   | Stripe publishable key for frontend            |
| VITE_DEMO_MODE              | No       | false             | Enable demo mode                               |
| VITE_BANK_IMPORT_ENABLED    | No       | false             | Enable bank import feature                     |
| VITE_OCR_PREVIEW_ENABLED    | No       | false             | Enable OCR preview                             |
| VITE_AI_ASSISTANT_ENABLED   | No       | true              | Enable AI assistant features                   |
| VITE_DISABLE_LOGIN          | No       | false             | Disable login (for demo/test)                  |

## Server-only Secrets That Must NOT Leak to Client

| Name                    |
| ----------------------- |
| JWT_SECRET              |
| JWT_REFRESH_SECRET      |
| DATABASE_URL            |
| STRIPE_SECRET_KEY       |
| EMAIL_USER              |
| EMAIL_PASS              |
| REDIS_URL               |
| ELSTER_CERTIFICATE_PATH |
| CACHE_TTL               |
| FRONTEND_URL            |

- These must never be exposed in the client build. See client/src/lib/envGuards.js for runtime checks.

## UNKNOWNs

- If any additional env vars are loaded dynamically or via plugins, review all config/ and Dockerfile\* for overrides.
- To verify: run the app with NODE_ENV=production and check process.env and import.meta.env at runtime.

---

_This table is generated as part of Phase 8: Production Readiness Audit._
