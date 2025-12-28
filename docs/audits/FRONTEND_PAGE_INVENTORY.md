# Frontend Page Inventory

This document lists all frontend pages, their file locations, and the backend API routes they interact with.

## Pages

| Page                | File                                     | Calls Backend API       |
| ------------------- | ---------------------------------------- | ----------------------- |
| Companies           | client/src/pages/Companies.jsx           | /api/companies          |
| Users               | client/src/pages/Users.jsx               | /api/users              |
| Analytics           | client/src/pages/Analytics.jsx           | /api/dashboard/stats    |
| BankStatementDetail | client/src/pages/BankStatementDetail.jsx | /api/bank-statements/\* |
| Expenses            | client/src/pages/Expenses.jsx            | /api/expenses           |
| ...                 | ...                                      | ...                     |

<!-- Full list to be completed by scanning all pages and their API usage. -->

_This file is auto-generated for audit purposes. See client/src/pages/_.jsx for details.\*
