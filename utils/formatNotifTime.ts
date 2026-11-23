/**
 * Formats an ISO date string for display in NotificationRow.
 * - Same calendar day → "HH:MM"  (e.g. "10:47")
 * - Yesterday        → "Yesterday"
 * - Older            → "DD MMM"  (e.g. "18 Mar")
 */
export function formatNotifTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  // Strip to midnight for day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    // Same day — "HH:MM" in local time
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  // Older — "DD MMM"
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month}`;
}
