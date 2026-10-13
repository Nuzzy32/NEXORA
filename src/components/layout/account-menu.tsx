import Link from "next/link";
import { signOut } from "@/features/auth/actions";
import { Icon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/session";

/** Reads the session, so it must render inside <Suspense> (Cache Components). */
export async function AccountMenu() {
  const { user } = await requireUser();
  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <div className="flex items-center md:gap-2.5 md:rounded-md md:border md:border-line md:bg-surface md:py-1.5 md:pr-1.5 md:pl-2">
      <span aria-hidden className="hidden size-7 shrink-0 place-items-center rounded-md bg-raised font-mono text-xs font-medium md:grid">
        {initial}
      </span>
      <p className="hidden min-w-0 flex-1 truncate text-xs text-muted md:block" title={user.email ?? undefined}>
        {user.email}
      </p>
      <Link
        href="/learning"
        aria-label="Learning"
        title="Learning"
        className="grid size-11 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg md:hidden"
      >
        <Icon name="book" className="size-[18px]" />
      </Link>
      <Link
        href="/courses"
        aria-label="Kuliah"
        title="Kuliah"
        className="grid size-11 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg md:hidden"
      >
        <Icon name="calendar" className="size-[18px]" />
      </Link>
      <Link
        href="/settings"
        aria-label="Settings"
        title="Settings"
        className="grid size-11 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg md:hidden"
      >
        <Icon name="settings" className="size-[18px]" />
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Keluar"
          title="Keluar"
          className="grid size-11 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-fg md:size-9"
        >
          <Icon name="logout" className="size-[18px]" />
        </button>
      </form>
    </div>
  );
}
