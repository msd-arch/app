import apiClient from './client';

// ─── Raw API shape ─────────────────────────────────────────────────────────────
export interface RawAttendanceRecord {
  date: string;            // "YYYY-MM-DD"
  drop_off_time: string | null;  // "HH:MM:SS" or null
  pickup_time: string | null;
  is_present: boolean;
}

// ─── Normalised shape ──────────────────────────────────────────────────────────
export interface AttendanceRecord {
  date: string;            // "YYYY-MM-DD"
  dayName: string;         // "Mon", "Tue" …
  dayNumber: string;       // "01", "18" …
  dropOffTime: string | null;  // "HH:MM" formatted
  pickupTime: string | null;
  isPresent: boolean;
}

// Trim seconds from "HH:MM:SS" → "HH:MM"
function trimTime(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function normalise(raw: RawAttendanceRecord): AttendanceRecord {
  const d = new Date(raw.date + 'T00:00:00');
  return {
    date: raw.date,
    dayName: DAY_NAMES[d.getDay()],
    dayNumber: d.getDate().toString().padStart(2, '0'),
    dropOffTime: trimTime(raw.drop_off_time),
    pickupTime: trimTime(raw.pickup_time),
    isPresent: raw.is_present,
  };
}

// ─── API call ──────────────────────────────────────────────────────────────────
export async function getAttendanceHistory(
  childId: string | number,
  year: number,
  month: number,
): Promise<AttendanceRecord[]> {
  const { data } = await apiClient.get<RawAttendanceRecord[]>(
    '/api/attendance/',
    { params: { child_id: childId, year, month } },
  );
  return data.map(normalise);
}
