/** Circular progress: done / total tasks. Optionally a label (e.g. "29%") sits in the middle. */
export function ProgressRing({
  done,
  total,
  size = 22,
  color = "var(--accent)",
  label,
}: {
  done: number;
  total: number;
  size?: number;
  /** Arc colour while in progress (a finished ring is always sage). */
  color?: string;
  /** Text centred inside the ring. */
  label?: string;
}) {
  const stroke = size >= 40 ? 3 : 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  const ring = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={total === 0 ? "Belum ada task" : `${done} dari ${total} task selesai`}
      className="shrink-0 -rotate-90"
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
      {pct > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={pct >= 1 ? "var(--ok)" : color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} className="ring-fill"
        />
      )}
    </svg>
  );
  if (!label) return ring;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {ring}
      <span aria-hidden className="absolute font-mono text-[11px] tabular-nums">
        {label}
      </span>
    </span>
  );
}
