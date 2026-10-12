/** Nexora mark: an "N" drawn as one continuous stroke, in a softly tinted tile. */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect width="24" height="24" rx="4" fill="var(--accent)" fillOpacity="0.14" />
      <rect x="0.5" y="0.5" width="23" height="23" rx="3.5" stroke="var(--accent)" strokeOpacity="0.45" />
      <path d="M8 16.5v-9l8 9v-9" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={"inline-flex items-center gap-2.5 " + className}>
      <LogoMark />
      <span className="text-[15px] leading-none font-semibold tracking-[0.12em] uppercase">Nexora</span>
    </span>
  );
}
