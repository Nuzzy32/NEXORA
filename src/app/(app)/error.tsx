"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="max-w-xl rounded-lg border border-danger/30 bg-danger/5 p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em]">
        <Icon name="warning" className="size-4 text-danger" />
        Terjadi kesalahan
      </h2>
      <p className="mt-1.5 text-[13px] text-muted">Halaman ini gagal dimuat. Data kamu tidak berubah.</p>
      <Button onClick={reset} variant="ghost" className="mt-4">
        Coba lagi
      </Button>
      {error.digest && <p className="mt-3 font-mono text-[11px] text-muted">Kode: {error.digest}</p>}
    </div>
  );
}
