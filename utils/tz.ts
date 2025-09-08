// utils/tz.ts
import { formatInTimeZone } from "date-fns-tz";

export const APP_TZ = "America/Los_Angeles";

/** Start of LA-local day as a UTC Date */
export function laDayStartUtc(ymd: string): Date {
  // get the offset for that calendar day in LA, e.g. "-08:00" or "-07:00"
  const off = formatInTimeZone(new Date(`${ymd}T00:00:00Z`), APP_TZ, "xxx");
  return new Date(`${ymd}T00:00:00.000${off}`);
}

/** Start of the *next* LA-local day as a UTC Date (exclusive upper bound) */
export function laNextDayStartUtc(ymd: string): Date {
  const d = new Date(`${ymd}T00:00:00Z`); // a UTC midnight for that calendar day
  d.setUTCDate(d.getUTCDate() + 1);
  const nextYmd = d.toISOString().slice(0, 10);
  const off = formatInTimeZone(new Date(`${nextYmd}T00:00:00Z`), APP_TZ, "xxx");
  return new Date(`${nextYmd}T00:00:00.000${off}`);
}

/** Convert an LA-local clock time on a given Date to a UTC ISO string */
export function laClockToUtcISO(date: Date, timeStr: string): string {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) throw new Error(`Invalid time string: "${timeStr}"`);
  let [_, hStr, minStr, ampmRaw] = m;
  let h = Number(hStr);
  const min = Number(minStr);
  const ampm = ampmRaw.toUpperCase() as "AM" | "PM";
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;

  // LA-local date portion for the picked calendar date
  const ymd = formatInTimeZone(date, APP_TZ, "yyyy-MM-dd");
  const off = formatInTimeZone(new Date(`${ymd}T00:00:00Z`), APP_TZ, "xxx");
  const localStamp = `${ymd}T${String(h).padStart(2, "0")}:${String(
    min
  ).padStart(2, "0")}:00${off}`;
  // new Date() will parse the offset and produce a UTC moment; toISOString() returns UTC ISO
  return new Date(localStamp).toISOString();
}
