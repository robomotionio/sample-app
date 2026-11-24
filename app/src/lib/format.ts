const DAY = 24 * 60 * 60 * 1000;

/** A stored moment (milliseconds) as a date in the viewer's own locale. */
export function formatDate(ms: number | undefined): string {
  if (!ms) return "-";
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function formatDateTime(ms: number | undefined): string {
  if (!ms) return "-";
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** A calendar date ("yyyy-mm-dd") in the viewer's own locale. */
export function formatDay(day: string | undefined): string {
  if (!day) return "-";
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Whole days since a moment. */
export function daysSince(ms: number | undefined): number {
  if (!ms) return 0;
  return Math.max(0, Math.floor((Date.now() - ms) / DAY));
}

export function waitingLabel(ms: number | undefined): string {
  const d = daysSince(ms);
  if (d === 0) return "today";
  if (d === 1) return "1 day";
  return `${d} days`;
}

export function todayIso(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

export const REMINDER_DAYS = 7;
