// utils/datetime.ts
import { formatInTimeZone } from "date-fns-tz";
export const APP_TZ = "America/Los_Angeles";
export {
  laDayStartUtc,
  laNextDayStartUtc,
  laClockToUtcISO as localSlotToUtcISO,
} from "./tz";

export function laDateParam(date: Date): string {
  return formatInTimeZone(date, APP_TZ, "yyyy-MM-dd");
}

export function isSameUtcMinute(aISO: string, bISO: string): boolean {
  const a = new Date(aISO).toISOString().slice(0, 16);
  const b = new Date(bISO).toISOString().slice(0, 16);
  return a === b;
}
