const db = require('../db');

class AuditService {

  static async log(tenantId, event, data = {}) {
    return db.query(
      `INSERT INTO audit_logs (tenant_id, event, data)
       VALUES ($1, $2, $3)`,
      [tenantId, event, JSON.stringify(data)],
    );
  }

}

module.exports = AuditService;
