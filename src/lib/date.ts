// ponytail: one fixed timezone from env; move to profiles.timezone when settings exist (SET-02).
const timeZone = () => process.env.APP_TIMEZONE || "Asia/Jakarta";

/** Today as YYYY-MM-DD in the app timezone. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone() }).format(now);
}

/** Calendar date (YYYY-MM-DD, app timezone) of a timestamptz string such as a row's updated_at. */
export const localDate = (timestamp: string): string => todayISO(new Date(timestamp));

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "10 Okt" (adds the year when it differs from `today`). */
export function formatDate(iso: string, today: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(d);
}

/** Group heading for a day: "Besok", otherwise "Rab, 14 Okt". */
export function dayLabel(iso: string, today: string): string {
  if (daysBetween(today, iso) === 1) return "Besok";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** "Minggu, 11 Oktober 2026" in the app timezone. */
export function longDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: timeZone(),
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

/** Hour of day (0-23) in the app timezone. */
export function hourOfDay(now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: timeZone(), hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(h);
}
