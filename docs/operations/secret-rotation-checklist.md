# Secret Rotation Checklist (Production)

This checklist must be followed for all production deployments. Never commit real secrets to the repository.

## JWT_SECRET Rotation

- [ ] Remove any committed JWT_SECRET from all environment files and history
- [ ] Generate a new strong JWT_SECRET (32+ chars, random)
- [ ] Inject JWT_SECRET via server environment or secret manager (never commit)
- [ ] Update all running services to use the new secret
- [ ] Invalidate all existing JWTs if compromise is suspected
- [ ] Document rotation date and responsible party

## Other Secrets

- [ ] Rotate database, Stripe, and email credentials as needed
- [ ] Update .env.prod.example with placeholders only
- [ ] Ensure .env.prod is gitignored and not present in repo

---

See README.md for security policy and secret management requirements.
