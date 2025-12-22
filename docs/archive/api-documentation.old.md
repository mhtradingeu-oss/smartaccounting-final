Archived documentation – kept for historical reference only.

# SmartAccounting API Documentation

## Base URL
```
http://0.0.0.0:5000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh JWT token

### Dashboard
- `GET /dashboard` - Get dashboard data
- `GET /dashboard/stats` - Get statistics

### Companies
- `GET /companies` - List companies
- `POST /companies` - Create company
- `PUT /companies/:id` - Update company
- `DELETE /companies/:id` - Delete company

### Invoices
- `GET /invoices` - List invoices
- `POST /invoices` - Create invoice
- `PUT /invoices/:id` - Update invoice
- `DELETE /invoices/:id` - Delete invoice
- `POST /invoices/upload` - Upload invoice document

### Tax Reports
- `GET /tax-reports` - List tax reports
- `POST /tax-reports/generate` - Generate tax report
- `POST /tax-reports/submit-elster` - Submit to ELSTER

### System
- `GET /health` - Health check
- `GET /status` - System status

## Error Responses
All endpoints return errors in this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes
- Upload endpoints: 10 requests per hour
