import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProjectNotFound() {
  return (
    <EmptyState title="Proyek tidak ditemukan" hint="Proyek ini mungkin sudah dihapus, atau tautannya salah.">
      <Link href="/projects" className={buttonClass("ghost")}>Kembali ke Projects</Link>
    </EmptyState>
  );
}
