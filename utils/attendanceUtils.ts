import { AttendanceRecord } from '../api/attendance';

export interface AttendanceStats {
  totalDays: number;
  present: number;
  absent: number;
}

/**
 * Count Mon–Fri days in the given month as "total working days".
 */
export function countWorkingDays(year: number, month: number): number {
  // month is 1-indexed
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/**
 * Compute present/absent from API records for the given month.
 */
export function calcStats(
  records: AttendanceRecord[],
  year: number,
  month: number,
): AttendanceStats {
  const totalDays = countWorkingDays(year, month);
  const present = records.filter((r) => r.isPresent).length;
  const absent = totalDays - present;
  return { totalDays, present, absent: Math.max(absent, 0) };
}

/**
 * Groups attendance records into labelled week buckets.
 * Returns array of { title, data } ready for SectionList.
 */
export function groupByWeek(
  records: AttendanceRecord[],
): { title: string; data: AttendanceRecord[] }[] {
  if (!records.length) return [];

  // Sort newest-first so sections show most-recent first
  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const now = new Date();
  // Monday of current week (midnight)
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // treat Sunday as 7
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - (dayOfWeek - 1));
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const sections: { title: string; data: AttendanceRecord[] }[] = [];
  const buckets = new Map<string, AttendanceRecord[]>();

  for (const record of sorted) {
    const d = new Date(record.date + 'T00:00:00');
    let label: string;

    if (d >= thisMonday) {
      label = 'This Week';
    } else if (d >= lastMonday) {
      label = 'Last Week';
    } else {
      // Label as "Week of DD MMM"
      const mon = new Date(d);
      const dow = mon.getDay() === 0 ? 7 : mon.getDay();
      mon.setDate(mon.getDate() - (dow - 1));
      const dd = mon.getDate().toString().padStart(2, '0');
      const mmm = mon.toLocaleString('en-US', { month: 'short' });
      label = `Week of ${dd} ${mmm}`;
    }

    if (!buckets.has(label)) {
      buckets.set(label, []);
      sections.push({ title: label, data: buckets.get(label)! });
    }
    buckets.get(label)!.push(record);
  }

  return sections;
}
