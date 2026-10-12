import type { ReactNode } from "react";

export const code = "rounded-sm bg-raised px-1 py-px font-mono text-[11px] text-fg";

type Tone = "ok" | "off" | "warn" | "danger" | "info";
const TONE: Record<Tone, { text: string; dot: string }> = {
  ok: { text: "text-ok", dot: "bg-ok" },
  off: { text: "text-muted", dot: "bg-faint" },
  warn: { text: "text-warn", dot: "bg-warn" },
  danger: { text: "text-danger", dot: "bg-danger" },
  info: { text: "text-info", dot: "bg-info" },
};

/** Status as dot + word, never colour alone. */
export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-0.5 font-mono text-[11px] ${TONE[tone].text}`}>
      <i aria-hidden className={`size-1.5 rounded-full ${TONE[tone].dot}`} />
      {children}
    </span>
  );
}

/** A secret is only ever reported as filled or not. Its value never reaches this component. */
export function SecretState({ name, filled }: { name: string; filled: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
      <code className={code}>{name}</code>
      <span className={filled ? "text-ok" : "text-muted"}>{filled ? "Terisi" : "Belum diisi"}</span>
      <span className="text-faint">· nilainya tidak pernah ditampilkan</span>
    </p>
  );
}

/** One line in a settings card: name and detail on the left, status and action on the right. */
export function SettingRow({
  name,
  status,
  action,
  children,
}: {
  name: string;
  status?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 py-4">
      <div className="min-w-0 flex-1 basis-72 space-y-1.5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[13px] font-medium">{name}</span>
          {status}
        </p>
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </li>
  );
}

export function SectionSkeleton({ height = 160 }: { height?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat"
      style={{ height }}
      className="rounded-lg border border-line bg-surface motion-safe:animate-pulse"
    />
  );
}

export const note = "text-[13px] leading-5 text-muted";
