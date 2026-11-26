import { Suspense } from "react";
import Link from "next/link";
import { Award, BookOpen, ShieldAlert, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getLearningPathData } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { Card, ProgressBar, XpBadge } from "@/components/ui/Primitives";
import { PageSkeleton } from "@/components/ui/States";
import { LearningPathView } from "@/features/learning/LearningPathView";

async function LearnerHomeContent() {
  const user = await requireRole(["learner"]);
  const pathData = getLearningPathData(user.id);

  const pendingRemedialCount = pathData.units.reduce(
    (sum, u) => sum + u.pendingRemedials.length,
    0
  );

  const rightRail = (
    <>
      <Card focal className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-soft">
              Level {pathData.level.level}
            </p>
            <h2 className="font-display text-lg font-extrabold text-ink">
              {pathData.level.title}
            </h2>
          </div>
          <XpBadge amount={pathData.totalXp} />
        </div>
        <ProgressBar
          value={pathData.level.progressPercent}
          max={100}
          color="accent"
        />
        <p className="text-xs text-ink-soft">
          Menuju level berikutnya: {pathData.totalXp} /{" "}
          {pathData.level.nextLevelXp} XP
        </p>
      </Card>

      <Card className="space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Sparkles className="w-4 h-4 text-brand" aria-hidden="true" />
          Progres Kurikulum
        </div>
        <p className="text-sm text-ink-soft">
          <strong className="text-ink">{pathData.completedLessonsCount}</strong>{" "}
          dari{" "}
          <strong className="text-ink">{pathData.totalPublishedLessons}</strong>{" "}
          lesson terbit telah diselesaikan.
        </p>
        <ProgressBar
          value={pathData.completedLessonsCount}
          max={Math.max(1, pathData.totalPublishedLessons)}
          color="success"
        />
      </Card>

      {pendingRemedialCount > 0 ? (
        <div className="bg-accent-tint border border-accent-border rounded-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <ShieldAlert
              className="w-4 h-4 text-accent-lip"
              aria-hidden="true"
            />
            Tugas Remedial Aktif ({pendingRemedialCount})
          </div>
          <p className="text-xs text-ink-soft">
            Selesaikan lesson remedial pada jalur belajar untuk membuka kembali
            Quiz Unit.
          </p>
        </div>
      ) : null}

      <Card className="space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <BookOpen className="w-4 h-4 text-brand" aria-hidden="true" />
          Butuh Referensi Cepat?
        </div>
        <p className="text-xs text-ink-soft">
          Lihat seluruh kosakata Bahasa Pasan dan contoh kalimat di Kamus.
        </p>
        <Link
          href="/learner/kamus"
          className="inline-flex items-center justify-center w-full min-h-[42px] rounded-control border-2 border-border-control bg-surface-soft text-xs font-extrabold text-ink hover:bg-surface-highlight"
        >
          Buka Kamus Bahasa Pasan
        </Link>
      </Card>
    </>
  );

  return (
    <AppShell user={user} totalXp={pathData.totalXp} rightRail={rightRail}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
              Jalur Belajar Bahasa Pasan
            </h1>
            <p className="text-sm text-ink-soft">
              Ikuti lesson secara berurutan, lalu taklukkan Quiz Unit untuk
              membuka unit berikutnya.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Award className="w-5 h-5 text-accent-lip" aria-hidden="true" />
            <XpBadge amount={pathData.totalXp} />
          </div>
        </div>

        <LearningPathView data={pathData} />
      </div>
    </AppShell>
  );
}

export default function LearnerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <LearnerHomeContent />
    </Suspense>
  );
}
