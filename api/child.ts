import apiClient from './client';

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ChildDetail {
  id: string | number;
  name: string;
  code: string;
  age: number;
  gender?: 'male' | 'female';
  rfid_tag_id: string;
  created_at: string;         // ISO — registration date
  current_status: 'inside' | 'outside' | 'unknown';
  last_seen: string | null;
}

export type TimelineEventType =
  | 'drop_off'
  | 'pickup'
  | 'zone_violation'
  | 'pickup_scheduled'
  | 'general';

export interface TimelineEvent {
  id: string | number;
  event_type: TimelineEventType;
  occurred_at: string;        // ISO string
  description: string;
}

export interface MonthlyStats {
  present_days: number;
  zone_alerts_today: number;
  current_status: 'inside' | 'outside' | 'unknown';
}

// ─── API calls ─────────────────────────────────────────────────────────────────
export async function fetchChildDetail(childId: string | number): Promise<ChildDetail> {
  const { data } = await apiClient.get<ChildDetail>(`/api/children/${childId}/`);
  return data;
}

export async function fetchTodayTimeline(childId: string | number): Promise<TimelineEvent[]> {
  const { data } = await apiClient.get<TimelineEvent[]>(
    `/api/children/${childId}/timeline/today/`,
  );
  return data;
}

export async function fetchMonthlyStats(childId: string | number): Promise<MonthlyStats> {
  const { data } = await apiClient.get<MonthlyStats>(
    `/api/children/${childId}/stats/monthly/`,
  );
  return data;
}
