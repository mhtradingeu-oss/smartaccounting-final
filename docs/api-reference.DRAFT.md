Expense Management
GET /api/expenses
Retrieve all expenses for the authenticated user's company.

Response:
{
  "success": true,
  "expenses": [
    {
      "id": 1,
      "vendor": "Test Vendor",
      "category": "Travel",
      "net": 100.00,
      "vat": 19.00,
      "gross": 119.00,
      "vatRate": 19,
      "status": "draft",
      "date": "2025-12-15",
      "attachments": [ { "id": "uuid", "fileName": "receipt.pdf" } ]
    }
  ]
}

GET /api/expenses/:id
Retrieve a single expense by ID (must belong to user's company).

Response:
{
  "success": true,
  "expense": { ...expense object, as above }
}

POST /api/expenses
Create a new expense with optional attachments. VAT and gross are calculated by backend.

Request Body:
{
  "vendor": "Test Vendor",
  "category": "Travel",
  "net": 100.00,
  "vatRate": 19,
  "date": "2025-12-15",
  "attachments": ["file-uuid-1"]
}

Response:
{
  "success": true,
  "expense": { ...full expense object, as above }
}

PATCH /api/expenses/:id/status
Update the status of an expense (status transition). Only valid transitions allowed (draft→booked→archived).

Request Body:
{
  "status": "booked"
}

Response:
{
  "success": true,
  "expense": { ...updated expense object }
}
⚠️ DRAFT API REFERENCE — NON-BINDING DOCUMENT

This document describes **planned, conceptual, and partially implemented API endpoints** within the SmartAccounting™ platform.

> ❗ The **only authoritative and binding API specification** is generated at runtime via Swagger/OpenAPI (`GET /api/docs`).
> 
> Any discrepancy between this document and Swagger/OpenAPI **must be resolved in favor of Swagger**.

This file is for developer orientation and planning only. See Swagger/OpenAPI for runtime truth.
SmartAccounting™ — Draft API Reference
General Conventions
Base URL (Development)
bash
Copy code
http://localhost:5000/api
Authentication
All protected endpoints require:

makefile
Copy code
Authorization: Bearer <JWT_TOKEN>
Response Envelope (Conceptual)
json
Copy code
{
  "success": true,
  "data": {},
  "error": null
}
Errors follow:

json
Copy code
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable description",
    "details": {}
  }
}
Authentication
POST /api/auth/login
Authenticate a user and return a JWT token.

Request Body

json
Copy code
{
  "email": "user@example.com",
  "password": "securepassword"
}
Response

json
Copy code
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin",
    "companyId": 1
  }
}
Status Codes

200 – Success

401 – Invalid credentials

429 – Too many attempts

POST /api/auth/register
Register a new user account (admin-controlled or onboarding flow).

Request Body

json
Copy code
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "role": "accountant",
  "companyId": 1
}
Invoice Management
GET /api/invoices
Retrieve all invoices for the authenticated user's company.

Query Parameters (future):
  - page (default: 1)
  - limit (default: 10)
  - status (pending, sent, paid, overdue, cancelled)
  - dateFrom (YYYY-MM-DD)
  - dateTo (YYYY-MM-DD)

Response:
{
  "success": true,
  "invoices": [
    {
      "id": 1,
      "invoiceNumber": "INV-100",
      "status": "pending",
      "subtotal": 200.00,
      "total": 238.00,
      "currency": "EUR",
      "date": "2025-12-15",
      "dueDate": "2026-01-15",
      "clientName": "Test Client",
      "items": [
        { "description": "Service A", "quantity": 2, "unitPrice": 100, "vatRate": 19, "lineNet": 200, "lineVat": 38, "lineGross": 238 }
      ],
      "attachments": [ { "id": "uuid", "fileName": "invoice.pdf" } ]
    }
  ]
}

GET /api/invoices/:id
Retrieve a single invoice by ID (must belong to user's company).

Response:
{
  "success": true,
  "invoice": { ...invoice object, as above }
}

POST /api/invoices
Create a new invoice with items and optional attachments. All calculations (lineNet, lineVat, lineGross, totals) are performed by backend.

Request Body:
{
  "invoiceNumber": "INV-100",
  "currency": "EUR",
  "status": "pending",
  "issueDate": "2025-12-15",
  "dueDate": "2026-01-15",
  "clientName": "Test Client",
  "items": [
    { "description": "Service A", "quantity": 2, "unitPrice": 100, "vatRate": 19 },
    { "description": "Service B", "quantity": 1, "unitPrice": 50, "vatRate": 7 }
  ],
  "attachments": ["file-uuid-1", "file-uuid-2"]
}

Response:
{
  "success": true,
  "invoice": { ...full invoice object, as above }
}

PATCH /api/invoices/:id/status
Update the status of an invoice (status transition). Only valid transitions allowed (pending→sent, sent→paid, etc).

Request Body:
{
  "status": "sent"
}

Response:
{
  "success": true,
  "invoice": { ...updated invoice object }
}
POST /api/invoices/upload
Upload an invoice or receipt for OCR processing.

Content-Type

bash
Copy code
multipart/form-data
Form Fields

file: PDF / JPG / PNG

type: invoice | receipt | bill

Response

json
Copy code
{
  "success": true,
  "data": {
    "fileId": "uuid-here",
    "extractedData": {
      "amount": 150.00,
      "date": "2024-01-15",
      "vendor": "Supplier Name",
      "items": []
    }
  }
}
Tax Reports
GET /api/taxReports
Retrieve tax reports for a specific period.

Query Parameters

year (required)

quarter (optional: 1–4)

type (vat, income, trade)

POST /api/taxReports/submit
Submit a prepared tax report to ELSTER (or ELSTER-ready workflow).

Request Body

json
Copy code
{
  "reportId": 1,
  "certificatePath": "/path/to/certificate.p12",
  "certificatePassword": "cert-password"
}
⚠️ Actual ELSTER transmission depends on certification and environment.

German Tax Compliance
POST /api/compliance/validate
Validate a transaction against German tax and compliance rules.

Request Body

json
Copy code
{
  "transaction": {
    "amount": 1000.00,
    "type": "expense",
    "category": "office_supplies",
    "date": "2024-01-15"
  }
}
GET /api/compliance/requirements
Retrieve current German tax requirements and reference data.

Company Management
GET /api/companies
Retrieve companies accessible to the current user.

POST /api/companies
Create a new company (admin-only).

Request Body

json
Copy code
{
  "name": "Company Name",
  "taxId": "DE123456789",
  "address": {
    "street": "Main St 123",
    "city": "Berlin",
    "zipCode": "10115",
    "country": "Germany"
  },
  "industry": "consulting"
}
User Management
GET /api/users
Retrieve users (admin / manager only).

PUT /api/users/:id
Update user information.

DELETE /api/users/:id
Delete a user (admin only).

System Endpoints
GET /health
Basic liveness signal that reports `status`, the active environment, and the deployed version.

Response

```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```
GET /ready
Readiness probe that verifies connectivity to the primary database. Returns `503` if Sequelize cannot authenticate.

Response

```json
{
  "status": "ready",
  "db": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```
GET /metrics
Single Prometheus scrape for the uptime gauge. Responds with plain text (see `/metrics` doc for the full exposition).

Rate Limiting (Conceptual)
Authentication: 5 requests / 15 minutes / IP

Uploads: 20 requests / hour / IP

General API: 100 requests / 15 minutes / IP

Security Headers (Applied Globally)
X-Content-Type-Options: nosniff

X-Frame-Options: DENY

X-XSS-Protection: 1; mode=block

Strict-Transport-Security: max-age=31536000

Webhooks
POST /webhooks/stripe
Handle Stripe payment events.

POST /webhooks/elster
Receive ELSTER submission status updates.

Final Governance Note
This file documents intent and structure, not guarantees.

✅ Execution truth = Swagger/OpenAPI

✅ AI tools must bind to Swagger

❌ No direct reliance on this document for runtime behavior
