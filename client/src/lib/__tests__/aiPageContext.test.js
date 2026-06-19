import { describe, expect, it } from 'vitest';
import { formatAIPageContextForPrompt, getAIPageContext } from '../aiPageContext';

describe('aiPageContext', () => {
  it('maps core accounting routes to safe page context', () => {
    expect(getAIPageContext('/invoices')).toMatchObject({
      module: 'invoices',
      routeName: 'invoice_list',
      entityType: null,
      entityId: null,
      label: 'Invoices',
    });

    expect(getAIPageContext('/invoices/123/edit')).toMatchObject({
      module: 'invoices',
      routeName: 'invoice_edit',
      entityType: 'invoice',
      entityId: '123',
      label: 'Invoice edit',
    });

    expect(getAIPageContext('/bank-statements/abc-123')).toMatchObject({
      module: 'bank_statements',
      routeName: 'bank_statement_detail',
      entityType: 'bank_statement',
      entityId: 'abc-123',
      label: 'Bank statement detail',
    });
  });

  it('sanitizes unsafe entity ids', () => {
    expect(getAIPageContext('/invoices/<script>/edit')).toMatchObject({
      module: 'invoices',
      routeName: 'invoice_edit',
      entityType: 'invoice',
      entityId: null,
    });
  });

  it('formats safe prompt context without adding record data', () => {
    expect(
      formatAIPageContextForPrompt(getAIPageContext('/expenses')),
    ).toBe('Safe page context: module=expenses, routeName=expense_list.');

    expect(
      formatAIPageContextForPrompt(getAIPageContext('/bank-statements/42')),
    ).toBe(
      'Safe page context: module=bank_statements, routeName=bank_statement_detail, entityType=bank_statement, entityId=42.',
    );
  });
});
