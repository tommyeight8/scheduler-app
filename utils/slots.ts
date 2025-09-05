// utils/slots.ts
import {
  toZonedTime, // v3 name (was utcToZonedTime)
  fromZonedTime, // v3 name (was zonedTimeToUtc)
  formatInTimeZone,
} from "date-fns-tz";
import {
  addMinutes,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  setSeconds,
} from "date-fns";

export type BusinessHours = {
  /** 0 = Sunday ... 6 = Saturday */
  [weekday: number]: { open: string; close: string } | null; // null = closed
};

export type BreakWindow = { start: string; end: string }; // "HH:mm" in local tz

export type SlotMeta = {
  startLocal: Date; // local (shop tz)
  endLocal: Date; // local (shop tz)
  label: string; // e.g. "11:15 AM"
  isoStartUTC: string; // ISO in UTC
  isoEndUTC: string; // ISO in UTC
  disabled: boolean; // can’t be booked (outside hours/break/past)
};

/**
 * Generate time slots for a given date in the shop timezone.
 * - Respects per-weekday hours
 * - Ensures service fits before close (durationMin)
 * - Skips defined breaks
 * - Skips past times if date is today
 */
export function generateTimeSlots(opts: {
  date: Date; // JS Date in any tz
  tz: string; // e.g. "America/Los_Angeles"
  stepMin?: number; // e.g. 15
  durationMin?: number; // service length; if omitted, no end-fit check
  hours: BusinessHours; // per-weekday opening hours
  breaks?: BreakWindow[]; // optional intraday breaks in local tz
  labelFmt?: string; // date-fns fmt, default "h:mm a"
}): SlotMeta[] {
  const {
    date,
    tz,
    stepMin = 15,
    durationMin,
    hours,
    breaks = [],
    labelFmt = "h:mm a",
  } = opts;

  // normalize to shop tz
  const localDay = toZonedTime(date, tz);
  const weekday = localDay.getDay();
  const dayHours = hours[weekday];

  if (!dayHours) return []; // closed day

  // Build local open/close Date objects
  const [openH, openM] = dayHours.open.split(":").map(Number);
  const [closeH, closeM] = dayHours.close.split(":").map(Number);

  const startLocal = setSeconds(
    setMinutes(setHours(localDay, openH), openM),
    0
  );
  const endLocal = setSeconds(
    setMinutes(setHours(localDay, closeH), closeM),
    0
  );

  // “today” guard: skip slots earlier than now (local tz)
  const nowLocal = toZonedTime(new Date(), tz);
  const isSameCalendarDay =
    nowLocal.getFullYear() === localDay.getFullYear() &&
    nowLocal.getMonth() === localDay.getMonth() &&
    nowLocal.getDate() === localDay.getDate();

  // Helpers
  const inBreak = (d: Date) =>
    breaks.some((b) => {
      const [bh, bm] = b.start.split(":").map(Number);
      const [eh, em] = b.end.split(":").map(Number);
      const bs = setSeconds(setMinutes(setHours(localDay, bh), bm), 0);
      const be = setSeconds(setMinutes(setHours(localDay, eh), em), 0);
      return !isBefore(d, bs) && isBefore(d, be); // bs <= d < be
    });

  const fitsBeforeClose = (d: Date) => {
    if (!durationMin) return true;
    const end = addMinutes(d, durationMin);
    return !isAfter(end, endLocal); // end <= close
  };

  // Walk the grid
  const slots: SlotMeta[] = [];
  for (let t = startLocal; !isAfter(t, endLocal); t = addMinutes(t, stepMin)) {
    // Ensure the whole service fits
    if (!fitsBeforeClose(t)) break;

    // Past slot guard (today)
    const isPast = isSameCalendarDay && isBefore(t, nowLocal);

    // Skip if inside a break
    const inABreak = inBreak(t);

    const label = formatInTimeZone(t, tz, labelFmt);
    const end = addMinutes(t, durationMin ?? 0);
    slots.push({
      startLocal: t,
      endLocal: end,
      label,
      isoStartUTC: fromZonedTime(t, tz).toISOString(),
      isoEndUTC: fromZonedTime(end, tz).toISOString(),
      disabled: isPast || inABreak,
    });
  }

  return slots;
}
