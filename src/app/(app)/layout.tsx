import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "@/components/layout/account-menu";
import { AppNav, NavLinks } from "@/components/layout/app-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { SearchButton } from "@/components/layout/search-button";
import { SidebarProjects } from "@/components/layout/sidebar-projects";
import { Brand } from "@/components/ui/logo";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider>
      <div className="min-h-dvh md:flex">
        <aside className="sticky top-0 z-10 flex items-center gap-1 border-b border-line bg-bg px-4 py-1.5 md:h-dvh md:w-[220px] md:shrink-0 md:flex-col md:items-stretch md:gap-0 md:overflow-y-auto md:border-r md:border-b-0 md:px-3 md:py-4">
          <Link href="/dashboard" aria-label="Nexora, ke Dashboard" className="rounded-md md:px-2 md:pb-4">
            <Brand />
          </Link>
          <div className="ml-auto md:hidden">
            <SearchButton variant="icon" />
          </div>
          <div className="mb-3 hidden md:block">
            <SearchButton variant="field" />
          </div>
          <Suspense fallback={<NavLinks />}>
            <AppNav />
          </Suspense>
          <Suspense fallback={null}>
            <SidebarProjects />
          </Suspense>
          <div className="md:mt-auto">
            <Suspense fallback={<div className="size-11 md:h-11 md:w-full" aria-hidden />}>
              <AccountMenu />
            </Suspense>
          </div>
        </aside>
        {/* min-w-0: a flex item otherwise refuses to shrink below its widest unwrappable text (truncated summaries). */}
        <main className="mx-auto w-full min-w-0 max-w-[96rem] flex-1 px-4 pt-6 pb-24 md:px-8 md:py-8">{children}</main>
      </div>
      <CommandPalette />
    </ToastProvider>
  );
}
