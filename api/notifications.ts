import apiClient from './client';
import { formatNotifTime } from '../utils/formatNotifTime';

// ─── Raw API shape ────────────────────────────────────────────────────────────
export type RawNotifType =
  | 'zone_violation'
  | 'drop_off'
  | 'pickup_reminder'
  | 'general';

export interface RawNotification {
  id: number | string;
  notification_type: RawNotifType;
  message: string;
  occurred_at: string;
  is_read: boolean;
}

// ─── Normalised shape (maps to NotificationRow props) ─────────────────────────
export interface AppNotification {
  id: number | string;
  type: RawNotifType;
  message: string;
  time: string;          // formatted display time
  occurred_at: string;   // raw ISO — kept for sorting / deep-linking
  isRead: boolean;
}

// ─── API call ─────────────────────────────────────────────────────────────────
export async function fetchRecentNotifications(
  limit = 3,
): Promise<AppNotification[]> {
  const { data } = await apiClient.get<RawNotification[]>(
    '/api/notifications/',
    { params: { limit, ordering: '-occurred_at' } },
  );

  return data.map((n) => ({
    id: n.id,
    type: n.notification_type,
    message: n.message,
    time: formatNotifTime(n.occurred_at),
    occurred_at: n.occurred_at,
    isRead: n.is_read,
  }));
}
