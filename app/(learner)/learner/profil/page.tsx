import { Suspense } from "react";
import { Award, CheckCircle2, LogOut, Medal, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { requireRole } from "@/lib/auth/session";
import { getLearnerProfileDetails } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { Card, ProgressBar, XpBadge } from "@/components/ui/Primitives";
import { PageSkeleton } from "@/components/ui/States";

async function ProfilContent() {
  const user = await requireRole(["learner"]);
  const details = getLearnerProfileDetails(user.id);

  return (
    <AppShell user={user} totalXp={details.totalXp}>
      <div className="space-y-6">
        {/* Kartu Identitas */}
        <Card focal className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-chip bg-surface-highlight text-brand text-xs font-extrabold uppercase">
              Level {details.level.level} · {details.level.title}
            </span>
            <h1 className="font-display text-2xl font-extrabold text-ink">
              {user.fullName}
            </h1>
            <p className="text-sm text-ink-soft">{user.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <XpBadge amount={details.totalXp} />
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-control border-2 border-border-control bg-surface-soft text-ink text-xs font-extrabold hover:bg-brand-tint hover:text-brand cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Keluar
              </button>
            </form>
          </div>
        </Card>

        {/* Ringkasan Angka */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          <Card className="space-y-1">
            <p className="text-xs font-bold text-ink-soft">Lesson Lulus</p>
            <p className="font-display text-2xl font-extrabold text-ink">
              {details.completedLessonsCount}
            </p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs font-bold text-ink-soft">Unit Terbuka</p>
            <p className="font-display text-2xl font-extrabold text-ink">
              {details.unlockedUnitsCount} / 5
            </p>
          </Card>
          <Card className="col-span-2 sm:col-span-1 space-y-2">
            <p className="text-xs font-bold text-ink-soft">
              Progres Level Berikutnya
            </p>
            <ProgressBar
              value={details.level.progressPercent}
              max={100}
              color="accent"
            />
          </Card>
        </div>

        {/* Pencapaian Badge */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">
            Pencapaian (Badge)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {details.badges.map((b) => (
              <div
                key={b.id}
                className={`rounded-card p-4 border flex items-start gap-3 ${
                  b.earned
                    ? "bg-success-tint border-success/40"
                    : "bg-surface-soft border-border-subtle opacity-75"
                }`}
              >
                <Medal
                  className={`w-6 h-6 shrink-0 ${
                    b.earned ? "text-success" : "text-ink-soft"
                  }`}
                  aria-hidden="true"
                />
                <div>
                  <p className="font-bold text-sm text-ink">
                    {b.title}{" "}
                    {b.earned ? (
                      <span className="text-xs text-success font-extrabold">
                        (Diraih)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-soft">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Riwayat Quiz & Remedial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="space-y-3">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand" aria-hidden="true" />
              Riwayat Quiz Unit
            </h2>
            {details.quizAttempts.length === 0 ? (
              <p className="text-xs text-ink-soft">
                Belum ada percobaan Quiz Unit.
              </p>
            ) : (
              <div className="space-y-2">
                {details.quizAttempts.map((qa) => (
                  <div
                    key={qa.id}
                    className="p-3 rounded-control bg-surface-soft border border-border-subtle flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-bold text-ink">{qa.quizTitle}</p>
                      <p className="text-ink-soft">
                        Percobaan #{qa.attemptNumber}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-chip font-extrabold ${
                        qa.status === "passed"
                          ? "bg-success text-white"
                          : "bg-brand text-white"
                      }`}
                    >
                      {qa.score} ({qa.status === "passed" ? "Lulus" : "Gagal"})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Award className="w-4 h-4 text-accent-lip" aria-hidden="true" />
              Transaksi XP Terbaru
            </h2>
            {details.xpTransactions.length === 0 ? (
              <p className="text-xs text-ink-soft">Belum ada transaksi XP.</p>
            ) : (
              <div className="space-y-2">
                {details.xpTransactions.slice(0, 6).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-control bg-surface-soft border border-border-subtle flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-semibold text-ink flex items-center gap-1.5">
                      <CheckCircle2
                        className="w-3.5 h-3.5 text-success shrink-0"
                        aria-hidden="true"
                      />
                      {tx.label}
                    </span>
                    <XpBadge amount={tx.xpAmount} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default function ProfilPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <ProfilContent />
    </Suspense>
  );
}
