import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Child {
  id: number | string;
  name: string;
  code: string;          // e.g. "CH002"
  age: number;
  gender?: 'male' | 'female';
  status: 'inside' | 'outside' | 'unknown';
  last_seen: string | null;
}

interface RawChild {
  id: number | string;
  name: string;
  code: string;
  age: number;
  gender?: 'male' | 'female';
}

interface RawStatus {
  current_status: 'inside' | 'outside' | 'unknown';
  last_seen: string | null;
}

const POLL_INTERVAL_MS = 30_000;

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useChild() {
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const childIdRef = useRef<number | string | null>(null);

  // Fetch fresh status and merge into child state
  const fetchStatus = useCallback(async (id: number | string) => {
    try {
      const { data } = await apiClient.get<RawStatus>(
        `/api/children/${id}/status/`,
      );
      setChild((prev) =>
        prev
          ? { ...prev, status: data.current_status, last_seen: data.last_seen }
          : prev,
      );
    } catch {
      // Status poll failures are silent — don't flip global error state
    }
  }, []);

  // Full load: children list + initial status
  const load = useCallback(async () => {
    setError(false);
    try {
      const { data } = await apiClient.get<RawChild[]>(
        '/api/parents/me/children/',
      );
      if (!data.length) {
        setLoading(false);
        return;
      }

      const raw = data[0];
      childIdRef.current = raw.id;

      // Set base child info with unknown status while we fetch real status
      setChild({
        id: raw.id,
        name: raw.name,
        code: raw.code,
        age: raw.age,
        gender: raw.gender ?? 'male',
        status: 'unknown',
        last_seen: null,
      });

      // Fetch real status immediately
      await fetchStatus(raw.id);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (childIdRef.current !== null) {
        fetchStatus(childIdRef.current);
      }
    }, POLL_INTERVAL_MS);
  }, [fetchStatus]);

  useEffect(() => {
    load();
    startPolling();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load, startPolling]);

  return { child, loading, error, refetch: load };
}
