# Secret Rotation Checklist

## Scope
Rotate credentials that protect authentication, session, and external integrations whenever there is a suspected leak or after a periodic audit.

## Steps
1. **Rotate `JWT_SECRET`**
   - Generate a new 32+ character secret (e.g., via `openssl rand -base64 48`) and update the production runtime configuration (not checked into Git).
   - Update any `.env.prod` or vault entry to reference the new value.
2. **Revoke refresh sessions**
   - Call `POST /api/auth/logout` for all active devices, or script a database cleanup (`RevokedToken` entries) to expire tokens issued with the old secret.
   - Optionally increment a `JWT_SECRET_VERSION` claim so clients must refresh with a new token set.
3. **Redeploy**
   - Restart the application so the new secret is loaded (`docker-compose`, Kubernetes rollout, etc.).
   - Confirm health checks (`/health`, `/ready`) pass against the new configuration.
4. **Verify**
   - Validate that new access/refresh tokens accepted, while old ones are rejected after revocation.
   - Check audit logs for rotation-related events to support compliance requests.
