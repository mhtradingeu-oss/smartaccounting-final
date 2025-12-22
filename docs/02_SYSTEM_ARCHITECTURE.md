# System Architecture

## Backend
- Node.js + Express
- Sequelize ORM
- Modular architecture inside `/src`
- JWT authentication & role middleware
- CRON jobs for automation
- Audit logging at service level

## Frontend
- React + Vite
- TailwindCSS
- Role-based dashboards
- i18n with RTL support
- Real-time notifications

## Database
- Current: SQLite (development)
- Target: PostgreSQL (production)
- Migration-based schema control

## Deployment Ready
- Docker & Docker Compose
- Nginx reverse proxy
- HTTPS & SSL support
