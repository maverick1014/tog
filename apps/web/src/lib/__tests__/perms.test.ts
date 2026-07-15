import { describe, it, expect } from 'vitest';
import { can } from '../perms';
import { AccountRole } from '@tog/shared';

describe('can(role) capability map', () => {
  it('super_admin can do everything', () => {
    const p = can(AccountRole.SuperAdmin);
    expect(p).toEqual({ write: true, delete: true, manageAccounts: true });
  });

  it('admin can write and delete but not manage accounts', () => {
    const p = can(AccountRole.Admin);
    expect(p).toEqual({ write: true, delete: true, manageAccounts: false });
  });

  it('coworker can write but not delete or manage accounts', () => {
    const p = can(AccountRole.Coworker);
    expect(p).toEqual({ write: true, delete: false, manageAccounts: false });
  });

  it('readonly can do nothing mutating', () => {
    const p = can(AccountRole.ReadOnly);
    expect(p).toEqual({ write: false, delete: false, manageAccounts: false });
  });

  it('only an explicit readonly role removes write; delete/accounts stay locked otherwise', () => {
    // The UI fails open on write for unknown roles (the server gate is the
    // authority), but delete and account management stay closed.
    expect(can(undefined)).toEqual({ write: true, delete: false, manageAccounts: false });
  });
});
