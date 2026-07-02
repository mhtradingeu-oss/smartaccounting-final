const TenantDB = require('../../core/tenant/tenant.db');
const AuditService = require('../../core/audit/audit.service');

class AccountingExecutor {

  async execute(intentData) {

    const { intent, amount, companyId } = intentData;

    let entry = null;

    switch (intent) {

      case 'CREATE_EXPENSE':
        entry = {
          type: 'EXPENSE',
          amount,
          createdAt: new Date(),
        };
        break;

      case 'CREATE_INVOICE':
        entry = {
          type: 'INVOICE',
          amount,
          createdAt: new Date(),
        };
        break;

      default:
        entry = { status: 'NO_ACTION' };
    }

    // 💾 SAVE TO DATABASE (REAL SAAS CORE)
    await TenantDB.saveEntry(companyId, entry);

    // 📊 AUDIT LOG (GOBD)
    await AuditService.log({
      companyId,
      intent,
      entry,
    });

    return {
      status: 'PERSISTED',
      companyId,
      entry,
    };
  }
}

module.exports = new AccountingExecutor();
