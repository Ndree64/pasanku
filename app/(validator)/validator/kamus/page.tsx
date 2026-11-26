import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { listVocabularies } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui/States";
import { KamusView } from "@/features/learning/KamusView";

async function ValidatorKamusContent() {
  const user = await requireRole(["validator"]);
  const vocabularies = listVocabularies(true);

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
            Referensi Kamus Bahasa Pasan
          </h1>
          <p className="text-sm text-ink-soft">
            Menampilkan seluruh kosakata (baik yang sudah Terbit maupun yang
            sedang Menunggu Review) sebagai acuan validasi.
          </p>
        </div>

        <KamusView vocabularies={vocabularies} showValidationStatus />
      </div>
    </AppShell>
  );
}

export default function ValidatorKamusPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <ValidatorKamusContent />
    </Suspense>
  );
}
