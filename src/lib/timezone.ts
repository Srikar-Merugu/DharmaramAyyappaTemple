import type { Language, SeasonSettings } from "./types";

const DEFAULT_TZ = "Asia/Kolkata";

export function getNowInTimezone(
  timezone: string = DEFAULT_TZ,
  now: Date = new Date()
): { dateStr: string; timeStr: string; minutesFromMidnight: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  const hour = map.hour === "24" ? "00" : map.hour;
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const timeStr = `${hour}:${map.minute}`;
  const minutesFromMidnight = Number(hour) * 60 + Number(map.minute);

  return { dateStr, timeStr, minutesFromMidnight };
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isCutoffPassed(
  targetDate: string,
  cutoffTime: string = "09:00",
  timezone: string = DEFAULT_TZ,
  now: Date = new Date()
): boolean {
  const current = getNowInTimezone(timezone, now);
  if (targetDate < current.dateStr) return true;
  if (targetDate > current.dateStr) return false;
  return current.minutesFromMidnight >= parseTimeToMinutes(cutoffTime);
}

export type DateAvailabilityReason =
  | "registration_disabled"
  | "outside_season"
  | "outside_window"
  | "disabled_date"
  | "cutoff_passed"
  | null;

export interface WindowDateInfo {
  date: string;
  available: boolean;
  reason: DateAvailabilityReason;
  isToday: boolean;
}

export function validatePublicDate(
  targetDate: string,
  settings: SeasonSettings,
  now: Date = new Date()
): { valid: boolean; reason: DateAvailabilityReason } {
  if (!settings.registrationEnabled) {
    return { valid: false, reason: "registration_disabled" };
  }

  const tz = settings.timezone || DEFAULT_TZ;
  const { dateStr: today } = getNowInTimezone(tz, now);
  const windowDays = settings.bookingWindowDays || 3;
  const maxDate = addDaysToDateStr(today, windowDays - 1);

  if (targetDate < today || targetDate > maxDate) {
    return { valid: false, reason: "outside_window" };
  }

  if (targetDate < settings.startDate || targetDate > settings.endDate) {
    return { valid: false, reason: "outside_season" };
  }

  if (settings.disabledDates?.includes(targetDate)) {
    return { valid: false, reason: "disabled_date" };
  }

  if (isCutoffPassed(targetDate, settings.cutoffTime || "09:00", tz, now)) {
    return { valid: false, reason: "cutoff_passed" };
  }

  return { valid: true, reason: null };
}

export function getBookingWindowDates(
  settings: SeasonSettings,
  now: Date = new Date()
): WindowDateInfo[] {
  const tz = settings.timezone || DEFAULT_TZ;
  const { dateStr: today } = getNowInTimezone(tz, now);
  const windowDays = settings.bookingWindowDays || 3;

  const result: WindowDateInfo[] = [];
  for (let i = 0; i < windowDays; i++) {
    const date = addDaysToDateStr(today, i);
    const check = validatePublicDate(date, settings, now);
    result.push({
      date,
      available: check.valid,
      reason: check.reason,
      isToday: i === 0,
    });
  }
  return result;
}

export function formatDateLabel(dateStr: string, lang: Language): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat(lang === "te" ? "te-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}
