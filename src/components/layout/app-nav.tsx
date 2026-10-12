"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";

// Only routes that actually exist are listed (PRD: no false capability claims).
// `desktopOnly`: the mobile tab bar is full at five, so Learning and Settings sit in the top bar there (AccountMenu).
const ITEMS: { href: string; label: string; icon: IconName; desktopOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/ai", label: "AI Workspace", icon: "ai" },
  { href: "/memory", label: "Memory", icon: "memory" },
  { href: "/learning", label: "Learning", icon: "book", desktopOnly: true },
  { href: "/settings", label: "Settings", icon: "settings", desktopOnly: true },
];

/**
 * Mobile: fixed bottom tab bar (thumb reach, 56px targets). Desktop: sidebar list (36px rows, cyan pip on the active one).
 * `pathname` marks the active item; rendered without it as the Suspense fallback.
 */
export function NavLinks({ pathname }: { pathname?: string }) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] md:static md:flex-col md:gap-0.5 md:border-0 md:pb-0"
    >
      {ITEMS.map(({ href, label, icon, desktopOnly }) => {
        const active = pathname !== undefined && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              (desktopOnly ? "max-md:hidden " : "") +
              "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] transition-colors " +
              "md:min-h-9 md:flex-none md:flex-row md:justify-start md:gap-2.5 md:rounded-md md:px-2 md:text-[13px] " +
              (active ? "text-fg md:bg-raised" : "text-muted hover:text-fg md:hover:bg-raised/60")
            }
          >
            {active && <span aria-hidden className="absolute top-0 h-0.5 w-8 bg-accent md:inset-y-2 md:top-auto md:left-0 md:h-auto md:w-0.5 md:rounded-full" />}
            <Icon name={icon} className={"size-5 shrink-0 md:size-4 " + (active ? "text-accent" : "")} />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** usePathname() depends on dynamic route params (e.g. /projects/[id]), so render this inside <Suspense>. */
export function AppNav() {
  return <NavLinks pathname={usePathname()} />;
}
