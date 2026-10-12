import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, dayLabel, daysBetween, formatDate, longDate, todayISO } from "@/lib/date";

afterEach(() => vi.unstubAllEnvs());

describe("date helpers", () => {
  it("todayISO follows APP_TIMEZONE, not UTC", () => {
    const instant = new Date("2026-10-10T20:00:00Z"); // 03:00 next day in Jakarta
    vi.stubEnv("APP_TIMEZONE", "Asia/Jakarta");
    expect(todayISO(instant)).toBe("2026-10-11");
    vi.stubEnv("APP_TIMEZONE", "UTC");
    expect(todayISO(instant)).toBe("2026-10-10");
  });

  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("daysBetween counts whole days across month ends and is negative backwards", () => {
    expect(daysBetween("2026-10-07", "2026-10-10")).toBe(3);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
    expect(daysBetween("2026-10-10", "2026-10-10")).toBe(0);
    expect(daysBetween("2026-10-10", "2026-10-07")).toBe(-3);
  });

  it("dayLabel says Besok for tomorrow and a short weekday + date otherwise", () => {
    expect(dayLabel("2026-10-11", "2026-10-10")).toBe("Besok");
    expect(dayLabel("2026-10-14", "2026-10-10")).toMatch(/^Rab\b.*14 Okt$/);
  });

  it("longDate spells out the weekday and month in the app timezone", () => {
    vi.stubEnv("APP_TIMEZONE", "Asia/Jakarta");
    expect(longDate(new Date("2026-10-11T03:00:00Z"))).toBe("Minggu, 11 Oktober 2026");
    expect(longDate(new Date("2026-10-10T20:00:00Z"))).toBe("Minggu, 11 Oktober 2026"); // already Sunday in Jakarta
  });

  it("formatDate omits the year only when it matches today's", () => {
    expect(formatDate("2026-10-10", "2026-01-01")).toMatch(/10 Okt/);
    expect(formatDate("2026-10-10", "2026-01-01")).not.toMatch(/2026/);
    expect(formatDate("2027-01-05", "2026-10-10")).toMatch(/2027/);
  });
});
