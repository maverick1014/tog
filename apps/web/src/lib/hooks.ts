'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!path) return;
    setLoading(true);
    api
      .get<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  // `loading` flips true on every reload() so callers can disable buttons etc.
  // `initialLoading` is true ONLY before the first successful fetch — use it to
  // gate the full-page spinner so a post-mutation refetch keeps the current UI
  // (and its form state / scroll) on screen instead of remounting it.
  const initialLoading = loading && data === null && error === null;

  return { data, loading, initialLoading, error, reload, setData };
}
