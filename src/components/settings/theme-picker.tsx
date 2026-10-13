"use client";

import { useSyncExternalStore } from "react";

const KEY = "nexora-theme";
const THEMES = [
  { value: "dark", label: "Gelap" },
  { value: "light", label: "Terang" },
  { value: "system", label: "Ikuti sistem" },
] as const;
type Theme = (typeof THEMES)[number]["value"];

const listeners = new Set<() => void>();
function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "system" ? t : "dark";
  } catch {
    return "dark";
  }
}
function write(theme: Theme) {
  try {
    if (theme === "dark") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // storage blocked: the choice still applies until the page reloads
  }
  if (theme === "dark") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  listeners.forEach((l) => l());
}

/** SET-02 theme. Stored per device (localStorage), applied at once and before paint on the next load (layout.tsx). */
export function ThemePicker() {
  const theme = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    read,
    () => "dark" as Theme,
  );
  return (
    <fieldset>
      <legend className="sr-only">Tema</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-md border border-line bg-bg p-1">
        {THEMES.map((t) => (
          <label
            key={t.value}
            className={
              "inline-flex min-h-8 cursor-pointer items-center rounded-sm px-3 text-[13px] transition-colors pointer-coarse:min-h-11 has-[:focus-visible]:outline has-[:focus-visible]:outline-accent " +
              (theme === t.value ? "bg-raised font-medium text-fg" : "text-muted hover:text-fg")
            }
          >
            <input type="radio" name="theme" value={t.value} checked={theme === t.value} onChange={() => write(t.value)} className="sr-only" />
            {t.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
