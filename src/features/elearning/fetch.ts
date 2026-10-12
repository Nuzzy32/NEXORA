// Reads the Moodle iCal export. Server-side only: the URL holds a secret token, so it must never reach
// a log, a thrown message, a response or the client. Every error below is a fixed Indonesian sentence.

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 2 * 1024 * 1024;
const HOST_SUFFIX = ".unair.ac.id";

/** A failure whose message is safe to show the user (and to store in integration_syncs.last_error). */
export class ElearningError extends Error {}

/** Parses and vets the configured URL; throws without echoing it. */
export function checkIcalUrl(raw: string | undefined): URL {
  const value = raw?.trim();
  if (!value) throw new ElearningError("URL e-learning belum diisi");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ElearningError("URL e-learning tidak valid");
  }
  if (url.protocol !== "https:" || !url.hostname.toLowerCase().endsWith(HOST_SUFFIX) || url.username || url.password) {
    throw new ElearningError("URL e-learning tidak valid: harus https dan berada di domain unair.ac.id");
  }
  return url;
}

async function readLimited(res: Response): Promise<string> {
  const tooBig = () => new ElearningError("Kalender e-learning terlalu besar");
  if (Number(res.headers.get("content-length")) > MAX_BYTES) throw tooBig();
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw tooBig();
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(all);
}

/** Downloads the calendar text. `fetchImpl` is injectable for tests. */
export async function fetchCalendar(raw: string | undefined, fetchImpl: typeof fetch = fetch): Promise<string> {
  const url = checkIcalUrl(raw);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "text/calendar, text/plain" },
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new ElearningError(
      timedOut ? "Tidak bisa menghubungi e-learning (waktu habis)" : "Tidak bisa menghubungi e-learning",
    );
  }
  if (!res.ok) throw new ElearningError(`Tidak bisa mengambil kalender e-learning (HTTP ${res.status})`);
  const type = res.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "text/calendar" && type !== "text/plain") throw new ElearningError("Respons e-learning bukan kalender");
  let text: string;
  try {
    text = await readLimited(res);
  } catch (e) {
    if (e instanceof ElearningError) throw e;
    throw new ElearningError("Tidak bisa membaca kalender e-learning");
  }
  if (!/^BEGIN:VCALENDAR/im.test(text)) throw new ElearningError("Respons e-learning bukan kalender iCal");
  return text;
}
