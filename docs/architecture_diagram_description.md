# SmartAccounting — Visual Architecture Diagram (Description)

## Diagram Elements
- User Interface (Web Client)
- API Gateway
- Backend Services
  - AI Suggestion Engine (read-only, suggestive)
  - Human Approval Workflow
  - Immutable Audit Log
  - Compliance Modules (GoBD, DATEV, ELSTER, GDPR)
  - Security & Permissions
- Database (Immutable, auditable)
- External Integrations (Regulatory APIs, Export)

## Visual Flow
1. User interacts with the Web Client
2. Requests go through API Gateway
3. Backend services process requests:
   - AI Suggestion Engine provides recommendations (never direct changes)
   - Human Approval Workflow enforces explicit approval
   - All actions logged in Immutable Audit Log
   - Compliance Modules ensure regulatory checks
4. Database stores all actions immutably
5. External Integrations handle reporting/export

---

Use this description to create a diagram in draw.io, Lucidchart, or similar. Place the diagram in the docs/ directory as a PDF or PNG for the data room.