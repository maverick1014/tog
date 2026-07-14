import { describe, it, expect } from 'vitest';
import {
  displayRoleZh,
  canPromoteToLeadership,
  ChurchRole,
  GroupPosition,
} from '@tog/shared';

describe('displayRoleZh', () => {
  it('returns 牧师 for a pastor', () => {
    expect(displayRoleZh({ church_role: ChurchRole.Pastor, group_position: null })).toBe('牧师');
  });

  it('returns the group position label for a member with a position', () => {
    expect(
      displayRoleZh({ church_role: ChurchRole.Member, group_position: GroupPosition.Leader }),
    ).toBe('小组长');
  });

  it('returns 未分组 for a member with no position', () => {
    expect(displayRoleZh({ church_role: ChurchRole.Member, group_position: null })).toBe('未分组');
  });
});

describe('canPromoteToLeadership', () => {
  it('allows core members', () => {
    expect(canPromoteToLeadership(GroupPosition.CoreMember)).toBe(true);
  });

  it('allows existing leaders', () => {
    expect(canPromoteToLeadership(GroupPosition.Leader)).toBe(true);
  });

  it('rejects regular members', () => {
    expect(canPromoteToLeadership(GroupPosition.RegularMember)).toBe(false);
  });

  it('rejects null', () => {
    expect(canPromoteToLeadership(null)).toBe(false);
  });
});
