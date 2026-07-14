import { describe, it, expect } from 'vitest';
import {
  roleTagStyle,
  roleDot,
  fundBadgeClass,
  categoryBadgeClass,
  enrollmentStatusClass,
  memberStatusLabel,
  formatMoney,
  initialOf,
} from '@/lib/labels';

describe('role labels', () => {
  it('roleTagStyle returns the pastor palette', () => {
    expect(roleTagStyle('牧师')).toEqual({ background: '#fbe3e0', color: '#b3261e' });
  });

  it('roleDot returns the core-member dot colour', () => {
    expect(roleDot('核心成员')).toBe('#2f7ad1');
  });

  it('unknown role falls back to the 未分组 palette', () => {
    expect(roleTagStyle('不存在的身份')).toEqual({ background: '#f0eeec', color: '#9a938f' });
    expect(roleDot('不存在的身份')).toBe('#c3bbb6');
  });
});

describe('fundBadgeClass', () => {
  it('maps each fund to its badge class', () => {
    expect(fundBadgeClass('十一奉献')).toBe('b-brand');
    expect(fundBadgeClass('主日奉献')).toBe('b-accent');
    expect(fundBadgeClass('建堂')).toBe('b-good');
    expect(fundBadgeClass('宣教')).toBe('b-warn');
    expect(fundBadgeClass('感恩')).toBe('b-gray');
  });
});

describe('categoryBadgeClass', () => {
  it('always returns b-accent', () => {
    expect(categoryBadgeClass('门徒')).toBe('b-accent');
    expect(categoryBadgeClass(null)).toBe('b-accent');
    expect(categoryBadgeClass('anything')).toBe('b-accent');
  });
});

describe('enrollmentStatusClass', () => {
  it('maps enrollment statuses to badge classes', () => {
    expect(enrollmentStatusClass('completed')).toBe('b-good');
    expect(enrollmentStatusClass('approved')).toBe('b-good');
    expect(enrollmentStatusClass('in_progress')).toBe('b-warn');
    expect(enrollmentStatusClass('dropped')).toBe('b-crit');
    expect(enrollmentStatusClass('pending')).toBe('b-gray');
  });
});

describe('memberStatusLabel', () => {
  it('maps member statuses to Chinese labels', () => {
    expect(memberStatusLabel('active')).toBe('在册');
    expect(memberStatusLabel('inactive')).toBe('停止聚会');
  });
});

describe('formatting helpers', () => {
  it('formatMoney formats with two decimals', () => {
    expect(formatMoney(200)).toBe('200.00');
  });

  it('initialOf returns the last two chars of a name', () => {
    expect(initialOf('陈约翰')).toBe('约翰');
  });

  it('initialOf returns ? for null', () => {
    expect(initialOf(null)).toBe('?');
  });
});
