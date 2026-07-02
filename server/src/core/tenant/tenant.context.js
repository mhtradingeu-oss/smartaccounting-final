class TenantContext {

  static resolve(req) {
    return {
      companyId: req.headers['x-company-id'],
      userId: req.headers['x-user-id'],
    };
  }

}

module.exports = TenantContext;
