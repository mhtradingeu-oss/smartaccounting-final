# TLS Termination (Traefik)

Traefik fronts the production stack so that the frontend and backend share a single HTTPS entrypoint, automatic certificates, and the path-based routing required by Phase 4.

## What is in place

- `docker-compose.prod.yml` now includes a `proxy` service that exposes ports 80 and 443 and routes `/` to the frontend and `/api` to the backend.
- Static configuration lives in `traefik/traefik.yml` and the dynamic routing lives in `traefik/dynamic.yml`.
- Certificates are managed through Let’s Encrypt via the HTTP challenge; Traefik writes the state to `traefik/acme.json`.
- The backend, frontend, and Traefik services share a common Docker network so no other host ports are exposed.

## Prerequisites

1. Point your public hostname (e.g., `app.your-domain.com`) to the production server’s public IP, and keep ports 80/443 open in any firewall/load balancer.
2. Populate `.env.prod`, especially `POSTGRES_*`, `DATABASE_URL`, and `TRAEFIK_LETSENCRYPT_EMAIL` with production-grade values. The entrypoint builds the `DATABASE_URL` string for the backend, so the value must reference `db` (e.g., `postgres://smartaccounting:super-secret@db:5432/smartaccounting`).
3. Ensure `traefik/acme.json` exists and is readable/writable by Docker; on the host run `chmod 600 traefik/acme.json` the first time so Traefik can update it without leaking secrets.

## Deploying the TLS stack

1. Build the images (rebuild if you changed source code):
   ```bash
   docker compose -f docker-compose.prod.yml build
   ```
2. Bring the stack up with the production env file:
   ```bash
   docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
   ```
   Traefik reads its configs from `traefik/traefik.yml` and `traefik/dynamic.yml`, so no extra CLI flags are required.
3. Check the proxy logs while the ACME challenge runs:
   ```bash
   docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail 50 proxy
   ```
   Look for `level=info msg="Server will reuse the previously issued certificate"` or other ACME success messages. If the HTTP challenge fails, verify that port 80 is routable and that the hostname resolves to this server.
4. Verify the routing:
   - `curl https://app.your-domain.com/health` should reach the frontend (static assets).
   - `curl https://app.your-domain.com/api/health` should proxy to the backend.

## Keeping TLS healthy

- Renewals are automatic—Traefik renews certificates before expiry and writes the new state to `traefik/acme.json`.
- If you move the stack to another host, copy the `acme.json` file and preserve its `chmod 600`, otherwise Traefik will request new certificates.
- To rotate the ACME email or challenge method, update `traefik/traefik.yml` and restart only the proxy (`docker compose ... up -d proxy`).
