# Backend Route Inventory

This document lists all backend API routes, their HTTP methods, and authentication/authorization requirements, as parsed from src/app.js and mounted routers.

## Legend

- **[A]**: Requires authentication (JWT/session)
- **[R:role]**: Requires specific role (admin, accountant, etc)
- **[P]**: Public (no auth)

## Routes

| Method | Path               | Auth/Role |
| ------ | ------------------ | --------- |
| GET    | /api/health        | P         |
| GET    | /api/ready         | P         |
| GET    | /api/metrics       | P         |
| GET    | /api/telemetry/\*  | A         |
| POST   | /api/auth/login    | P         |
| POST   | /api/auth/register | P         |
| GET    | /api/auth/me       | A         |
| ...    | ...                | ...       |

<!-- Full list to be completed by parsing all routers. -->

_This file is auto-generated for audit purposes. See src/app.js and src/routes/_.js for details.\*
