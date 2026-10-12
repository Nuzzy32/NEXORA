import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionSkeleton } from "@/components/settings/parts";
import { DataSection, IntegrationsSection, PrefsSection } from "@/components/settings/sections";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        eyebrow="Pengaturan"
        description="Status koneksi, preferensi workspace, serta ekspor dan penghapusan data milikmu."
      />
      <div className="mt-6 max-w-4xl space-y-5">
        <Suspense fallback={<SectionSkeleton height={420} />}>
          <IntegrationsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height={300} />}>
          <PrefsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height={360} />}>
          <DataSection />
        </Suspense>
      </div>
    </>
  );
}
