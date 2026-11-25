export interface Event {
  /** ISO 8601 timestamp with offset, e.g. "2026-03-10T01:30:00+02:00" */
  at: string;
  [key: string]: unknown;
}

/**
 * Groups events by calendar day (YYYY-MM-DD) for the daily report.
 */
export function groupByDay<T extends Event>(events: readonly T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const e of events) {
    const day = new Date(e.at).toISOString().slice(0, 10);
    (out[day] ||= []).push(e);
  }
  return out;
}
