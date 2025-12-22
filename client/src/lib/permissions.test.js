import { can, isReadOnlyRole, explainPermission, ROLES, PERMISSIONS } from './permissions';

describe('permissions', () => {
  it('should allow all roles to view', () => {
    ROLES.forEach(role => {
      expect(can('view', role)).toBe(true);
    });
  });

  it('should only allow admin/accountant to edit', () => {
    expect(can('edit', 'admin')).toBe(true);
    expect(can('edit', 'accountant')).toBe(true);
    expect(can('edit', 'auditor')).toBe(false);
    expect(can('edit', 'viewer')).toBe(false);
  });

  it('should only allow admin to delete', () => {
    expect(can('delete', 'admin')).toBe(true);
    expect(can('delete', 'accountant')).toBe(false);
    expect(can('delete', 'auditor')).toBe(false);
    expect(can('delete', 'viewer')).toBe(false);
  });

  it('should only allow admin/accountant to create', () => {
    expect(can('create', 'admin')).toBe(true);
    expect(can('create', 'accountant')).toBe(true);
    expect(can('create', 'auditor')).toBe(false);
    expect(can('create', 'viewer')).toBe(false);
  });

  it('should allow admin/accountant/auditor to export', () => {
    expect(can('export', 'admin')).toBe(true);
    expect(can('export', 'accountant')).toBe(true);
    expect(can('export', 'auditor')).toBe(true);
    expect(can('export', 'viewer')).toBe(false);
  });

  it('should detect read-only roles', () => {
    expect(isReadOnlyRole('auditor')).toBe(true);
    expect(isReadOnlyRole('viewer')).toBe(true);
    expect(isReadOnlyRole('admin')).toBe(false);
    expect(isReadOnlyRole('accountant')).toBe(false);
  });

  it('should explain permissions', () => {
    expect(explainPermission('edit', 'auditor')).toMatch(/read-only/);
    expect(explainPermission('edit', 'admin')).toMatch(/Admin or Accountant/);
    expect(explainPermission('delete', 'accountant')).toMatch(/Admin role/);
    expect(explainPermission('view', 'viewer')).toMatch(/All roles/);
    expect(explainPermission('export', 'viewer')).toMatch(/Allowed roles/);
    expect(explainPermission('unknown', 'admin')).toMatch(/Unknown action/);
    expect(explainPermission('edit', 'unknown')).toMatch(/Unknown role/);
  });
});
