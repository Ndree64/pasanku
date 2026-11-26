import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { getLearningPathData, listVocabularies } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui/States";
import { KamusView } from "@/features/learning/KamusView";

async function LearnerKamusContent() {
  const user = await requireRole(["learner"]);
  const vocabularies = listVocabularies(false);
  const pathData = getLearningPathData(user.id);

  return (
    <AppShell user={user} totalXp={pathData.totalXp}>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
            Kamus Bahasa Pasan
          </h1>
          <p className="text-sm text-ink-soft">
            Kumpulan kosakata yang telah diperiksa dan diterbitkan untuk
            membantu belajarmu.
          </p>
        </div>

        <KamusView vocabularies={vocabularies} />
      </div>
    </AppShell>
  );
}

export default function LearnerKamusPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <LearnerKamusContent />
    </Suspense>
  );
}
