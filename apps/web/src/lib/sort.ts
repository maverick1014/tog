'use client';

import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';
type SortValue = string | number | null | undefined;

/**
 * Click-to-sort for any table: pass the unsorted rows and a `(row, key) =>
 * value` getter, get back the sorted rows plus the header click handler.
 * Shared by every table page instead of a per-page reimplementation (G4).
 * Nulls/undefined always sort last, regardless of direction.
 */
export function useSortableRows<T>(
  rows: T[],
  getValue: (row: T, key: string) => SortValue,
  initial?: { key: string; dir?: SortDir },
) {
  const [sortKey, setSortKey] = useState<string | null>(initial?.key ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(initial?.dir ?? 'asc');

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const withValue = rows.map((row) => ({ row, v: getValue(row, sortKey) }));
    withValue.sort((a, b) => {
      if (a.v == null && b.v == null) return 0;
      if (a.v == null) return 1;
      if (b.v == null) return -1;
      const cmp =
        typeof a.v === 'number' && typeof b.v === 'number'
          ? a.v - b.v
          : String(a.v).localeCompare(String(b.v), 'zh-CN');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return withValue.map((x) => x.row);
  }, [rows, getValue, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return { sorted, sortKey, sortDir, toggleSort };
}
