import apiClient from './client';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type AnalyticsPeriod = 'today' | 'week' | 'month';
export type EnergyLevel = 'high' | 'medium' | 'low';
export type ActivityCategory = 'Movement' | 'Alert' | 'Attendance' | 'General';

export interface PeriodDataPoint {
  label: string;   // e.g. "Mon", "09:00", "Mar 1"
  score: number;   // 0–100 for energy; count for alerts
}

export interface ActivitySummary {
  energy_by_period: PeriodDataPoint[];
  alerts_by_period: PeriodDataPoint[];
  energy_level: EnergyLevel;
  avg_score: number;
}

export interface ActivityLogEntry {
  id: string | number;
  occurred_at: string;      // ISO
  description: string;
  category: ActivityCategory;
}

// ─── API calls ─────────────────────────────────────────────────────────────────
export async function getActivitySummary(
  childId: string | number,
  period: AnalyticsPeriod,
): Promise<ActivitySummary> {
  const { data } = await apiClient.get<ActivitySummary>(
    `/api/children/${childId}/analytics/`,
    { params: { period } },
  );
  return data;
}

export async function getActivityLog(
  childId: string | number,
  date: string,   // "YYYY-MM-DD"
): Promise<ActivityLogEntry[]> {
  const { data } = await apiClient.get<ActivityLogEntry[]>(
    `/api/children/${childId}/activity-log/`,
    { params: { date } },
  );
  return data;
}
