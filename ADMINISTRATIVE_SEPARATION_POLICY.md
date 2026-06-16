# Administrative Separation Policy

- **system_admin** is the only role allowed to:
  - Access System Admin Dashboard
  - Control platform-wide features
  - Enable/disable maintenance mode
  - Control AI and billing logic

- **admin** (Enterprise Admin) is strictly limited to company scope only.

- No UI or API may mix system and company authority.

This policy is mandatory for all future development and reviews to ensure strict governance and separation of system and company privileges.
