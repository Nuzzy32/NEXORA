// Minimal iCalendar (RFC 5545) reader for the Moodle calendar export. VEVENT only, no dependencies.

/** Same limits as the tasks table / taskInputSchema. */
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;
const EXTERNAL_ID_MAX = 255;
const MAX_AGE_DAYS = 7;

export type SourceTask = { external_id: string; title: string; due_date: string; description: string };

type Prop = { name: string; params: Record<string, string>; value: string };

/** Joins folded lines (a line break followed by a space or tab continues the previous line). */
function unfold(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r\n|\n|\r/)) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) out[out.length - 1] += line.slice(1);
    else out.push(line);
  }
  return out;
}

/** `NAME;P=V;Q="x:y":value`. The value starts at the first colon outside quotes. */
function parseLine(line: string): Prop | null {
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ":" && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 1) return null;
  const [name, ...rawParams] = line.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

const unescapeText = (s: string) => s.replace(/\\([nN,;\\])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Moodle descriptions are HTML: keep the words, drop the markup. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const truncate = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…");

type Wall = { y: number; mo: number; d: number; h: number; mi: number; s: number };

/** Wall-clock fields of an instant in a time zone. */
function wallIn(instant: number, timeZone: string): Wall {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(new Date(instant))) p[part.type] = Number(part.value);
  return { y: p.year, mo: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

const asUtc = (w: Wall) => Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s);

/** The instant at which a zone's clock shows `w` (two passes settle zones whose offset changes nearby). */
function instantOf(w: Wall, timeZone: string): number {
  const guess = asUtc(w);
  const first = guess - (asUtc(wallIn(guess, timeZone)) - guess);
  return guess - (asUtc(wallIn(first, timeZone)) - first);
}

const pad = (n: number) => String(n).padStart(2, "0");
const dateOf = (w: Pick<Wall, "y" | "mo" | "d">) => `${w.y}-${pad(w.mo)}-${pad(w.d)}`;

const ZONE_LABEL: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Pontianak": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};

/** DTSTART to the app-timezone calendar date (and clock time, unless the value is a plain date). Null when malformed. */
function localDue(prop: Prop, appZone: string): { date: string; time: string | null } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(prop.value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  if (m[4] === undefined) return { date: dateOf({ y, mo, d }), time: null };
  const wall: Wall = { y, mo, d, h: Number(m[4]), mi: Number(m[5]), s: Number(m[6]) };
  if (wall.h > 23 || wall.mi > 59 || wall.s > 60) return null;
  let instant: number;
  if (m[7]) instant = asUtc(wall);
  else {
    // TZID, or "floating" time (read as the app timezone); an unknown TZID falls back to the app timezone too
    let zone = prop.params.TZID ?? appZone;
    try {
      new Intl.DateTimeFormat("en", { timeZone: zone });
    } catch {
      zone = appZone;
    }
    instant = instantOf(wall, zone);
  }
  const local = wallIn(instant, appZone);
  return { date: dateOf(local), time: `${pad(local.h)}:${pad(local.mi)}` };
}

/** Moodle words every deadline as "<activity> is due" (or "jatuh tempo" in Indonesian); the date already says that. */
const cleanTitle = (summary: string) => summary.replace(/\s+(is due|jatuh tempo)\s*$/i, "").trim() || summary;

/**
 * "2026Ganjil - SIA302 - Perencanaan Arsitektur Perusahaan (praktikum) - S1 - ..." -> "Perencanaan Arsitektur Perusahaan (praktikum)":
 * the course name sits right after its code, so equal titles ("UTS") stay apart. Falls back to the bare code, then to nothing.
 */
function courseLabel(course: string): string {
  const parts = course.split(" - ").map((p) => p.trim());
  const at = parts.findIndex((p) => /^[A-Z]{2,4}\d{3}$/.test(p));
  if (at < 0) return "";
  return parts[at + 1] || parts[at];
}

/** "Quiz 1 opens" / "... dibuka" is an opening notice, not a deadline. */
const isOpening = (summary: string) => /\b(opens|dibuka)\s*$/i.test(summary);

/**
 * Reads the events of a Moodle iCal export into task fields. `skipped` counts events that are not tasks:
 * malformed (no UID/SUMMARY/date), opening notices, and deadlines older than a week.
 * A repeated UID keeps its last occurrence.
 */
export function parseIcal(text: string, now: Date, timeZone: string): { tasks: SourceTask[]; skipped: number } {
  const byId = new Map<string, SourceTask>();
  let skipped = 0;
  const oldest = dateOf(wallIn(now.getTime() - MAX_AGE_DAYS * 86_400_000, timeZone));

  let event: Prop[] | null = null;
  let nested = 0; // depth inside a component of the event (VALARM), whose properties are not the event's

  const finish = (props: Prop[]) => {
    const get = (n: string) => props.find((p) => p.name === n);
    const uid = get("UID")?.value.trim();
    const summary = unescapeText(get("SUMMARY")?.value ?? "").trim();
    const start = get("DTSTART");
    const due = start ? localDue(start, timeZone) : null;
    if (!uid || uid.length > EXTERNAL_ID_MAX || !summary || !due || isOpening(summary) || due.date < oldest) {
      skipped++;
      return;
    }
    const course = unescapeText(get("CATEGORIES")?.value ?? "").trim();
    const link = get("URL")?.value.trim() ?? "";
    const head = [due.time ? `Batas: ${due.time} ${ZONE_LABEL[timeZone] ?? timeZone}` : "", course ? `Mata kuliah: ${course}` : ""]
      .filter(Boolean)
      .join(" · ");
    const body = htmlToText(unescapeText(get("DESCRIPTION")?.value ?? ""));
    const description = truncate(
      [[head, /^https:\/\//i.test(link) ? link : ""].filter(Boolean).join("\n"), body].filter(Boolean).join("\n\n"),
      DESCRIPTION_MAX,
    );
    const label = courseLabel(course);
    const title = truncate(label ? `${label} · ${cleanTitle(summary)}` : cleanTitle(summary), TITLE_MAX);
    byId.set(uid, { external_id: uid, title, due_date: due.date, description });
  };

  for (const line of unfold(text)) {
    const prop = parseLine(line);
    if (!prop) continue;
    if (prop.name === "BEGIN") {
      const kind = prop.value.trim().toUpperCase();
      if (kind === "VEVENT" && nested === 0) {
        if (event) skipped++; // the previous VEVENT never ended
        event = [];
      } else if (event) nested++;
    } else if (prop.name === "END") {
      if (!event) continue;
      if (nested > 0) nested--;
      else if (prop.value.trim().toUpperCase() === "VEVENT") {
        finish(event);
        event = null;
      }
    } else if (event && nested === 0) event.push(prop);
  }
  if (event) skipped++;
  return { tasks: [...byId.values()], skipped };
}
