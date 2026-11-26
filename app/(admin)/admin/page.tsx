import { Suspense } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Eye,
  Layers,
  Plus,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAdminDashboardData } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { Card, ContentStatusBadge, XpBadge } from "@/components/ui/Primitives";
import { PageSkeleton } from "@/components/ui/States";

async function AdminDashboardContent() {
  const user = await requireRole(["admin"]);
  const data = getAdminDashboardData();

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
              Ringkasan Panel Admin
            </h1>
            <p className="text-sm text-ink-soft">
              Pantau alur penyusunan konten Bahasa Pasan, validasi, dan progres
              Learner.
            </p>
          </div>
          <Link
            href="/preview"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-control bg-accent text-ink border border-accent-border text-xs font-extrabold tactile-btn tactile-accent shrink-0"
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            Pratinjau Learning Path
          </Link>
        </div>

        {/* Pipeline Konten 2x2 */}
        <section aria-label="Pipeline konten" className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <Card className="space-y-1">
            <p className="text-xs font-bold text-ink-soft">Draf</p>
            <p className="font-display text-3xl font-extrabold text-ink">
              {data.pipeline.draft}
            </p>
          </Card>
          <Card className="space-y-1 bg-accent-tint/50 border-accent-border/40">
            <p className="text-xs font-bold text-ink-soft">Menunggu Review</p>
            <p className="font-display text-3xl font-extrabold text-accent-lip">
              {data.pipeline.pendingReview}
            </p>
          </Card>
          <Card className="space-y-1 bg-brand-tint/50 border-brand/30">
            <p className="text-xs font-bold text-ink-soft">Perlu Revisi</p>
            <p className="font-display text-3xl font-extrabold text-brand">
              {data.pipeline.changesRequested}
            </p>
          </Card>
          <Card className="space-y-1 bg-success-tint/60 border-success/30">
            <p className="text-xs font-bold text-ink-soft">
              Terbit (+{data.pipeline.approved} Siap Terbit)
            </p>
            <p className="font-display text-3xl font-extrabold text-success">
              {data.pipeline.published}
            </p>
          </Card>
        </section>

        {/* Aksi Cepat */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">Aksi Cepat</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/admin/units"
              className="p-4 rounded-card bg-surface border border-border-subtle hover:bg-surface-highlight flex flex-col gap-2"
            >
              <Plus className="w-5 h-5 text-brand" aria-hidden="true" />
              <span className="font-bold text-sm text-ink">Buat Lesson</span>
              <span className="text-xs text-ink-soft">Kelola 5 unit &amp; materi</span>
            </Link>
            <Link
              href="/admin/quizzes"
              className="p-4 rounded-card bg-surface border border-border-subtle hover:bg-surface-highlight flex flex-col gap-2"
            >
              <ClipboardCheck className="w-5 h-5 text-brand" aria-hidden="true" />
              <span className="font-bold text-sm text-ink">
                Kelola Quiz Unit
              </span>
              <span className="text-xs text-ink-soft">15-20 soal per unit</span>
            </Link>
            <Link
              href="/admin/validators"
              className="p-4 rounded-card bg-surface border border-border-subtle hover:bg-surface-highlight flex flex-col gap-2"
            >
              <Users className="w-5 h-5 text-brand" aria-hidden="true" />
              <span className="font-bold text-sm text-ink">
                Akun Validator ({data.validatorsCount})
              </span>
              <span className="text-xs text-ink-soft">Tambah penutur/ahli</span>
            </Link>
            <Link
              href="/preview"
              className="p-4 rounded-card bg-accent-tint border border-accent-border hover:brightness-95 flex flex-col gap-2"
            >
              <Layers className="w-5 h-5 text-accent-lip" aria-hidden="true" />
              <span className="font-bold text-sm text-ink">
                Mode Pratinjau
              </span>
              <span className="text-xs text-ink-soft">
                Uji tampilan path Learner
              </span>
            </Link>
          </div>
        </section>

        {/* Aksi Prioritas & Progres Learner */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink">
              Tindakan Prioritas Konten
            </h2>
            {data.priorityLessons.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Semua konten prioritas sudah tertangani.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.priorityLessons.map(({ lesson, unit }) => (
                  <Link
                    key={lesson.id}
                    href={`/admin/lessons/${lesson.id}`}
                    className="block p-3 rounded-control bg-surface-soft border border-border-subtle hover:bg-surface-highlight space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <ContentStatusBadge status={lesson.status} />
                      <span className="text-xs text-ink-soft">
                        Unit {unit?.orderNumber}.{lesson.orderNumber}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-ink">{lesson.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink">
              Ringkasan Progres Learner ({data.learnersCount})
            </h2>
            <div className="divide-y divide-border-subtle">
              {data.learnerSummaries.map((item) => (
                <div
                  key={item.profile.id}
                  className="py-2.5 flex items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-ink truncate">
                      {item.profile.fullName}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {item.completedLessons} lesson selesai
                    </p>
                  </div>
                  <XpBadge amount={item.totalXp} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
