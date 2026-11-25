export interface Event {
  /** ISO 8601 timestamp with offset, e.g. "2026-03-10T01:30:00+02:00" */
  at: string;
  [key: string]: unknown;
}

/** Time zone that defines a "day" in the daily report. */
const REPORT_TIME_ZONE = 'Europe/Kyiv';

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Year-month-day formatter for `timeZone`, cached because creating one is expensive. */
function dayFormat(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, fmt);
  }
  return fmt;
}

/**
 * Day (YYYY-MM-DD) shown on a wall clock in `timeZone` at the moment `at`.
 * The offset in `at` only defines the moment; DST is handled by Node's time zone data.
 * @throws {RangeError} On an invalid date or unknown time zone.
 */
function dayInTimeZone(at: string, timeZone: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid event time: ${at}`);
  }
  // formatToParts returns [{ type: 'month', value: '03' }, ...]; collect it into an object.
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const { type, value } of dayFormat(timeZone).formatToParts(date)) {
    parts[type] = value;
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Groups events by calendar day (YYYY-MM-DD) in Europe/Kyiv for the daily report.
 * Groups keep the original event objects in input order.
 * @throws {RangeError} If an event has an invalid `at`.
 */
export function groupByDay<T extends Event>(events: readonly T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const e of events) {
    const day = dayInTimeZone(e.at, REPORT_TIME_ZONE);
    (out[day] ||= []).push(e);
  }
  return out;
}
