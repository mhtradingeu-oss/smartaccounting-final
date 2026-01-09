## Security Notice (Frontend)

- `npm audit` reports vulnerabilities in `react-router`
- Issues are limited to SSR / Server Actions / Open Redirect scenarios
- SmartAccounting frontend is a client-side SPA only (no SSR)
- No runtime exposure in production
- Backend API is isolated and unaffected
- Planned upgrade after v1 stabilization
