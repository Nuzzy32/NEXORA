import type { Metadata } from "next";
import { LoginForm } from "@/components/layout/login-form";
import { Brand } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      {/* Left: the product in one sentence (desktop only; phones get it above the form). */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-12 lg:flex xl:p-16">
        <Brand className="relative" />
        <div className="relative">
          <p className="font-mono text-[11px] tracking-[0.04em] text-faint uppercase">Personal intelligence workspace</p>
          <h1 className="mt-5 max-w-xl text-[2.5rem] leading-[3rem] font-semibold tracking-[-0.03em] xl:text-[3rem] xl:leading-[3.5rem]">
            Your personal intelligence, <span className="text-accent">connected.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            Tugas, proyek, dan catatan di satu tempat yang sepenuhnya milikmu. Tanpa tim, tanpa keramaian.
          </p>
        </div>
        <p className="relative font-mono text-[11px] text-faint">Dibuat untuk satu orang.</p>
      </section>

      <section className="grid place-items-center px-5 py-12">
        <div className="rise w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
            <p className="mt-5 text-[1.5rem] leading-8 font-semibold tracking-[-0.02em]">
              Your personal intelligence, <span className="text-accent">connected.</span>
            </p>
          </div>
          <div className="rounded-lg border border-line-strong bg-surface p-6">
            <h2 className="text-[20px] leading-7 font-semibold tracking-[-0.02em]">Masuk</h2>
            <p className="mt-1 mb-6 text-sm text-muted">Akses hanya untuk pemilik akun.</p>
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
