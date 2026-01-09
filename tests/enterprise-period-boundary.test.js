// Enterprise-tier accounting period boundary tests
// These tests are intentionally skipped; backend enforcement is not implemented in MVP

describe('Enterprise Accounting Period Boundary Enforcement', () => {
  test.skip('should not allow modification of invoices in closed fiscal years', async () => {
    // TODO: Enforce in backend (Enterprise only)
    // Expect 403 or 409, never 200
    // Rationale: Real accounting principle, not UI assumption
  });

  test.skip('should not allow deletion of accounting entries after period lock', async () => {
    // TODO: Enforce in backend (Enterprise only)
    // Expect 403 or 409, never 200
    // Rationale: Real accounting principle, not UI assumption
  });

  test.skip('should enforce status-based immutability (DRAFT vs FINAL)', async () => {
    // TODO: Enforce in backend (Enterprise only)
    // Expect 403 or 409, never 200
    // Rationale: Real accounting principle, not UI assumption
  });
});

// MVP behavior remains unchanged
// Period locking is an enterprise feature, not required for v1
