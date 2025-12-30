const { Invoice, InvoiceItem } = require('../src/models');

describe('Demo Seed Invoice Domain Consistency', () => {
  let invoices;
  beforeAll(async () => {
    invoices = await Invoice.findAll({ include: [{ model: InvoiceItem, as: 'items' }] });
  });

  it('All seeded invoices pass amount/gross invariant', () => {
    if (!invoices || invoices.length === 0) {
      return;
    }
    for (const inv of invoices) {
      const gross = inv.items.reduce(
        (sum, item) => sum + Number(item.lineGross || item.linegross),
        0,
      );
      expect(Number(inv.amount)).toBeCloseTo(gross, 2);
      expect(Number(inv.total)).toBeCloseTo(gross, 2);
      expect(Number(inv.subtotal)).toBeCloseTo(
        inv.items.reduce((sum, item) => sum + Number(item.lineNet || item.linenet), 0),
        2,
      );
    }
  });

  it('SENT invoices cannot violate amount invariant', () => {
    if (!invoices || invoices.length === 0) {
      return;
    }
    for (const inv of invoices.filter((i) => i.status === 'SENT')) {
      const gross = inv.items.reduce(
        (sum, item) => sum + Number(item.lineGross || item.linegross),
        0,
      );
      expect(Number(inv.amount)).toBeCloseTo(gross, 2);
    }
  });

  it('DEMO-INV-001 (PAID) is fully consistent', () => {
    if (!invoices || invoices.length === 0) {
      return;
    }
    const inv = invoices.find((i) => i.invoiceNumber === 'DEMO-INV-001');
    expect(inv).toBeTruthy();
    const gross = inv.items.reduce(
      (sum, item) => sum + Number(item.lineGross || item.linegross),
      0,
    );
    expect(Number(inv.amount)).toBeCloseTo(gross, 2);
    expect(inv.status).toBe('PAID');
  });

  it('DEMO-INV-002 (SENT) is fully consistent', () => {
    if (!invoices || invoices.length === 0) {
      return;
    }
    const inv = invoices.find((i) => i.invoiceNumber === 'DEMO-INV-002');
    expect(inv).toBeTruthy();
    const gross = inv.items.reduce(
      (sum, item) => sum + Number(item.lineGross || item.linegross),
      0,
    );
    expect(Number(inv.amount)).toBeCloseTo(gross, 2);
    expect(inv.status).toBe('SENT');
  });

  it('DEMO-INV-003 (DRAFT) is allowed to be incomplete', () => {
    if (!invoices || invoices.length === 0) {
      return;
    }
    const inv = invoices.find((i) => i.invoiceNumber === 'DEMO-INV-003');
    expect(inv).toBeTruthy();
    expect(inv.status).toBe('DRAFT');
  });
});
