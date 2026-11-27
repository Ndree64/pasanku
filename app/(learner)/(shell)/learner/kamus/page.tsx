import { Suspense } from "react";
import { listVocabularies } from "@/lib/data/repository";
import { KamusSkeleton } from "@/components/ui/States";
import { KamusView } from "@/features/learning/KamusView";

async function LearnerKamusContent() {
  const vocabularies = await listVocabularies(false);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
          Kamus Bahasa Pasan
        </h1>
        <p className="text-sm text-ink-soft">
          Kumpulan kosakata yang telah diperiksa dan diterbitkan untuk membantu
          belajarmu.
        </p>
      </div>

      <KamusView vocabularies={vocabularies} />
    </div>
  );
}

export default function LearnerKamusPage() {
  return (
    <Suspense fallback={<KamusSkeleton />}>
      <LearnerKamusContent />
    </Suspense>
  );
}
