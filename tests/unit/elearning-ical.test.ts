import { describe, expect, it } from "vitest";
import { htmlToText, parseIcal } from "@/features/elearning/ical";
import { taskInputSchema } from "@/features/tasks/schema";

const NOW = new Date("2026-10-11T03:00:00Z");
const TZ = "Asia/Jakarta";
const cal = (...events: string[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Moodle Pty Ltd//Moodle//EN", ...events, "END:VCALENDAR", ""].join("\r\n");
const event = (...lines: string[]) => ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");
const base = ["UID:1234@hebat.elearning.unair.ac.id", "SUMMARY:Tugas 1 is due", "DTSTART:20261015T100000Z"];

const parse = (text: string) => parseIcal(text, NOW, TZ);

describe("parseIcal", () => {
  it("drops the \"is due\" wording and tags the title with the course code so equal titles stay apart", () => {
    const course = "CATEGORIES:2026Ganjil - SIA302 - Perencanaan Arsitektur Perusahaan (praktikum) - S1 - Sistem Informasi - 2021 - I4";
    const other = "CATEGORIES:2026Ganjil - SID304 - Analisis dan Visualisasi Data (praktikum) - S1 - Sistem Informasi - 2021 - I3";
    const { tasks } = parse(
      cal(
        event("UID:1@x.unair.ac.id", "SUMMARY:UTS is due", "DTSTART:20261015T100000Z", course),
        event("UID:2@x.unair.ac.id", "SUMMARY:UTS jatuh tempo", "DTSTART:20261015T100000Z", other),
        event("UID:3@x.unair.ac.id", "SUMMARY:Laporan akhir", "DTSTART:20261015T100000Z", "CATEGORIES:Mata kuliah tanpa kode"),
        event("UID:4@x.unair.ac.id", "SUMMARY:is due", "DTSTART:20261015T100000Z"),
      ),
    );
    expect(tasks.map((t) => t.title)).toEqual(["SIA302 · UTS", "SID304 · UTS", "Laporan akhir", "is due"]);
  });

  it("reads a Moodle deadline: title, course, link, local time", () => {
    const { tasks, skipped } = parse(
      cal(
        event(
          ...base,
          "CATEGORIES:Pemrograman Web",
          "URL;VALUE=URI:https://hebat.elearning.unair.ac.id/mod/assign/view.php?id=77",
          "DESCRIPTION:<p>Kumpulkan laporan.</p><p>Format PDF</p>",
        ),
      ),
    );
    expect(skipped).toBe(0);
    expect(tasks).toEqual([
      {
        external_id: "1234@hebat.elearning.unair.ac.id",
        title: "Tugas 1",
        due_date: "2026-10-15",
        description:
          "Batas: 17:00 WIB · Mata kuliah: Pemrograman Web\nhttps://hebat.elearning.unair.ac.id/mod/assign/view.php?id=77\n\nKumpulkan laporan.\nFormat PDF",
      },
    ]);
  });

  it("unfolds long lines and unescapes text", () => {
    const { tasks } = parse(
      cal(
        event(
          "UID:u1",
          "SUMMARY:Laporan\\, bab 1\; revisi",
          "DTSTART:20261015T100000Z",
          "DESCRIPTION:Baris satu\\nBaris dua \\\\ garis miring dan potongan yang pan",
          " jang sekali",
          "\tlanjut",
        ),
      ),
    );
    expect(tasks[0].title).toBe("Laporan, bab 1; revisi");
    expect(tasks[0].description).toContain("Baris satu\nBaris dua \\ garis miring dan potongan yang panjang sekalilanjut");
  });

  it("accepts LF-only line endings", () => {
    const text = cal(event(...base)).replaceAll("\r\n", "\n");
    expect(parse(text).tasks).toHaveLength(1);
  });

  it("converts a UTC time past Jakarta midnight into the next local day", () => {
    // 20:30 UTC on the 14th is 03:30 WIB on the 15th
    const { tasks } = parse(cal(event("UID:a", "SUMMARY:A", "DTSTART:20261014T203000Z")));
    expect(tasks[0].due_date).toBe("2026-10-15");
    expect(tasks[0].description).toContain("Batas: 03:30 WIB");
    // 16:59 UTC is 23:59 WIB, still the same day
    const same = parse(cal(event("UID:b", "SUMMARY:B", "DTSTART:20261014T165900Z")));
    expect(same.tasks[0].due_date).toBe("2026-10-14");
    expect(same.tasks[0].description).toContain("Batas: 23:59 WIB");
    // 17:00 UTC is 00:00 WIB of the next day
    expect(parse(cal(event("UID:c", "SUMMARY:C", "DTSTART:20261014T170000Z"))).tasks[0].due_date).toBe("2026-10-15");
  });

  it("handles TZID, floating and DATE values", () => {
    const { tasks } = parse(
      cal(
        event("UID:t1", "SUMMARY:Tz", "DTSTART;TZID=Asia/Jakarta:20261015T235900"),
        event("UID:t2", "SUMMARY:Tz2", "DTSTART;TZID=America/New_York:20261015T230000"), // 03:00 WIB on the 16th
        event("UID:t3", "SUMMARY:Floating", "DTSTART:20261015T080000"),
        event("UID:t4", "SUMMARY:Date", "DTSTART;VALUE=DATE:20261020"),
        event("UID:t5", "SUMMARY:Unknown zone", 'DTSTART;TZID="Mars/Olympus":20261015T080000'),
      ),
    );
    const by = Object.fromEntries(tasks.map((t) => [t.external_id, t]));
    expect(by.t1.due_date).toBe("2026-10-15");
    expect(by.t1.description).toContain("Batas: 23:59 WIB");
    expect(by.t2.due_date).toBe("2026-10-16");
    expect(by.t2.description).toContain("Batas: 10:00 WIB"); // 23:00 EDT = 03:00 UTC next day = 10:00 WIB
    expect(by.t3.description).toContain("Batas: 08:00 WIB");
    expect(by.t4.due_date).toBe("2026-10-20");
    expect(by.t4.description).not.toContain("Batas");
    expect(by.t5.due_date).toBe("2026-10-15");
  });

  it("ignores properties of a nested VALARM", () => {
    const { tasks } = parse(
      cal(
        event(...base, "BEGIN:VALARM", "ACTION:DISPLAY", "SUMMARY:Alarm", "DESCRIPTION:Pengingat", "END:VALARM", "DESCRIPTION:Isi"),
      ),
    );
    expect(tasks[0].title).toBe("Tugas 1");
    expect(tasks[0].description).toContain("Isi");
    expect(tasks[0].description).not.toContain("Pengingat");
  });

  it("skips opening notices, old events and malformed events, and counts them", () => {
    const { tasks, skipped } = parse(
      cal(
        event("UID:o1", "SUMMARY:Kuis 1 opens", "DTSTART:20261015T100000Z"),
        event("UID:o2", "SUMMARY:Kuis 2 dibuka", "DTSTART:20261015T100000Z"),
        event("UID:old", "SUMMARY:Lama is due", "DTSTART:20260920T100000Z"),
        event("SUMMARY:Tanpa UID", "DTSTART:20261015T100000Z"),
        event("UID:nosum", "DTSTART:20261015T100000Z"),
        event("UID:nodate", "SUMMARY:Tanpa tanggal"),
        event("UID:baddate", "SUMMARY:Rusak", "DTSTART:20261345T100000Z"),
        event("UID:ok", "SUMMARY:Masih berlaku", "DTSTART:20261009T100000Z"), // 2 days ago: kept
      ),
    );
    expect(tasks.map((t) => t.external_id)).toEqual(["ok"]);
    expect(skipped).toBe(7);
  });

  it("drops the unfinished last event and keeps the rest", () => {
    const text = cal(event(...base)).replace("END:VCALENDAR", 'BEGIN:VEVENT\r\nUID:cut\r\nSUMMARY:Terpotong\r\nEND:VCALENDAR');
    const { tasks, skipped } = parse(text);
    expect(tasks).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it("keeps the last occurrence of a repeated UID", () => {
    const { tasks } = parse(cal(event("UID:d", "SUMMARY:Lama", "DTSTART:20261015T100000Z"), event("UID:d", "SUMMARY:Baru", "DTSTART:20261016T100000Z")));
    expect(tasks).toEqual([expect.objectContaining({ title: "Baru", due_date: "2026-10-16" })]);
  });

  it("produces fields that fit the task limits", () => {
    const { tasks } = parse(cal(event("UID:big", `SUMMARY:${"J".repeat(400)}`, "DTSTART:20261015T100000Z", `DESCRIPTION:${"x".repeat(9000)}`)));
    const t = tasks[0];
    expect(t.title.length).toBeLessThanOrEqual(200);
    expect(t.description.length).toBeLessThanOrEqual(5000);
    expect(taskInputSchema.safeParse({ ...t, status: "todo", priority: "medium", project_id: null }).success).toBe(true);
  });

  it("returns nothing for text that is not a calendar", () => {
    expect(parse("<html>Login</html>")).toEqual({ tasks: [], skipped: 0 });
  });
});

describe("htmlToText", () => {
  it("strips tags, decodes entities and keeps paragraph breaks", () => {
    expect(htmlToText('<div class="no-overflow"><p>A &amp; B&nbsp;&#8211; &lt;ok&gt;</p><p>Baris<br/>dua</p></div>')).toBe(
      "A & B – <ok>\nBaris\ndua",
    );
  });
});
