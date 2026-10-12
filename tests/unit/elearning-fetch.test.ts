import { describe, expect, it, vi } from "vitest";
import { ElearningError, checkIcalUrl, fetchCalendar } from "@/features/elearning/fetch";

const URL_OK = "https://hebat.elearning.unair.ac.id/calendar/export_execute.php?userid=1&authtoken=SECRET123&preset_what=all";
const ICS = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";
const respond = (body: BodyInit | null, init: ResponseInit = { headers: { "content-type": "text/calendar; charset=utf-8" } }) =>
  vi.fn(async () => new Response(body, init)) as unknown as typeof fetch;

async function message(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(ElearningError);
    return (e as Error).message;
  }
  throw new Error("expected a rejection");
}

describe("checkIcalUrl", () => {
  it("rejects missing, malformed, http and foreign hosts without echoing the URL", () => {
    for (const bad of [undefined, "", "  ", "bukan url", "http://hebat.elearning.unair.ac.id/x?authtoken=SECRET123", "https://evil.example.com/x?authtoken=SECRET123", "https://unair.ac.id.evil.com/?authtoken=SECRET123", "https://evilunair.ac.id/?authtoken=SECRET123", "https://u:p@hebat.elearning.unair.ac.id/x"]) {
      let msg = "";
      try {
        checkIcalUrl(bad);
      } catch (e) {
        msg = (e as Error).message;
      }
      expect(msg, String(bad)).not.toBe("");
      expect(msg).not.toMatch(/SECRET123|evil|https?:/);
    }
  });

  it("says plainly when it is not configured", () => {
    expect(() => checkIcalUrl(undefined)).toThrow("URL e-learning belum diisi");
  });

  it("accepts an https unair.ac.id host", () => {
    expect(checkIcalUrl(URL_OK).hostname).toBe("hebat.elearning.unair.ac.id");
  });
});

describe("fetchCalendar", () => {
  it("returns the text and asks fetch not to follow redirects", async () => {
    const f = respond(ICS);
    expect(await fetchCalendar(URL_OK, f)).toBe(ICS);
    const init = vi.mocked(f).mock.calls[0][1];
    expect(init?.redirect).toBe("error");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("accepts text/plain", async () => {
    expect(await fetchCalendar(URL_OK, respond(ICS, { headers: { "content-type": "text/plain" } }))).toBe(ICS);
  });

  it("does not call fetch for a bad host", async () => {
    const f = respond(ICS);
    await message(fetchCalendar("https://evil.example.com/x", f));
    expect(f).not.toHaveBeenCalled();
  });

  it("reports an HTTP error with the status only", async () => {
    const msg = await message(fetchCalendar(URL_OK, respond("no", { status: 403, headers: { "content-type": "text/html" } })));
    expect(msg).toBe("Tidak bisa mengambil kalender e-learning (HTTP 403)");
  });

  it("rejects other content types and bodies that are not a calendar", async () => {
    await message(fetchCalendar(URL_OK, respond("<html></html>", { headers: { "content-type": "text/html" } })));
    await message(fetchCalendar(URL_OK, respond(ICS, { headers: { "content-type": "application/octet-stream" } })));
    await message(fetchCalendar(URL_OK, respond("<html>login</html>", { headers: { "content-type": "text/plain" } })));
  });

  it("stops reading a body over 2 MB", async () => {
    const big = "x".repeat(2 * 1024 * 1024 + 1);
    expect(await message(fetchCalendar(URL_OK, respond(big)))).toBe("Kalender e-learning terlalu besar");
    const headerOnly = respond("x", { headers: { "content-type": "text/calendar", "content-length": String(3 * 1024 * 1024) } });
    expect(await message(fetchCalendar(URL_OK, headerOnly))).toBe("Kalender e-learning terlalu besar");
  });

  it("turns network errors and timeouts into generic messages without the URL", async () => {
    const boom = vi.fn(async () => {
      throw new TypeError(`fetch failed for ${URL_OK}`);
    }) as unknown as typeof fetch;
    const msg = await message(fetchCalendar(URL_OK, boom));
    expect(msg).toBe("Tidak bisa menghubungi e-learning");
    expect(msg).not.toContain("SECRET123");
    const slow = vi.fn(async () => {
      throw new DOMException("timed out", "TimeoutError");
    }) as unknown as typeof fetch;
    expect(await message(fetchCalendar(URL_OK, slow))).toBe("Tidak bisa menghubungi e-learning (waktu habis)");
  });
});
