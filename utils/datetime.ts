// utils/datetime.ts
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

export const APP_TZ = "America/Los_Angeles";

/**
 * Convert a calendar date (Date) + "h:mm AM/PM" string to a UTC ISO string.
 * Ensures the date portion is interpreted in Los Angeles time (APP_TZ).
 */
export function localSlotToUtcISO(date: Date, timeStr: string): string {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) throw new Error(`Invalid time string: "${timeStr}"`);
  let [_, hStr, minStr, ampmRaw] = m;
  let h = Number(hStr);
  const min = Number(minStr);
  const ampm = ampmRaw.toUpperCase() as "AM" | "PM";

  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;

  // Get the LA-local YYYY-MM-DD for the picked calendar date
  const yyyyMmDd = formatInTimeZone(date, APP_TZ, "yyyy-MM-dd");

  // Build a local (LA) timestamp string, then convert that local time to UTC
  const localStamp = `${yyyyMmDd}T${String(h).padStart(2, "0")}:${String(
    min
  ).padStart(2, "0")}:00`;
  return fromZonedTime(localStamp, APP_TZ).toISOString();
}

/**
 * Format a UTC ISO string for display in Los Angeles time.
 * Default pattern shows a time like "2:30 PM".
 */
export function utcISOToLaLabel(iso: string, pattern = "h:mm a"): string {
  return formatInTimeZone(new Date(iso), APP_TZ, pattern);
}

/**
 * Build a route-safe LA-local date param (yyyy-MM-dd) from a Date.
 * Useful for /dashboard/appointments/date/:date links.
 */
export function laDateParam(date: Date): string {
  return formatInTimeZone(date, APP_TZ, "yyyy-MM-dd");
}

/**
 * Compare two ISO strings at minute precision in UTC.
 * Handy when your DB stores seconds/millis that you want to ignore.
 */
export function isSameUtcMinute(aISO: string, bISO: string): boolean {
  const a = new Date(aISO).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  const b = new Date(bISO).toISOString().slice(0, 16);
  return a === b;
}
