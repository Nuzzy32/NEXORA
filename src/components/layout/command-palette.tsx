"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { searchAll } from "@/features/search/actions";
import {
  buildPalette,
  MIN_QUERY_LENGTH,
  moveActive,
  type PaletteOption,
  type SearchResults,
} from "@/features/search/schema";
import { deleteTask, quickAddTask } from "@/features/tasks/actions";
import { IDLE } from "@/lib/action-state";
import { searchTerm } from "@/lib/search";

const OPEN_EVENT = "nexora:open-palette";
const DEBOUNCE_MS = 200;
const TYPING = "input, textarea, select, [contenteditable]";

const ICON = {
  go: "arrowRight",
  task: "tasks",
  project: "projects",
  note: "note",
  create: "plus",
} as const satisfies Record<PaletteOption["kind"], IconName>;

/** What came back for one search term; `data` is null when it failed. */
type Outcome = { term: string; data: SearchResults | null };

/**
 * Mount once in the layout, inside <ToastProvider>. Opens on Cmd/Ctrl+K, on "/" (unless the user is typing
 * or another dialog is open) and on the "nexora:open-palette" window event. The native <dialog> gives the
 * focus trap, Esc and focus restoration; the heavy body only exists while it is open, so closing resets it.
 */
export function CommandPalette() {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => {
      const dialog = ref.current;
      if (!dialog || dialog.open) return;
      dialog.showModal(); // before the body mounts, so its autoFocus lands inside an open dialog
      setOpen(true);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.repeat || e.isComposing || e.altKey) return;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault(); // browsers bind Ctrl+K to their own search box
        if (ref.current?.open) ref.current.close();
        else show();
      } else if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof Element && e.target.closest(TYPING)) &&
        !document.querySelector("dialog[open]")
      ) {
        e.preventDefault(); // otherwise the "/" would be typed into the freshly focused input
        show();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label="Pencarian global"
      onClose={(e) => setOpen(e.currentTarget.open)}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="mx-auto mt-4 mb-auto w-[min(40rem,calc(100%-2rem))] max-w-none overflow-hidden rounded-lg border border-line-strong bg-overlay p-0 text-fg shadow-[0_24px_64px_-16px_rgb(0_0_0/0.75)] md:mt-[15dvh]"
    >
      {open && <PaletteBody close={() => ref.current?.close()} />}
    </dialog>
  );
}

// Same contract as the task list: a failed delete must throw so the toast reports it.
async function undoCreate(id: string) {
  const result = await deleteTask(id);
  if (result.status === "error") throw new Error(result.message);
}

function PaletteBody({ close }: { close: () => void }) {
  const router = useRouter();
  const { notify } = useToast();
  const uid = useId();
  const listboxId = `${uid}-list`;
  const optionId = (key: string) => `${uid}-${key}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [picked, setPicked] = useState({ list: "", index: 0 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const term = searchTerm(query);
  const searching = term.length >= MIN_QUERY_LENGTH;
  const current = outcome?.term === term ? outcome : null; // the outcome for what is typed right now
  const loading = searching && current === null;
  const failed = searching && current !== null && current.data === null;
  // Results of the previous term stay on screen while the next ones load, so the list does not flicker.
  const results = outcome?.data ?? null;
  const total = results ? results.tasks.length + results.projects.length + results.notes.length : 0;
  const empty = searching && !loading && !failed && total === 0;

  const { sections, options } = buildPalette(query, results);
  // The first option is active whenever the list changes; keying on option identity keeps it
  // where the user put it while the same rows merely get re-fetched.
  const listKey = options.map((o) => o.key).join(" ");
  const index = picked.list === listKey ? picked.index : 0;
  const active: PaletteOption | undefined = options[index];
  const choose = (i: number) => setPicked({ list: listKey, index: i });

  const update = (value: string) => {
    setQuery(value);
    setCreateError(null);
    if (searchTerm(value).length < MIN_QUERY_LENGTH) setOutcome(null); // never show old results for unrelated text
  };

  // Debounced search. Cleanup marks the run stale, so a slow response for an older term is dropped.
  // Next runs Server Actions one at a time, so a stale request still occupies the queue until it finishes.
  useEffect(() => {
    if (!searching) return;
    let stale = false;
    const timer = window.setTimeout(() => {
      searchAll(term).then(
        (data) => !stale && setOutcome({ term, data }),
        () => !stale && setOutcome({ term, data: null }),
      );
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [searching, term, attempt]);

  // A new list starts at the top, so the (auto-)active first row is never scrolled out of sight.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [listKey]);

  const retry = () => {
    setOutcome(null);
    setAttempt((n) => n + 1);
    inputRef.current?.focus(); // a keyboard user pressed the button; the button is about to disappear
  };

  const fail = (message: string) => {
    // The page behind a modal dialog is inert, so the toast alone would be dimmed and unannounced: say it inline too.
    notify(message, { tone: "error" });
    setCreateError(message);
  };

  const createTask = async (title: string) => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const form = new FormData();
      form.set("title", title);
      const state = await quickAddTask(null, null, IDLE, form);
      if (state.status === "ok") {
        const id = state.id;
        close();
        notify(state.message ?? `Ditambahkan: ${title}`, {
          action: id ? { label: "Urungkan", run: () => undoCreate(id) } : undefined,
        });
      } else {
        fail(state.fieldErrors?.title?.[0] ?? state.message ?? "Task gagal ditambahkan.");
      }
    } catch {
      fail("Task gagal ditambahkan.");
    } finally {
      setCreating(false);
    }
  };

  const activate = (option: PaletteOption) => {
    if (option.kind === "create") {
      void createTask(option.taskTitle);
      return;
    }
    close();
    router.push(option.href);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "Home":
      case "End": {
        e.preventDefault();
        const next = moveActive(index, e.key, options.length);
        const option = options[next];
        if (!option) return;
        choose(next);
        // Only keyboard moves scroll; doing it on hover would shift rows under the pointer.
        document.getElementById(optionId(option.key))?.scrollIntoView({ block: "nearest" });
        return;
      }
      case "Enter":
        if (active) {
          e.preventDefault();
          activate(active);
        }
    }
  };

  // Mouse presses must not pull focus out of the input (the combobox keeps it); the input itself stays clickable.
  return (
    <div
      onMouseDown={(e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()}
      onKeyDown={(e) => {
        // Esc clears the text first and only an empty box lets the dialog close.
        if (e.key === "Escape" && query !== "" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          update("");
        }
      }}
    >
      <div className="relative flex h-12 items-center gap-3 px-4">
        <Icon name="search" className="size-4 shrink-0 text-muted" />
        {/* The global :focus-visible ring is unlayered, so only !important beats it; the header is the focus cue. */}
        <input
          ref={inputRef}
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listboxId}
          aria-activedescendant={active ? optionId(active.key) : undefined}
          aria-autocomplete="list"
          aria-label="Cari task, proyek, atau catatan"
          placeholder="Cari task, proyek, catatan…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          value={query}
          onChange={(e) => update(e.target.value)}
          onKeyDown={onInputKeyDown}
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-hidden! shadow-none! placeholder:text-faint"
        />
        <kbd aria-hidden className="kbd shrink-0 max-md:hidden">Esc</kbd>
        {loading && <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-accent motion-safe:animate-pulse" />}
      </div>

      <p role="status" className="sr-only">
        {loading ? "Mencari…" : empty ? "Tidak ada hasil" : searching && !failed ? `${total} hasil` : ""}
      </p>

      {failed && (
        <div role="alert" className="flex items-center justify-between gap-3 px-4 py-2 text-[13px]">
          <span className="text-danger">Pencarian gagal. Coba lagi.</span>
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-9 shrink-0 items-center rounded-md px-3 font-medium text-accent hover:bg-surface pointer-coarse:min-h-11"
          >
            Coba lagi
          </button>
        </div>
      )}
      {empty && <p className="px-4 pt-3 pb-1 text-[13px] text-muted">Tidak ada hasil untuk “{term}”</p>}

      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label="Hasil pencarian"
        aria-busy={loading}
        className="max-h-[min(40vh,28rem)] overflow-y-auto px-0 pb-1 md:max-h-[min(60vh,28rem)]"
      >
        {sections.map((section) => {
          const headingId = `${uid}-h-${section.id}`;
          return (
            <div key={section.id} role="group" aria-labelledby={headingId}>
              <div
                id={headingId}
                aria-hidden
                className="px-4 pt-3 pb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-faint uppercase"
              >
                {section.label}
              </div>
              {section.options.map((option, j) => {
                const i = section.start + j;
                const hint = option.kind === "create" ? (creating ? "Menambahkan…" : undefined) : option.hint;
                return (
                  <div
                    key={option.key}
                    id={optionId(option.key)}
                    role="option"
                    aria-selected={i === index}
                    onClick={() => activate(option)}
                    onMouseMove={() => i !== index && choose(i)}
                    // scroll-mt keeps a section's heading in view when its first row is scrolled to.
                    className={
                      "flex h-9 cursor-pointer items-center gap-3 px-4 text-[13px] transition-colors duration-150 aria-selected:bg-line-strong/60 aria-selected:shadow-[inset_4px_0_0_var(--accent)] pointer-coarse:h-auto pointer-coarse:min-h-12" +
                      (j === 0 ? " scroll-mt-8" : "")
                    }
                  >
                    <Icon name={ICON[option.kind]} className="size-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{option.title}</span>
                    {hint && <span className="max-w-[40%] shrink-0 truncate font-mono text-[11px] text-muted">{hint}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {!searching && term !== "" && (
        <p className="px-4 pb-3 text-[13px] text-muted">Ketik minimal {MIN_QUERY_LENGTH} karakter untuk mencari.</p>
      )}
      {createError && (
        <p role="alert" className="border-t border-line-strong px-4 py-2 text-[13px] text-danger">
          {createError}
        </p>
      )}
      <div
        aria-hidden
        className="hidden items-center gap-4 border-t border-line-strong bg-surface px-4 py-2 font-mono text-[11px] text-faint md:pointer-fine:flex"
      >
        <span className="inline-flex items-center gap-1.5">
          <kbd className="kbd">↑</kbd>
          <kbd className="kbd">↓</kbd>
          pilih
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="kbd">↵</kbd>
          buka
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="kbd">Esc</kbd>
          tutup
        </span>
      </div>
    </div>
  );
}
