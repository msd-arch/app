/**
 * Shared TypeScript interfaces for the Identra parent app.
 * All screens should import types from here rather than defining inline.
 */

// ─── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
  [key: string]: unknown;
}

// ─── Child ─────────────────────────────────────────────────────────────────────
export type ChildStatus = 'inside' | 'outside' | 'unknown';

export interface Child {
  id: string | number;
  name: string;
  code: string;
  age: number;
  gender?: 'male' | 'female';
  rfid_tag_id: string;
  created_at: string;
  current_status: ChildStatus;
  last_seen: string | null;
}

// ─── Notification ──────────────────────────────────────────────────────────────
export type NotifType =
  | 'zone_violation'
  | 'drop_off'
  | 'pickup_reminder'
  | 'general';

export interface Notification {
  id: string | number;
  type: NotifType;
  title: string;
  body: string;
  occurred_at: string;
  is_read: boolean;
  child_name: string;
}

// ─── Attendance ────────────────────────────────────────────────────────────────
export interface AttendanceRecord {
  date: string;
  dayName: string;
  dayNumber: string;
  dropOffTime: string | null;
  pickupTime: string | null;
  isPresent: boolean;
}

// ─── Fee ───────────────────────────────────────────────────────────────────────
export type FeeStatus = 'pending' | 'paid' | 'overdue';

export interface Fee {
  id: string;
  child_id: string | number;
  child_name: string;
  month: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: FeeStatus;
}

// ─── Payment ───────────────────────────────────────────────────────────────────
export type PaymentMethod = 'card' | 'bank_transfer';

export interface Payment {
  id: string;
  fee_id: string;
  method: PaymentMethod;
  amount: number;
  status: string;
  receipt_url: string;
  created_at: string;
  transaction_ref: string;
}

// ─── Activity Log ──────────────────────────────────────────────────────────────
export type ActivityCategory = 'Movement' | 'Alert' | 'Attendance' | 'General';

export interface ActivityLog {
  id: string | number;
  occurred_at: string;
  description: string;
  category: ActivityCategory;
}

// ─── Notification Preferences ─────────────────────────────────────────────────
export interface NotificationPreferences {
  zone_violation_alerts: true;   // always true — safety critical, read-only
  drop_off_confirmation: boolean;
  pickup_reminders: boolean;
  fee_due_reminders: boolean;
  weekly_activity_report: boolean;
}
