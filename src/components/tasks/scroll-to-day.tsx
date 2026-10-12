"use client";

import { useEffect, useRef } from "react";

/**
 * On phones the day panel sits below the month grid, so tapping a date would seem to do nothing.
 * Scrolls to the panel when `enabled` (the URL carries an explicit day) and the screen is below `lg`.
 */
export function ScrollToDay({ day, enabled }: { day: string; enabled: boolean }) {
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || !window.matchMedia("(max-width: 1023px)").matches) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anchor.current?.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
  }, [day, enabled]);
  return <div ref={anchor} aria-hidden className="scroll-mt-16" />;
}
