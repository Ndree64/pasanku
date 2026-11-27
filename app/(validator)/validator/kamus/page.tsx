import { Suspense } from "react";
import { listVocabularies } from "@/lib/data/repository";
import { KamusSkeleton } from "@/components/ui/States";
import { KamusView } from "@/features/learning/KamusView";

async function ValidatorKamusContent() {
  const vocabularies = await listVocabularies(true);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
          Referensi Kamus Bahasa Pasan
        </h1>
        <p className="text-sm text-ink-soft">
          Menampilkan seluruh kosakata (baik yang sudah Terbit maupun yang sedang
          Menunggu Review) sebagai acuan validasi.
        </p>
      </div>

      <KamusView vocabularies={vocabularies} showValidationStatus />
    </div>
  );
}

export default function ValidatorKamusPage() {
  return (
    <Suspense fallback={<KamusSkeleton />}>
      <ValidatorKamusContent />
    </Suspense>
  );
}
