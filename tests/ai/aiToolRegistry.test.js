const {
  AI_TOOL_REGISTRY,
  TOOL_RISK_LEVELS,
  TOOL_EXECUTION_MODES,
  canRoleUseTool,
  getAiTool,
  isToolForbidden,
  listAiTools,
  listAiToolsByRisk,
  requiresApproval,
} = require('../../src/services/ai/aiToolRegistry');

describe('AI Tool Registry', () => {
  it('defines a non-empty immutable registry with unique tool ids', () => {
    const tools = listAiTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(Object.isFrozen(AI_TOOL_REGISTRY)).toBe(true);

    const ids = tools.map((tool) => tool.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('allows read-only accounting tools for viewer roles without approval', () => {
    expect(getAiTool('read_invoices')).toMatchObject({
      riskLevel: TOOL_RISK_LEVELS.READ_ONLY,
      executionMode: TOOL_EXECUTION_MODES.READ,
      approvalRequired: false,
    });
    expect(canRoleUseTool('viewer', 'read_invoices')).toBe(true);
    expect(requiresApproval('read_invoices')).toBe(false);
  });

  it('marks draft creation tools as approval-required and limited to operators', () => {
    expect(getAiTool('create_expense_draft_from_reviewed_document')).toMatchObject({
      riskLevel: TOOL_RISK_LEVELS.DRAFT_WRITE,
      executionMode: TOOL_EXECUTION_MODES.PREPARE_DRAFT,
      approvalRequired: true,
      finalPosting: false,
    });
    expect(canRoleUseTool('accountant', 'create_expense_draft_from_reviewed_document')).toBe(true);
    expect(canRoleUseTool('viewer', 'create_expense_draft_from_reviewed_document')).toBe(false);
    expect(requiresApproval('create_expense_draft_from_reviewed_document')).toBe(true);
  });

  it('blocks high-risk accounting execution from direct AI use in Phase 6F', () => {
    [
      'post_expense_to_ledger',
      'reverse_journal_entry',
      'confirm_bank_import',
      'finalize_bank_reconciliation',
    ].forEach((toolId) => {
      const tool = getAiTool(toolId);
      expect(tool.riskLevel).toBe(TOOL_RISK_LEVELS.HIGH_RISK);
      expect(tool.executionMode).toBe(TOOL_EXECUTION_MODES.BLOCKED);
      expect(tool.allowedRoles).toEqual([]);
      expect(isToolForbidden(toolId)).toBe(true);
    });
  });

  it('forbids tax submission, payments, destructive deletion, and direct DATEV upload', () => {
    [
      'delete_records',
      'submit_tax_or_elster',
      'pay_or_move_money',
      'direct_datev_upload',
    ].forEach((toolId) => {
      const tool = getAiTool(toolId);
      expect(tool.riskLevel).toBe(TOOL_RISK_LEVELS.FORBIDDEN);
      expect(tool.executionMode).toBe(TOOL_EXECUTION_MODES.BLOCKED);
      expect(canRoleUseTool('admin', toolId)).toBe(false);
      expect(isToolForbidden(toolId)).toBe(true);
    });
  });

  it('groups tools by risk level for future approval UI and governance checks', () => {
    expect(listAiToolsByRisk(TOOL_RISK_LEVELS.READ_ONLY).length).toBeGreaterThan(0);
    expect(listAiToolsByRisk(TOOL_RISK_LEVELS.DRAFT_WRITE).length).toBeGreaterThan(0);
    expect(listAiToolsByRisk(TOOL_RISK_LEVELS.FORBIDDEN).length).toBeGreaterThan(0);
  });

  it('treats unknown tools as forbidden by default', () => {
    expect(getAiTool('unknown_tool')).toBeNull();
    expect(isToolForbidden('unknown_tool')).toBe(true);
    expect(canRoleUseTool('admin', 'unknown_tool')).toBe(false);
  });
});
