# Production Bootstrap Guide

## Required Environment Variables

To bootstrap the system, set the following environment variables **before running the seeders**:

- `ADMIN_EMAIL` (required): Email address for the initial admin user
- `ADMIN_PASSWORD` (required): Password for the initial admin user
- `ADMIN_NAME` (required): Name for the initial admin user

**Do not commit these values to version control.**

## First Login Procedure

1. Set the `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` environment variables.
2. Run the database migrations and seeders:
   ```sh
   npx sequelize db:migrate && npx sequelize db:seed:all
   ```
3. Log in to the system using the admin email and password you provided.
4. Change the admin password after first login if required by your security policy.

## Rotating the Admin Password

1. Update the `ADMIN_PASSWORD` environment variable to the new password.
2. Run the admin user seeder again:
   ```sh
   npx sequelize db:seed --seed database/seeders/20251225001200-seed-admin-user.js
   ```

   - The seeder is idempotent and will update the password if the user already exists.
3. Notify the admin user of the password change securely.

## Notes

- The seeders are idempotent and safe to run multiple times.
- If any required environment variable is missing, the seeder will abort with a clear error.
- No demo data is seeded. Only the default company and admin user are created.
- The admin user is always linked to the "Default Company".

---

For troubleshooting, see logs or contact your system administrator.
