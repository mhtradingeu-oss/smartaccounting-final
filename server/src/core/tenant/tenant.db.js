const db = require('../db');

class TenantDB {

  static async saveEntry(companyId, entry) {
    return db.query(
      `INSERT INTO ledger 
      (tenant_id, type, debit, credit, amount, data)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        companyId,
        entry.type,
        entry.debit || null,
        entry.credit || null,
        entry.amount || null,
        JSON.stringify(entry),
      ],
    );
  }

  static async getEntries(companyId) {
    const res = await db.query(
      'SELECT * FROM ledger WHERE tenant_id = $1 ORDER BY created_at DESC',
      [companyId],
    );
    return res.rows;
  }

}

module.exports = TenantDB;
