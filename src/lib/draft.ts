// Local drafts for "create" dialogs: closing by accident (Esc) must not lose typed text.
// Everything here is best-effort: storage can be missing, full or blocked, and none of that may break the form.

const PREFIX = "nexora:draft:";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type DraftValues = Record<string, string>;
export type DraftStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** localStorage, or undefined when the browser blocks it (private mode, site data disabled). */
export function browserStore(): DraftStore | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readDraft(store: DraftStore | undefined, key: string, now = Date.now()): DraftValues | null {
  try {
    const raw = store?.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const { t, v } = (parsed ?? {}) as { t?: unknown; v?: unknown };
    if (typeof t !== "number" || now - t > MAX_AGE_MS || typeof v !== "object" || v === null) {
      store?.removeItem(PREFIX + key);
      return null;
    }
    const values = Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === "string")) as DraftValues;
    return Object.keys(values).length > 0 ? values : null;
  } catch {
    return null;
  }
}

export function writeDraft(store: DraftStore | undefined, key: string, values: DraftValues, now = Date.now()) {
  try {
    store?.setItem(PREFIX + key, JSON.stringify({ t: now, v: values }));
  } catch {
    // quota exceeded or blocked: the draft is simply not kept
  }
}

export function removeDraft(store: DraftStore | undefined, key: string) {
  try {
    store?.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
